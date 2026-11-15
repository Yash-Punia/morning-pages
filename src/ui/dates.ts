// Dates as the notebook letters them, in the reader's own locale (entries use local dates, D-019).
import { fromLocalDate, localDate } from '../store/session.ts';

const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(undefined, o);
const LONG = fmt({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const DAY = fmt({ weekday: 'long', day: 'numeric', month: 'long' });
const MONTH = fmt({ month: 'long', year: 'numeric' });
const WEEKDAY = fmt({ weekday: 'narrow' });

/** "Sunday, 15 November 2026" */
export const longDate = (d: string) => LONG.format(fromLocalDate(d));
/** "Sunday, 15 November" */
export const dayDate = (d: string) => DAY.format(fromLocalDate(d));
/** "November 2026" */
export const monthName = (d: Date) => MONTH.format(d);
/** "S" */
export const weekdayLetter = (d: Date) => WEEKDAY.format(d);

export const today = () => localDate(new Date());

/** The first day of the week in this locale (0 = Sunday … 6 = Saturday); Monday where unknown. */
export function firstWeekday(): number {
  try {
    const loc = new Intl.Locale(navigator.language) as Intl.Locale & { getWeekInfo?: () => { firstDay: number }; weekInfo?: { firstDay: number } };
    const day = (loc.getWeekInfo?.() ?? loc.weekInfo)?.firstDay; // 1 = Monday … 7 = Sunday
    return day ? day % 7 : 1;
  } catch {
    return 1;
  }
}

/** The 7 days of the week containing `d`, starting on the locale's first weekday. */
export function weekOf(d: Date): Date[] {
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() - firstWeekday() + 7) % 7));
  return Array.from({ length: 7 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}
