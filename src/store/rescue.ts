// Emergency export (TDD 6.2): when writes keep failing, the writing that isn't on disk yet can be
// saved as a file through the share sheet (Files, AirDrop, Mail), or downloaded where sharing
// isn't available. Each item carries its entry and page, so it can be put back later.
import { shareFile } from './share.ts';

export async function saveUnsavedCopy(pending: unknown[]) {
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
  const body = JSON.stringify({ app: 'morning-pages', kind: 'unsaved-writing', version: 1, exportedAt: Date.now(), items: pending });
  await shareFile(new File([body], `morning-pages-unsaved-${stamp}.json`, { type: 'application/json' }));
}
