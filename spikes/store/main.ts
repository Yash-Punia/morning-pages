// S2 · IndexedDB durability torture (TDD §6, DUR-1…4).
// A deterministic "pen" writes strokes through the same serial-queue design the
// app will use, while the page is reloaded/backgrounded/killed. Every boot replays
// recovery records first, then verifies nothing acknowledged was lost.
import Dexie, { type Table } from 'dexie';
import { hud, set, note, button, results } from '../shared/hud.ts';
import './store.css';

const PAGE = 'torture-page';
const RECOVERY_MS = 250;
const BACKOFF = [50, 200, 1000];

interface Op { id: string; pageId: string; seq: number; createdAt: number; n: number; pts: Float32Array }
interface Recovery { id: string; pageId: string; seq: number; pts: Float32Array; at: number }

class DB extends Dexie {
  ops!: Table<Op, string>;
  recovery!: Table<Recovery, string>;
  pages!: Table<{ id: string; opCount: number }, string>;
  constructor() {
    super('spike-durability', { chromeTransactionDurability: 'strict' });
    this.version(1).stores({ ops: 'id, pageId, [pageId+seq]', recovery: 'id', pages: 'id' });
  }
}
let db = new DB();

// ---- ledger -----------------------------------------------------------------
// Independent record of what was acknowledged. localStorage is fine for a spike;
// the gap check below does not depend on it (it could die in the same kill).
interface Ledger {
  runId: string; running: boolean; auto: boolean; speed: number; targetCycles: number;
  acked: number; written: number; boots: number; interruptions: number; cycles: number;
  replayed: number; skipped: number; retries: number; connLost: number;
  lostTotal: number; dupTotal: number; counterMismatch: number; lat: number[]; done: boolean;
}
const LEDGER_KEY = 'spike-durability-ledger';
const params = new URLSearchParams(location.search);
let ledger: Ledger = JSON.parse(localStorage.getItem(LEDGER_KEY) ?? 'null') ?? freshLedger();
const saveLedger = () => localStorage.setItem(LEDGER_KEY, JSON.stringify(ledger));

function freshLedger(): Ledger {
  return { runId: crypto.randomUUID().slice(0, 8), running: false, auto: false, speed: 1, targetCycles: 200,
    acked: -1, written: 0, boots: 0, interruptions: 0, cycles: 0, replayed: 0, skipped: 0, retries: 0,
    connLost: 0, lostTotal: 0, dupTotal: 0, counterMismatch: 0, lat: [], done: false };
}

// ---- serial write queue (TDD §6.1, §6.2) ---------------------------------------
type Item = { kind: 'stroke'; op: Op; t0: number; done: () => void } | { kind: 'recovery'; rec: Recovery };
const queue: Item[] = [];
let draining = false;

function enqueueRecovery(rec: Recovery) {
  const i = queue.findIndex((q, idx) => idx > 0 && q.kind === 'recovery' && q.rec.id === rec.id);
  if (i > 0) queue[i] = { kind: 'recovery', rec }; // coalesce; queue[0] may be in flight
  else queue.push({ kind: 'recovery', rec });
  drain();
}

function enqueueStroke(op: Op) {
  return new Promise<void>((done) => {
    for (let i = queue.length - 1; i > 0; i--) // drop not-yet-started recovery writes for this stroke
      if (queue[i].kind === 'recovery' && (queue[i] as { rec: Recovery }).rec.id === op.id) queue.splice(i, 1);
    queue.push({ kind: 'stroke', op, t0: performance.now(), done });
    drain();
  });
}

async function drain() {
  if (draining) return;
  draining = true;
  while (queue.length) {
    const item = queue[0];
    await withRetry<unknown>(() => (item.kind === 'recovery' ? db.recovery.put(item.rec) : commitTx(item.op)));
    queue.shift();
    if (item.kind === 'stroke') {
      ledger.lat.push(performance.now() - item.t0);
      if (ledger.lat.length > 2000) ledger.lat.shift();
      item.done();
    }
  }
  draining = false;
}

