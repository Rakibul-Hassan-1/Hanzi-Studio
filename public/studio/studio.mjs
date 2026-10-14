import { buildTranscript, cropRect, formatTime, sampleTimes } from './core.mjs';
import { extractVideo } from './ocr.mjs';
import { exportJson, exportText, exportWord } from './export.mjs';
import { openVideo, releaseVideo } from './video.mjs';

const icons = {
  upload: '<path d="M12 16V4m-4 4 4-4 4 4M4 15v5h16v-5"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  document: '<path d="M14 3H5v18h14V8l-5-5Zm0 0v5h5M8 12h8M8 16h6"/>',
  shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',
  film: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16m10-16v16M3 9h4m-4 6h4m10-6h4m-4 6h4"/>',
  copy: '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
  down: '<path d="M12 3v13m-5-5 5 5 5-5M4 16v5h16v-5"/>',
};
const icon = name => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || ''}</svg>`;

const markup = `
  <header class="topbar"><a class="brand" href="/" aria-label="Hanzi Studio home"><span class="brand-seal">文</span><span>Hanzi<span class="brand-light"> Studio</span></span></a><div class="header-right"><span class="local-pill"><span></span> Free & local</span><button class="link-button" id="help" type="button">How it works <span aria-hidden="true">↗</span></button></div></header>
  <div class="page-shell">
    <section class="intro"><div><p class="eyebrow">CHINESE VIDEO → WORD DOCUMENT</p><h1>Keep the words.<br><span>Leave the typing.</span></h1><p class="intro-copy">Turn text on screen into an editable document.<br>Upload a Chinese video, extract, and download.</p><p class="bengali" lang="bn">চাইনিজ ভিডিও দিন → লেখা সংগ্রহ করুন → Word ফাইল নিন</p></div><div class="intro-art" aria-hidden="true"><span class="art-grid"></span><span class="art-character">字</span><span class="art-caption">FROM FRAME TO PAGE</span><span class="art-tag">简体 · 繁體</span></div></section>
    <div class="workspace">
      <div class="input-column">
        <section class="panel source-panel"><div class="panel-heading"><div class="heading-label"><span class="step-number">01</span><h2>Your video</h2></div><span class="small-muted">Stays on your device</span></div>
          <input id="file-input" type="file" accept="video/*,.mp4,.webm,.mov,.m4v" class="sr-only" aria-label="Choose a Chinese video"/>
          <button id="drop-zone" class="drop-zone" type="button"><span class="upload-symbol">${icon('upload')}</span><strong>Drop your Chinese video here</strong><span>or <u>browse files</u></span><small>MP4 · WebM · browser-supported video</small></button>
          <div id="source-loaded" class="hidden"><div class="video-wrap"><video id="preview" controls playsinline preload="metadata" aria-label="Video preview"></video><div id="crop-overlay" class="crop-overlay hidden"></div></div><div class="file-row"><span class="file-icon">${icon('film')}</span><div class="file-info"><strong id="filename"></strong><span id="file-meta"></span></div><button id="replace" class="link-button" type="button">Change</button></div></div>
          <p class="privacy-note">${icon('shield')} Your video is never uploaded to a server.</p>
        </section>
        <section class="panel settings-panel"><div class="panel-heading"><div class="heading-label"><span class="step-number">02</span><h2>Reading settings</h2></div><span class="small-muted">Ready to use</span></div>
          <fieldset id="settings"><div class="two-fields"><label>Chinese script<select id="language"><option value="chi_sim">简体 · Simplified Chinese</option><option value="chi_tra">繁體 · Traditional Chinese</option></select></label><label>Read a frame every<select id="interval"><option value="0.25">0.25 seconds · More detail</option><option value="0.5" selected>0.5 seconds · Balanced</option><option value="1">1 second · Faster</option><option value="2">2 seconds · Slow slides</option></select></label></div>
          <label>Where is the text?<select id="region"><option value="full">Entire screen · All visible text</option><option value="bottom">Bottom 35% · Subtitles</option><option value="custom">Custom reading area</option></select></label>
          <div id="crop-controls" class="crop-controls hidden"><label>Left %<input id="crop-left" type="number" min="0" max="98" value="0"/></label><label>Top %<input id="crop-top" type="number" min="0" max="98" value="0"/></label><label>Right %<input id="crop-right" type="number" min="2" max="100" value="100"/></label><label>Bottom %<input id="crop-bottom" type="number" min="2" max="100" value="100"/></label></div>
          <details class="advanced"><summary>Advanced options <span>+</span></summary><div class="advanced-body"><label>Page layout<select id="layout"><option value="3">Automatic · Slides and paragraphs</option><option value="11">Scattered text · Labels and captions</option><option value="6">Single block · Subtitle lines</option><option value="5">Vertical text · Try for vertical Chinese</option></select></label><label>Repeated text<select id="mode"><option value="changes">Keep new or changed lines</option><option value="frames">Keep every sampled frame</option></select></label><label>Image size<select id="scale"><option value="1">Original size</option><option value="1.5" selected>1.5× · Clearer small text</option><option value="2">2× · Small lettering</option></select></label><div class="two-fields"><label>Start at (seconds)<input id="range-start" type="number" min="0" step="0.1" value="0"/></label><label>End at (seconds)<input id="range-end" type="number" min="0" step="0.1" placeholder="End of video"/></label></div><label class="check-label"><input id="enhance" type="checkbox"/> Enhance grayscale contrast</label><label class="check-label"><input id="local-models" type="checkbox"/> Use locally downloaded OCR models</label><p class="field-note">Local models need the optional setup command in the README. Otherwise models download once from the OCR provider.</p></div></details>
          <label class="check-label auto-download"><input id="auto-download" type="checkbox" checked/> Download Word automatically when finished</label></fieldset>
          <button id="run" class="primary-button" type="button" disabled><span>Extract Chinese text</span>${icon('arrow')}</button><button id="stop" class="stop-button hidden" type="button">Stop and keep extracted text</button>
          <p class="field-note bottom-note">No sound needed. Chinese stays in Chinese.</p>
        </section>
      </div>
      <section class="panel output-panel"><div class="panel-heading"><div class="heading-label"><span class="step-number">03</span><h2>Your document</h2></div><span id="result-badge" class="result-badge">Waiting for video</span></div>
        <div id="progress-area" class="progress-area hidden" aria-live="polite"><div class="progress-heading"><strong id="phase">Preparing…</strong><span id="percent">0%</span></div><progress id="progress" max="100" value="0" aria-label="OCR progress"></progress><div class="progress-detail"><span id="progress-detail">Preparing your video</span><span id="sample-count"></span></div><p>Keep this tab open. Longer videos can take a while.</p></div>
        <div id="notice" class="notice hidden" role="status"></div>
        <div id="empty-result" class="empty-result"><div class="document-illustration" aria-hidden="true"><span class="document-fold"></span><span class="document-han">中文</span><i></i><i></i><i></i><span class="document-check">✓</span></div><h3>Your words, all in one place.</h3><p>Extracted text will appear here as the video is read.<br>Review it, make edits, and save it as Word.</p><div class="empty-features"><span>简体 + 繁體</span><span>Time markers</span><span>Editable .docx</span></div></div>
        <div id="results-area" class="results-area hidden"><div class="result-tools"><div class="tabs" role="tablist" aria-label="Result view"><button id="edit-tab" type="button" role="tab" aria-selected="true" aria-controls="record-list" class="active">Edit text</button><button id="raw-tab" type="button" role="tab" aria-selected="false" aria-controls="raw-output">All frames</button></div><span id="character-count" class="small-muted">0 characters</span></div><p id="review-tip" class="review-tip">Click a time to check the video. Highlighted passages may need a closer look.</p><div id="record-list" class="record-list" role="tabpanel" aria-labelledby="edit-tab"></div><textarea id="raw-output" class="raw-output hidden" readonly aria-label="Raw text from all sampled frames"></textarea></div>
        <div class="export-bar"><label class="check-label"><input id="timestamps" type="checkbox" checked/> Include time markers</label><div class="export-actions"><button id="copy" class="secondary-button" type="button" disabled title="Copy edited text">${icon('copy')}<span>Copy</span></button><button id="word" class="primary-button download-button" type="button" disabled>${icon('down')}<span>Download Word</span></button></div><div class="other-exports"><button id="txt" class="link-button" type="button" disabled>Save as TXT</button><span>·</span><button id="json" class="link-button" type="button" disabled>Save all frames as JSON</button></div></div>
      </section>
    </div>
    <footer class="footer"><span><strong>Hanzi Studio</strong> <span class="footer-dot">/</span> Made for the words you want to keep.</span><span>No API key · No subscription · Local processing</span></footer>
  </div>
  <dialog id="help-dialog"><form method="dialog"><button class="dialog-close" aria-label="Close help">×</button></form><p class="eyebrow">A QUICK GUIDE</p><h2>From video to document</h2><ol><li><strong>Choose your video.</strong> MP4 with H.264 video is the easiest starting point.</li><li><strong>Select the Chinese script.</strong> Choose Simplified for most mainland China videos, or Traditional when the video uses traditional characters.</li><li><strong>Extract and review.</strong> The first run downloads Chinese and English OCR models. Your video stays on your device.</li><li><strong>Download Word.</strong> Edit any passage before exporting. The DOCX can also be opened in Google Docs.</li></ol><p>For fast text or scrolling, use 0.25 seconds. Text that appears entirely between sampled frames may be missed. Cropping to the text helps with moving backgrounds.</p><p>OCR is imperfect. Check names and numbers. “All frames” and the JSON download retain every sampled OCR result, including repeated lines. The app extracts text; it does not translate or reconstruct tables.</p></dialog>
