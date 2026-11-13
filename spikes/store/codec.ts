// Point codec from TDD §7.3 (spike version; M3.2 re-implements it properly).
// header: u8 flags · f32 x0 · f32 y0 · f64 t0
// per point: zigzag LEB128 deltas of dx, dy (1/16 unit), dp (0..255),
//            dalt (0..63), daz (0..255, wraps), and unsigned dt (ms)
export type Pt = [x: number, y: number, p: number, alt: number, az: number, t: number];

const Q = 16;
const HAS_PRESSURE = 1;
const HAS_TILT = 2;
const ALT_MAX = Math.PI / 2;
const TAU = Math.PI * 2;

export function encode(pts: Pt[], { pressure = true, tilt = true } = {}): Uint8Array {
  const out: number[] = [];
  const head = new DataView(new ArrayBuffer(17));
  const qx0 = Math.round(pts[0][0] * Q);
  const qy0 = Math.round(pts[0][1] * Q);
  head.setUint8(0, (pressure ? HAS_PRESSURE : 0) | (tilt ? HAS_TILT : 0));
  head.setFloat32(1, qx0 / Q, true);
  head.setFloat32(5, qy0 / Q, true);
  head.setFloat64(9, pts[0][5], true);
  out.push(...new Uint8Array(head.buffer));

  let px = qx0, py = qy0, pp = 0, palt = 0, paz = 0, pt = pts[0][5];
  for (const [x, y, p, alt, az, t] of pts) {
    const qx = Math.round(x * Q), qy = Math.round(y * Q);
    zig(out, qx - px); zig(out, qy - py);
    px = qx; py = qy;
    if (pressure) { const q = Math.round(clamp(p, 0, 1) * 255); zig(out, q - pp); pp = q; }
    if (tilt) {
      const qa = Math.round((clamp(alt, 0, ALT_MAX) / ALT_MAX) * 63);
      const qz = Math.round((((az % TAU) + TAU) % TAU / TAU) * 256) & 255;
      zig(out, qa - palt); zig(out, (((qz - paz) + 128) & 255) - 128);
      palt = qa; paz = qz;
    }
    const dt = Math.max(0, Math.round(t - pt));
    uv(out, dt);
    pt += dt;
  }
  return Uint8Array.from(out);
}

export function decode(buf: Uint8Array): Pt[] {
  const head = new DataView(buf.buffer, buf.byteOffset, 17);
  const flags = head.getUint8(0);
  let px = Math.round(head.getFloat32(1, true) * Q);
  let py = Math.round(head.getFloat32(5, true) * Q);
  let pt = head.getFloat64(9, true);
  let pp = 0, palt = 0, paz = 0;
  const r = { buf, i: 17 };
  const pts: Pt[] = [];
  while (r.i < buf.length) {
    px += unzig(r); py += unzig(r);
    let p = 0.5, alt = ALT_MAX, az = 0;
    if (flags & HAS_PRESSURE) { pp += unzig(r); p = pp / 255; }
    if (flags & HAS_TILT) {
      palt += unzig(r); paz = (paz + unzig(r)) & 255;
      alt = (palt / 63) * ALT_MAX; az = (paz / 256) * TAU;
    }
    pt += readUv(r);
    pts.push([px / Q, py / Q, p, alt, az, pt]);
  }
  return pts;
}

function zig(out: number[], n: number) { uv(out, n >= 0 ? n * 2 : -n * 2 - 1); }
function uv(out: number[], n: number) {
  while (n >= 0x80) { out.push((n & 0x7f) | 0x80); n = Math.floor(n / 128); }
  out.push(n);
}
function readUv(r: { buf: Uint8Array; i: number }) {
  let n = 0, mul = 1, b: number;
  do { b = r.buf[r.i++]; n += (b & 0x7f) * mul; mul *= 128; } while (b & 0x80);
  return n;
}
function unzig(r: { buf: Uint8Array; i: number }) { const n = readUv(r); return n % 2 ? -(n + 1) / 2 : n / 2; }
function clamp(v: number, lo: number, hi: number) { return Math.min(hi, Math.max(lo, v)); }
