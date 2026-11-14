// Today's entry stays in memory for the whole session, so visiting Settings or the Library and
// coming back keeps the page. ponytail: memory only until M3 persists the op log.
import { inkPaper } from '../settings.ts';
import { InkDoc } from './page.ts';

let today: { key: string; doc: InkDoc } | undefined;

export function todayDoc(date: Date): InkDoc {
  const key = date.toDateString();
  if (today?.key !== key) today = { key, doc: new InkDoc(inkPaper.get()) };
  return today.doc;
}