/** One transaction per stroke: op + page counter + delete recovery. Idempotent. */
function commitTx(op: Op) {
  return db.transaction('rw', db.ops, db.pages, db.recovery, async () => {
    if (!(await db.ops.get(op.id))) {
      await db.ops.add(op);
      const page = await db.pages.get(PAGE);
      await db.pages.put({ id: PAGE, opCount: (page?.opCount ?? 0) + 1 });
    }
    await db.recovery.delete(op.id);
  });
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      const r = await fn();
      if (attempt > 0) set('state', 'writing');
      return r;
    } catch (e) {
      const err = e as Error;
      ledger.retries++;
      if (/Closed|Unknown|InvalidState|Abort/.test(err.name)) ledger.connLost++;
      note(`write error ${err.name}: ${err.message.slice(0, 80)}`);
      // After the backoff ladder, hold in memory and keep retrying slowly (never drop).
      if (attempt >= BACKOFF.length) set('state', 'HOLDING in memory');
      await sleep(BACKOFF[attempt] ?? 2000);
      try { db.close(); } catch {}
      db = new DB();
      try { await db.open(); } catch {}
    }
  }
}

// ---- deterministic pen ------------------------------------------------------------
function rng(seed: number) { // mulberry32
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function genPoints(seq: number): Float32Array {
  const r = rng(seq * 7919 + 17);
  const n = 100 + Math.floor(r() * 300);
  const a = new Float32Array(n * 6); // x, y, pressure, altitude, azimuth, t
  let x = r() * 900, y = r() * 1300;
  for (let i = 0; i < n; i++) {
    x += (r() - 0.3) * 2; y += (r() - 0.5) * 2;
    a.set([x, y, 0.3 + r() * 0.5, 0.9 + r() * 0.3, r() * 6.28, i * 4.2], i * 6);
  }
  return a;
}

let inflight: { id: string; seq: number; pts: Float32Array; done: number; committed: boolean } | null = null;
let nextSeq = 0;

function commit(id: string, seq: number, pts: Float32Array) {
  const op: Op = { id, pageId: PAGE, seq, createdAt: Date.now(), n: pts.length / 6, pts };
  ledger.written++;
  return enqueueStroke(op).then(() => {
    ledger.acked = Math.max(ledger.acked, seq);
    saveLedger();
  });
}

/** DUR-3: on hide, commit the in-flight stroke immediately. */
function flushInflight(reason: string) {
  if (!inflight || inflight.committed) return;
  inflight.committed = true;
  note(`flush on ${reason} (seq ${inflight.seq}, ${inflight.done} pts)`);
  commit(inflight.id, inflight.seq, inflight.pts.slice(0, Math.max(1, inflight.done) * 6));
}
addEventListener('pagehide', () => flushInflight('pagehide'));
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') { flushInflight('hidden'); ledger.interruptions++; saveLedger(); }
});

async function runner() {
  while (ledger.running) {
    if (queue.length > 50) { await sleep(50); continue; } // back-pressure
    const seq = nextSeq++;
    const id = `${ledger.runId}:${seq}`; // op id assigned at pen-down
    const all = genPoints(seq);
    const n = all.length / 6;
    const durMs = ((n / 240) * 1000) / ledger.speed;
    const start = performance.now();
    let lastMirror = start;
    inflight = { id, seq, pts: all, done: 1, committed: false };
    while (inflight.done < n && !inflight.committed && ledger.running) {
      await sleep(16);
      inflight.done = Math.min(n, Math.ceil(((performance.now() - start) / durMs) * n));
      if (performance.now() - lastMirror >= RECOVERY_MS) {
        lastMirror = performance.now();
        enqueueRecovery({ id, pageId: PAGE, seq, pts: all.slice(0, inflight.done * 6), at: Date.now() });
      }
    }
    const f = inflight;
    inflight = null;
    if (!f.committed) commit(id, seq, all.slice(0, f.done * 6));
    await sleep(100 / ledger.speed); // ~3 strokes/s at speed 1
    showStats();
  }
}

