import test from 'node:test';
import assert from 'node:assert/strict';
import { seek, openVideo, releaseVideo } from '../public/studio/video.mjs';

class Video extends EventTarget {
  constructor() { super(); this.time = 0; this.readyState = 2; this.duration = 10; this.videoWidth = 1280; this.videoHeight = 720; this.paused = true; }
  get currentTime() { return this.time; }
  set currentTime(time) { this.time = time; queueMicrotask(() => this.dispatchEvent(new Event('seeked'))); }
  pause() { this.paused = true; }
  removeAttribute() { this.src = ''; }
  load() { queueMicrotask(() => this.dispatchEvent(new Event('loadeddata'))); }
}
test('video seek resolves only when the requested decoded frame is available', async () => {
  const video = new Video();
  await seek(video, 4.5, new AbortController().signal);
  assert.equal(video.currentTime, 4.5);
});
test('cancelled seeks reject as cancellation without moving the video', async () => {
  const video = new Video(); const controller = new AbortController(); controller.abort();
  await assert.rejects(seek(video, 2, controller.signal), { name: 'AbortError' });
  assert.equal(video.currentTime, 0);
});
test('invalid video metadata is rejected and media resources are released', async () => {
  const video = new Video(); video.duration = Infinity;
  const before = globalThis.document;
  globalThis.document = { createElement: () => video };
  try {
    await assert.rejects(openVideo('blob:test', new AbortController().signal), /finite duration/);
    assert.equal(video.src, '');
  } finally { globalThis.document = before; releaseVideo(video); }
});
