export function formatTime(seconds) {
  const ticks = Math.round(Math.max(0, Number(seconds) || 0) * 10);
  const tenths = ticks % 10;
  const whole = Math.floor(ticks / 10);
  const s = String(whole % 60).padStart(2, '0');
  const m = String(Math.floor(whole / 60) % 60).padStart(2, '0');
  const h = Math.floor(whole / 3600);
  return `${h ? `${h}:` : ''}${m}:${s}${tenths ? `.${tenths}` : ''}`;
}

export function sampleTimes(duration, interval, start = 0, end = duration) {
  if (![duration, interval, start, end].every(Number.isFinite) || duration <= 0 || interval < 0.1 || start < 0 || start >= end || end > duration + 0.001) {
    throw new Error('Choose a valid time range and a sampling interval of at least 0.1 seconds.');
  }
  const last = Math.max(start, end - Math.min(0.04, (end - start) / 2));
  const count = Math.ceil((end - start) / interval);
  if (count > 20000) throw new Error('This range needs more than 20,000 samples. Select a shorter range or a larger interval.');
  const times = [];
  for (let i = 0; i < count; i++) times.push(Math.min(start + i * interval, last));
  if (last - times.at(-1) > 0.08) times.push(last);
  return times;
}

export function cleanText(text) {
  return String(text || '').replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .split('\n').map(line => line.trim().replace(/[\t ]+/g, ' ')).filter(Boolean).join('\n');
}

// Compare exact content. Never fuzzy-match: 1500 and 1700 must remain distinct.
export function lineKey(text) {
  return cleanText(text).normalize('NFC').replace(/(?<=\p{Script=Han})\s+(?=\p{Script=Han})/gu, '');
}

export function newLines(text, previous) {
  const counts = new Map();
  for (const line of cleanText(previous).split('\n').filter(Boolean)) {
    const key = lineKey(line);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return cleanText(text).split('\n').filter(Boolean).filter(line => {
    const key = lineKey(line);
    const count = counts.get(key) || 0;
    if (count) { counts.set(key, count - 1); return false; }
    return true;
  }).join('\n');
}

export function appendFrame(state, frame, mode = 'changes') {
  const raw = { ...frame, text: cleanText(frame.text) };
  state.raw.push(raw);
  const text = mode === 'frames' ? raw.text : newLines(raw.text, state.previousText);
  state.previousText = raw.text;
  if (text) state.records.push({ id: state.records.length + 1, time: raw.time, text, confidence: raw.confidence });
  return text;
}

export function cropRect(width, height, crop) {
  const { left, top, right, bottom } = crop;
  if (![left, top, right, bottom].every(Number.isFinite) || left < 0 || top < 0 || right > 100 || bottom > 100 || right - left < 2 || bottom - top < 2) {
    throw new Error('The reading area must be at least 2% wide and high and stay inside the video.');
  }
  return { x: Math.round(width * left / 100), y: Math.round(height * top / 100), width: Math.max(1, Math.round(width * (right - left) / 100)), height: Math.max(1, Math.round(height * (bottom - top) / 100)) };
}

export function samePixels(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

export function buildTranscript(records, timestamps = true) {
  return records.filter(r => r.text.trim()).map(r => `${timestamps ? `[${formatTime(r.time)}]\n` : ''}${r.text.trim()}`).join('\n\n');
}

export function safeFilename(name) {
  return (String(name).replace(/\.[^.]+$/, '').replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_').trim().slice(0, 100) || 'video') + '-chinese-text';
}
