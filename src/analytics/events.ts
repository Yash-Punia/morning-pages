// Event allowlist (TDD 9.4, D-029). Every property is an enum, a boolean or a bucket: nothing
// here can carry free text, an id, a date or an exact count. sanitize() drops anything else.
// Later milestones add their events (entry_started, session_end, save_error, …) to SCHEMA.
export const SCHEMA = {
  app_open: { mode: ['standalone', 'browser'], morning: [true, false] },
  install_detected: {},
  launch_perf: { ms: ['<1000', '1000-1500', '1500-3000', '3000+'] },
  onboarding_step: { step: ['1', '2', '3'] },
  onboarding_done: {},
  entry_started: { template: ['none'], input: ['pen', 'finger', 'keyboard'] },
  // Durability in the wild (TDD 9.4): should stay at zero.
  save_error: { kind: ['connection', 'quota', 'unknown'], recovered: [true, false] },
  persist_status: { granted: [true, false] },
  storage_warning: { pct: ['80', '95'] },
  // TDD 9.4 lists the version; D-029 allows no free-text values, so this counts updates only.
  update_applied: {},
  // TDD 9.4's "list of tools" as enums (D-029 allows no lists): which pens, and whether erasing.
  session_end: {
    minutes: ['0-5', '5-15', '15-30', '30+'],
    pages: ['1', '2-3', '4+'],
    tools: ['ballpoint', 'fountain', 'both'],
    eraser: [true, false],
  },
} as const satisfies Record<string, Record<string, readonly (string | boolean)[]>>;

export type EventName = keyof typeof SCHEMA;

/**
 * What each event tells, in the privacy page's words (PRI-7). Keyed by event, so an event can't
 * be added without saying what it sends.
 */
export const EVENT_DESCRIPTIONS: Record<EventName, string> = {
  app_open: 'That the app opened, from the Home Screen or in a Safari tab, and whether it was morning.',
  install_detected: 'That the app was added to the Home Screen (once).',
  launch_perf: 'How long the app took to open, in rough ranges (once a day).',
  onboarding_step: 'Which first-run screen was reached: one, two or three.',
  onboarding_done: 'That first-run setup was finished.',
  entry_started: 'That a new entry was started, and whether with the pen, a finger or the keyboard.',
  save_error: 'That saving ran into a problem (a lost connection, full storage or something else), and whether it recovered.',
  persist_status: 'Whether iPadOS agreed to protect the app’s storage.',
  storage_warning: 'That storage passed 80 % or 95 % full.',
  update_applied: 'That a new version of the app was installed.',
  session_end: 'When you leave after writing: roughly how long you wrote, how many pages, which pens and whether you erased, in rough ranges.',
};
/** Page views carry only the screen's template, never which entry. */
export const PAGE_VIEW_DESCRIPTION = 'Which screen opens, by its kind (like “Calendar” or “an entry”), never which entry.';
export type EventProps<E extends EventName> = { [K in keyof (typeof SCHEMA)[E]]: (typeof SCHEMA)[E][K] extends readonly (infer V)[] ? V : never };

/** Keep only allowlisted keys whose value is one of that key's allowed values. */
export function sanitize(name: EventName, data: Record<string, unknown> = {}): Record<string, string | boolean> | undefined {
  const allowed = SCHEMA[name] as Record<string, readonly (string | boolean)[]>;
  const out: Record<string, string | boolean> = {};
  for (const [key, value] of Object.entries(data))
    if (allowed[key]?.includes(value as string | boolean)) out[key] = value as string | boolean;
  return Object.keys(out).length ? out : undefined;
}

/** A writing session, bucketed for session_end (exact minutes and counts are never sent). */
export function sessionBuckets(ms: number, pages: number, tools: Set<string>, erased: boolean): EventProps<'session_end'> {
  const min = ms / 60_000;
  return {
    minutes: min < 5 ? '0-5' : min < 15 ? '5-15' : min < 30 ? '15-30' : '30+',
    pages: pages <= 1 ? '1' : pages <= 3 ? '2-3' : '4+',
    tools: tools.has('ballpoint') && tools.has('fountain') ? 'both' : tools.has('fountain') ? 'fountain' : 'ballpoint',
    eraser: erased,
  };
}

export const launchBucket = (ms: number): EventProps<'launch_perf'>['ms'] =>
  ms < 1000 ? '<1000' : ms < 1500 ? '1000-1500' : ms < 3000 ? '1500-3000' : '3000+';