// ---- boot: replay recovery, then verify, then resume ------------------------------
async function boot() {
  ledger.boots++;
  await db.open();

  for (const rec of await db.recovery.toArray()) {
    if (await db.ops.get(rec.id)) { ledger.skipped++; await db.recovery.delete(rec.id); continue; }
    await commitTx({ id: rec.id, pageId: rec.pageId, seq: rec.seq, createdAt: rec.at, n: rec.pts.length / 6, pts: rec.pts });
    ledger.replayed++;
    note(`replayed in-flight stroke seq ${rec.seq}`);
  }

  const keys = (await db.ops.where('[pageId+seq]').between([PAGE, Dexie.minKey], [PAGE, Dexie.maxKey]).keys()) as unknown as [string, number][];
  const seen = new Map<number, number>();
  for (const [, seq] of keys) seen.set(seq, (seen.get(seq) ?? 0) + 1);
  const maxSeq = keys.length ? Math.max(...seen.keys()) : -1;
  let lost = 0, dup = 0;
  for (let s = 0; s <= Math.max(maxSeq, ledger.acked); s++) if (!seen.has(s)) lost++; // gap check + ledger check
  for (const c of seen.values()) if (c > 1) dup += c - 1;
  const page = await db.pages.get(PAGE);
  if ((page?.opCount ?? 0) !== keys.length) ledger.counterMismatch++;
  ledger.lostTotal = Math.max(ledger.lostTotal, lost); // losses never heal, so the max is the count
  ledger.dupTotal = Math.max(ledger.dupTotal, dup);
  nextSeq = maxSeq + 1;
  set('strokes in store', keys.length);

  if (ledger.running && ledger.auto) {
    ledger.cycles++;
    if (ledger.cycles >= ledger.targetCycles) { ledger.running = false; ledger.done = true; }
  }
  saveLedger();
  showStats();
  if (ledger.running) {
    runner();
    if (ledger.auto) setTimeout(() => { saveLedger(); location.reload(); }, 500 + Math.random() * 2500);
  }
}

// ---- reporting ------------------------------------------------------------------
const pct = (a: number[], q: number) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(q * s.length))] : 0; };

function showStats() {
  set('run', `${ledger.runId} ${ledger.running ? (ledger.auto ? 'auto' : 'manual') : 'stopped'} ×${ledger.speed}`);
  set('strokes submitted (pen-up)', ledger.written);
  set('highest acknowledged seq', ledger.acked);
  set('boots', ledger.boots);
  set('cycles (auto reloads)', `${ledger.cycles}/${ledger.targetCycles}`);
  set('hidden events (manual interruptions)', ledger.interruptions);
  set('LOST', ledger.lostTotal);
  set('DUPLICATED', ledger.dupTotal);
  set('page counter mismatches', ledger.counterMismatch);
  set('recovery replayed', ledger.replayed);
  set('recovery skipped (already committed)', ledger.skipped);
  set('retries', ledger.retries);
  set('connection-lost errors', ledger.connLost);
  set('commit p50 ms', pct(ledger.lat, 0.5));
  set('commit p99 ms', pct(ledger.lat, 0.99));
  set('queue length', queue.length);
  const verdict = document.getElementById('verdict')!;
  const failed = ledger.lostTotal > 0 || ledger.dupTotal > 0;
  verdict.className = failed ? 'fail' : ledger.done ? 'pass' : '';
  verdict.textContent = failed ? `FAIL: ${ledger.lostTotal} lost, ${ledger.dupTotal} duplicated`
    : ledger.done ? `PASS: ${ledger.acked + 1} strokes, ${ledger.cycles} reloads, ${ledger.interruptions} hides, 0 lost`
    : ledger.running ? 'Running…' : 'Stopped.';
  (window as unknown as { __results: unknown }).__results = results();
  if (ledger.done) document.title = 'DONE';
}

async function newRun(auto: boolean, speed: number, cycles = 200) {
  ledger.running = false;
  await sleep(100);
  db.close();
  await Dexie.delete('spike-durability');
  db = new DB();
  ledger = { ...freshLedger(), running: true, auto, speed, targetCycles: cycles };
  saveLedger();
  location.replace(location.pathname); // boot fresh, without URL params
}

hud('store');
button('Start auto (200 reloads)', () => newRun(true, 4));
button('Start manual', () => newRun(false, 1));
button('Stop', () => { ledger.running = false; saveLedger(); showStats(); });
button('Simulate connection loss', () => { db.close(); note('db closed by test'); });

if (params.get('fresh')) newRun(params.get('auto') === '1', Number(params.get('speed') ?? 4), Number(params.get('cycles') ?? 200));
else boot().catch((e) => note(`boot failed: ${e}`));

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }
