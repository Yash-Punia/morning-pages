// Handing a file to iPadOS (TDD 8.2): the share sheet (Save to Files, a USB drive, AirDrop), or a
// download where the share sheet can't take the file. Call it straight from a tap: the share
// sheet needs a fresh user gesture, so nothing slow may run before it.
export type ShareOutcome = 'shared' | 'downloaded' | 'cancelled';

export async function shareFile(file: File): Promise<ShareOutcome> {
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return 'shared';
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelled'; // the share sheet was closed
      // Anything else (the gesture expired, a refused file type): fall back to a download.
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
  return 'downloaded';
}