`;

export function mountStudio(root) {
  root.innerHTML = markup;
  const $ = id => root.querySelector(`#${id}`);
  let file = null, url = null, duration = 0, running = false, destroyed = false, loadId = 0;
  let controller = null, metadataController = null;
  let state = { records: [], raw: [], previousText: '' };
  let metadata = null;
  let startedAt = 0;
  let copyTimer = null;
  const notice = (message, error = false) => {
    $('notice').textContent = message;
    $('notice').classList.toggle('hidden', !message);
    $('notice').classList.toggle('error', error);
  };
  const hasText = () => state.records.some(r => r.text.trim());
  const updateCounts = () => {
    $('character-count').textContent = `${state.records.reduce((n, r) => n + [...r.text].length, 0).toLocaleString()} characters`;
    for (const id of ['word', 'txt', 'copy']) $(id).disabled = running || !hasText();
    $('json').disabled = running || !state.raw.length;
  };
  const setBusy = busy => {
    running = busy;
    $('settings').disabled = busy;
    $('run').classList.toggle('hidden', busy);
    $('stop').classList.toggle('hidden', !busy);
    $('stop').disabled = false;
    $('replace').disabled = busy;
    $('drop-zone').disabled = busy;
    $('file-input').disabled = busy;
    $('run').disabled = busy || !file || !duration;
    $('record-list').querySelectorAll('textarea, button.delete-record').forEach(el => { el.disabled = busy; });
    updateCounts();
  };
  const showResults = () => {
    $('empty-result').classList.add('hidden');
    $('results-area').classList.remove('hidden');
  };
  const reset = () => {
    state = { records: [], raw: [], previousText: '' };
    metadata = null;
    $('record-list').replaceChildren();
    $('raw-output').value = '';
    $('empty-result').classList.remove('hidden');
    $('results-area').classList.add('hidden');
    $('progress-area').classList.add('hidden');
    $('result-badge').textContent = 'Ready to extract';
    notice(''); updateCounts();
  };
  const crop = () => {
    if ($('region').value === 'full') return { left: 0, top: 0, right: 100, bottom: 100 };
    if ($('region').value === 'bottom') return { left: 0, top: 65, right: 100, bottom: 100 };
    return Object.fromEntries(['left', 'top', 'right', 'bottom'].map(k => [k, Number($(`crop-${k}`).value)]));
  };
  const updateCrop = () => {
    const custom = $('region').value === 'custom';
    $('crop-controls').classList.toggle('hidden', !custom);
    const box = crop();
    const overlay = $('crop-overlay');
    overlay.classList.toggle('hidden', $('region').value === 'full');
    try { cropRect(100, 100, box); overlay.style.cssText = `left:${box.left}%;top:${box.top}%;width:${box.right - box.left}%;height:${box.bottom - box.top}%;`; } catch { overlay.classList.add('hidden'); }
  };
  const readOptions = () => {
    const options = {
      language: $('language').value, interval: Number($('interval').value), crop: crop(),
      layout: $('layout').value, scale: Number($('scale').value), mode: $('mode').value,
      enhance: $('enhance').checked, localModels: $('local-models').checked,
      start: Number($('range-start').value), end: $('range-end').value === '' ? duration : Number($('range-end').value),
    };
    cropRect(100, 100, options.crop);
    sampleTimes(duration, options.interval, options.start, options.end);
    return options;
  };
  const addRecord = record => {
    if (destroyed) return;
    showResults();
    const row = document.createElement('article');
    row.className = `record${record.confidence < 65 ? ' uncertain' : ''}`;
    const head = document.createElement('div'); head.className = 'record-heading';
    const time = document.createElement('button'); time.type = 'button'; time.className = 'time-link'; time.textContent = formatTime(record.time); time.title = 'Preview this moment';
    time.onclick = () => { $('preview').currentTime = Math.min(record.time, duration - 0.001); $('preview').pause(); $('preview').scrollIntoView({ behavior: 'smooth', block: 'nearest' }); };
    const confidence = document.createElement('span'); confidence.className = 'confidence'; confidence.textContent = record.confidence < 65 ? `Review · OCR score ${record.confidence}` : `OCR score ${record.confidence}`; confidence.title = 'An OCR quality signal, not a probability of correctness';
    const remove = document.createElement('button'); remove.className = 'delete-record'; remove.type = 'button'; remove.textContent = '×'; remove.title = 'Remove this passage from the document'; remove.setAttribute('aria-label', `Remove passage at ${formatTime(record.time)}`); remove.disabled = running;
    remove.onclick = () => { state.records = state.records.filter(r => r.id !== record.id); row.remove(); updateCounts(); };
    const area = document.createElement('textarea'); area.value = record.text; area.lang = metadata?.language === 'chi_tra' ? 'zh-TW' : 'zh-CN'; area.rows = Math.max(2, Math.min(12, record.text.split('\n').length + 1)); area.disabled = running; area.setAttribute('aria-label', `Text at ${formatTime(record.time)}`);
    area.oninput = () => { record.text = area.value; updateCounts(); };
    head.append(time, confidence, remove); row.append(head, area); $('record-list').append(row);
    updateCounts();
  };
  const setView = view => {
    const edit = view === 'edit';
    for (const id of ['edit', 'raw']) { $(`${id}-tab`).classList.toggle('active', (id === 'edit') === edit); $(`${id}-tab`).setAttribute('aria-selected', String((id === 'edit') === edit)); }
    $('record-list').classList.toggle('hidden', !edit);
    $('review-tip').classList.toggle('hidden', !edit);
    $('raw-output').classList.toggle('hidden', edit);
    if (!edit) $('raw-output').value = state.raw.map(r => `[${formatTime(r.time)}]${r.reused ? ' · unchanged image' : ''}\n${r.text || '(No text detected)'}`).join('\n\n');
  };
  const chooseFile = async selected => {
    if (!selected || running) return;
    if (!selected.type.startsWith('video/') && !/\.(mp4|webm|mov|m4v|mkv|avi)$/i.test(selected.name)) { notice('Choose a video file such as MP4 or WebM.', true); return; }
    metadataController?.abort();
    metadataController = new AbortController();
    const id = ++loadId;
    if (url) URL.revokeObjectURL(url);
    url = URL.createObjectURL(selected); file = selected; duration = 0;
    reset(); setBusy(false);
    $('drop-zone').classList.add('hidden'); $('source-loaded').classList.remove('hidden');
    $('preview').src = url; $('filename').textContent = file.name;
    $('file-meta').textContent = 'Reading video…';
    $('range-start').value = '0'; $('range-end').value = '';
    try {
      const video = await openVideo(url, metadataController.signal);
      if (destroyed || id !== loadId) { releaseVideo(video); return; }
      duration = video.duration;
      $('preview').parentElement.style.maxWidth = `${400 * video.videoWidth / video.videoHeight}px`;
      $('file-meta').textContent = `${formatTime(duration)} · ${video.videoWidth} × ${video.videoHeight} · ${(file.size / 1024 / 1024).toFixed(1)} MB`;
      releaseVideo(video); setBusy(false); updateCrop();
    } catch (error) {
      if (destroyed || id !== loadId || error.name === 'AbortError') return;
      $('file-meta').textContent = 'Video could not be opened'; notice(error.message, true);
    }
  };
  const word = async () => {
    if (!hasText() || !metadata) return;
    $('word').disabled = true;
    try { await exportWord(state.records, metadata, $('timestamps').checked); }
    catch (error) { notice(`Word download failed: ${error.message}. You can still copy the text or save TXT.`, true); }
    finally { if (!destroyed) updateCounts(); }
  };
  const run = async () => {
    if (running || !file || !duration) return;
    let options;
    try { options = readOptions(); } catch (error) { notice(error.message, true); return; }
    reset(); setView('edit'); setBusy(true);
    metadata = { filename: file.name, duration, ...options, status: 'In progress', createdAt: new Date().toISOString() };
    controller = new AbortController(); startedAt = performance.now();
    $('progress-area').classList.remove('hidden'); $('result-badge').textContent = 'Reading video';
    let completed = false;
    try {
      await extractVideo({ url, options, signal: controller.signal, state, onRecord: addRecord, onProgress: p => {
        if (destroyed) return;
        $('phase').textContent = p.phase;
        $('percent').textContent = `${Math.round(p.ratio * 100)}%`;
        $('progress').value = p.ratio * 100;
        $('progress-detail').textContent = p.detail || (p.time !== undefined ? `Video time ${formatTime(p.time)} · Elapsed ${formatTime((performance.now() - startedAt) / 1000)}` : 'Preparing video');
        $('sample-count').textContent = p.total ? `${p.completed} / ${p.total} frames` : '';
      }});
      if (destroyed) return;
      completed = true; metadata.status = 'Complete';
      $('phase').textContent = 'Extraction complete';
      $('result-badge').textContent = `${state.records.length} passages`;
      if (hasText()) notice('Your text is ready. Review names and numbers, then save your document.');
      else { showResults(); notice('No text was detected. Try the other Chinese script, a different page layout, a tighter reading area, or a clearer video.'); }
    } catch (error) {
      if (destroyed) return;
      const stopped = error.name === 'AbortError' || controller.signal.aborted;
      metadata.status = stopped ? 'Partial — stopped by user' : 'Partial — processing error';
      $('phase').textContent = stopped ? 'Stopped' : 'Processing interrupted';
      $('result-badge').textContent = 'Partial result';
      notice(stopped ? 'Stopped. Any extracted text is kept and can be downloaded.' : error.message, !stopped);
    } finally {
      if (!destroyed) { setBusy(false); if (state.raw.length) showResults(); if ($('raw-tab').getAttribute('aria-selected') === 'true') setView('raw'); }
    }
    if (completed && !destroyed && hasText() && $('auto-download').checked) await word();
  };
  $('drop-zone').onclick = () => $('file-input').click();
  $('replace').onclick = () => $('file-input').click();
  $('file-input').onchange = event => { const selected = event.target.files[0]; event.target.value = ''; void chooseFile(selected); };
  $('drop-zone').ondragover = event => { event.preventDefault(); $('drop-zone').classList.add('dragging'); };
  $('drop-zone').ondragleave = () => $('drop-zone').classList.remove('dragging');
  $('drop-zone').ondrop = event => { event.preventDefault(); $('drop-zone').classList.remove('dragging'); void chooseFile(event.dataTransfer.files[0]); };
  $('region').onchange = updateCrop;
  for (const key of ['left', 'top', 'right', 'bottom']) $(`crop-${key}`).oninput = updateCrop;
  $('run').onclick = () => { void run(); };
  $('stop').onclick = () => { $('stop').disabled = true; controller?.abort(); };
  $('word').onclick = () => { void word(); };
  $('txt').onclick = () => exportText(state.records, metadata, $('timestamps').checked);
  $('json').onclick = () => exportJson(state, metadata);
  $('copy').onclick = async () => {
    try { await navigator.clipboard.writeText(buildTranscript(state.records, $('timestamps').checked)); $('copy').querySelector('span').textContent = 'Copied'; clearTimeout(copyTimer); copyTimer = setTimeout(() => { if (!destroyed) $('copy').querySelector('span').textContent = 'Copy'; }, 1800); }
    catch { notice('Clipboard access was unavailable. Use Save as TXT to keep the text.'); }
  };
  $('edit-tab').onclick = () => setView('edit'); $('raw-tab').onclick = () => setView('raw');
  for (const id of ['edit-tab', 'raw-tab']) $(id).onkeydown = event => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); const next = id === 'edit-tab' ? 'raw' : 'edit'; setView(next); $(`${next}-tab`).focus(); } };
  $('help').onclick = () => $('help-dialog').showModal();
  $('help-dialog').onclick = event => { if (event.target === $('help-dialog')) $('help-dialog').close(); };
  const unload = event => { if (running) { event.preventDefault(); event.returnValue = ''; } };
  window.addEventListener('beforeunload', unload);
  return () => {
    destroyed = true; loadId++; controller?.abort(); metadataController?.abort(); clearTimeout(copyTimer);
    window.removeEventListener('beforeunload', unload);
    releaseVideo($('preview'));
    if (url) URL.revokeObjectURL(url);
    root.replaceChildren();
  };
}
