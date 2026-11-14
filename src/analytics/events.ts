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
} as const satisfies Record<string, Record<string, readonly (string | boolean)[]>>;

export type EventName = keyof typeof SCHEMA;
export type EventProps<E extends EventName> = { [K in keyof (typeof SCHEMA)[E]]: (typeof SCHEMA)[E][K] extends readonly (infer V)[] ? V : never };

/** Keep only allowlisted keys whose value is one of that key's allowed values. */
export function sanitize(name: EventName, data: Record<string, unknown> = {}): Record<string, string | boolean> | undefined {
  const allowed = SCHEMA[name] as Record<string, readonly (string | boolean)[]>;
  const out: Record<string, string | boolean> = {};
  for (const [key, value] of Object.entries(data))
    if (allowed[key]?.includes(value as string | boolean)) out[key] = value as string | boolean;
  return Object.keys(out).length ? out : undefined;
}

export const launchBucket = (ms: number): EventProps<'launch_perf'>['ms'] =>
  ms < 1000 ? '<1000' : ms < 1500 ? '1000-1500' : ms < 3000 ? '1500-3000' : '3000+';
