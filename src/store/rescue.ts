// Emergency export (TDD 6.2): when writes keep failing, the writing that isn't on disk yet can be
// saved as a file through the share sheet (Files, AirDrop, Mail), or downloaded where sharing
// isn't available. Each item carries its entry and page, so it can be put back later.
export async function saveUnsavedCopy(pending: unknown[]) {
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
  const body = JSON.stringify({ app: 'morning-pages', kind: 'unsaved-writing', version: 1, exportedAt: Date.now(), items: pending });
  const file = new File([body], `morning-pages-unsaved-${stamp}.json`, { type: 'application/json' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return;
    } catch (e) {
      if ((e as Error).name === 'AbortError') return; // the writer closed the share sheet
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
}
