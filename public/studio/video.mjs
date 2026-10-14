import { cropRect } from './core.mjs';

export function abortError() { return new DOMException('Processing was stopped.', 'AbortError'); }
export function checkAbort(signal) { if (signal?.aborted) throw abortError(); }

function waitFor(video, event, signal, trigger, timeout = 20000) {
  return new Promise((resolve, reject) => {
    let timer;
    const clear = () => { clearTimeout(timer); video.removeEventListener(event, done); video.removeEventListener('error', fail); signal?.removeEventListener('abort', stop); };
    const done = () => { clear(); resolve(); };
    const fail = () => { clear(); reject(new Error('This browser could not decode the video. Try an H.264 MP4 or a VP9 WebM file in Chrome or Edge.')); };
    const stop = () => { clear(); reject(abortError()); };
    video.addEventListener(event, done, { once: true });
    video.addEventListener('error', fail, { once: true });
    signal?.addEventListener('abort', stop, { once: true });
    timer = setTimeout(() => { clear(); reject(new Error('Video decoding timed out. Try a shorter H.264 MP4 clip.')); }, timeout);
    if (signal?.aborted) { stop(); return; }
    try { trigger?.(); } catch (error) { clear(); reject(error); }
  });
}

export async function openVideo(url, signal) {
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  try {
    await waitFor(video, 'loadeddata', signal, () => { video.src = url; video.load(); });
    if (!Number.isFinite(video.duration) || video.duration <= 0 || !video.videoWidth) throw new Error('This video does not contain a readable video track or a finite duration. Export it as MP4 and try again.');
    return video;
  } catch (error) { releaseVideo(video); throw error; }
}

export async function seek(video, time, signal) {
  checkAbort(signal);
  if (Math.abs(video.currentTime - time) < 0.001 && video.readyState >= 2) return;
  await waitFor(video, 'seeked', signal, () => { video.currentTime = time; });
  if (video.readyState < 2) await waitFor(video, 'loadeddata', signal);
  checkAbort(signal);
}

export function releaseVideo(video) {
  if (!video) return;
  video.pause(); video.removeAttribute('src'); video.load();
}

export function capture(video, canvas, options) {
  const crop = cropRect(video.videoWidth, video.videoHeight, options.crop);
  const scale = Math.min(options.scale, 2560 / Math.max(crop.width, crop.height));
  const width = Math.max(1, Math.round(crop.width * scale));
  const height = Math.max(1, Math.round(crop.height * scale));
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Your browser does not support canvas image processing.');
  ctx.drawImage(video, crop.x, crop.y, crop.width, crop.height, 0, 0, width, height);
  const pixels = ctx.getImageData(0, 0, width, height);
  if (options.enhance) {
    for (let i = 0; i < pixels.data.length; i += 4) {
      const gray = pixels.data[i] * 0.299 + pixels.data[i + 1] * 0.587 + pixels.data[i + 2] * 0.114;
      const v = Math.max(0, Math.min(255, (gray - 128) * 1.25 + 128));
      pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = v;
    }
    ctx.putImageData(pixels, 0, 0);
  }
  return pixels.data;
}
