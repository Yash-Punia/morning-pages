// Page thumbnails off the main thread (TDD 5.1 Page.thumb, M4.7). The main thread sends plain
// colours (it resolves the theme tokens), so nothing here touches the DOM. Where this worker can't
// draw (no OffscreenCanvas), it says so and the main thread draws instead.
import { drawThumb, THUMB_HEIGHT, THUMB_WIDTH, type ThumbJob } from '../ink/thumb.ts';
import type { Ctx2D } from '../ink/renderer.ts';

addEventListener('message', async (e: MessageEvent<ThumbJob & { id: number }>) => {
  const { id } = e.data;
  try {
    const canvas = new OffscreenCanvas(THUMB_WIDTH, THUMB_HEIGHT);
    drawThumb(canvas.getContext('2d')! as unknown as Ctx2D, e.data); // the same 2D API as the page
    postMessage({ id, blob: await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.8 }) });
  } catch (err) {
    postMessage({ id, error: String(err) });
  }
});
