// BAK-2: a quiet Library note when the last backup is older than the chosen number of days. A
// journal never backed up counts from its first morning, so a new journal isn't nagged on day one.
// "Not now" hides it until tomorrow.
const DAY = 86_400_000;

export interface ReminderInput {
  /** When the last saved backup was made, or null if never. */
  lastBackupAt: number | null;
  /** The first saved morning, as a time, or undefined for an empty journal. */
  firstMorning: number | undefined;
  days: number;
  /** The local date "Not now" was tapped on, if any. */
  snoozedOn: string | null;
  today: string;
  now: number;
}

export function reminderDue(r: ReminderInput): boolean {
  if (r.firstMorning === undefined) return false; // nothing to back up yet
  if (r.snoozedOn === r.today) return false;
  return r.now - (r.lastBackupAt ?? r.firstMorning) > r.days * DAY;
}

/** Whole days since the last backup, for "Your last one was 9 days ago". */
export const daysSince = (at: number, now: number) => Math.floor((now - at) / DAY);
