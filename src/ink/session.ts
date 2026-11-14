// Today's entry stays in memory for the whole session, so visiting Settings or the Library and
// coming back keeps the page. ponytail: memory only until M3 persists the op log and the title.
import { inkPaper } from '../settings.ts';
import { InkDoc } from './page.ts';

let today: { key: string; date: Date; doc: InkDoc } | undefined;

export function todayDoc(date: Date): InkDoc {
  const key = date.toDateString();
  if (today?.key !== key) today = { key, date, doc: new InkDoc(inkPaper.get()) };
  return today.doc;
}

/** Today's entry if it has been started (a title or any ink), for the Library. */
export function startedEntry(): { date: Date; doc: InkDoc } | undefined {
  if (!today || (today.doc.title === '' && today.doc.strokeCount === 0)) return undefined;
  return { date: today.date, doc: today.doc };
}
