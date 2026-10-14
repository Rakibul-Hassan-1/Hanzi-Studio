import { appendFrame, sampleTimes, samePixels } from './core.mjs';
import { abortError, checkAbort, openVideo, releaseVideo, seek, capture } from './video.mjs';

async function withAbort(promise, signal) {
  let onAbort;
  try {
    checkAbort(signal);
    return await Promise.race([promise, new Promise((_, reject) => {
      onAbort = () => reject(abortError());
      signal.addEventListener('abort', onAbort, { once: true });
    })]);
  } finally { if (onAbort) signal.removeEventListener('abort', onAbort); }
}

export async function extractVideo({ url, options, signal, state, onProgress, onRecord }) {
  let decoder, worker;
  const stopWorker = () => { if (worker) { void worker.terminate().catch(() => {}); worker = null; } };
  signal.addEventListener('abort', stopWorker, { once: true });
  try {
    onProgress({ phase: 'Opening video', completed: 0, total: 0, ratio: 0 });
    decoder = await openVideo(url, signal);
    const times = sampleTimes(decoder.duration, options.interval, options.start, options.end ?? decoder.duration);
    const canvas = document.createElement('canvas');
    const { default: Tesseract } = await import('/vendor/tesseract/tesseract.esm.min.js');
    const { createWorker, OEM } = Tesseract;
    checkAbort(signal);
    let workerFailure;
    let rejectWorker;
    const failed = new Promise((_, reject) => { rejectWorker = reject; });
    failed.catch(() => {});
    const creation = createWorker(options.language === 'chi_tra' ? ['chi_tra', 'eng'] : ['chi_sim', 'eng'], OEM.LSTM_ONLY, {
      workerPath: '/vendor/tesseract/worker.min.js',
      corePath: '/vendor/tesseract/core',
      ...(options.localModels ? { langPath: '/models' } : {}),
      logger: message => {
        if (!signal.aborted && message.status !== 'recognizing text') onProgress({ phase: 'Loading Chinese OCR', detail: message.status, ratio: 0, completed: 0, total: times.length });
      },
      errorHandler: error => {
        workerFailure = new Error(`OCR could not continue. ${String(error?.message || error)}. Check the model download, or use locally downloaded models.`);
        rejectWorker(workerFailure);
      },
    });
    creation.then(w => { if (signal.aborted) void w.terminate(); }, () => {});
    worker = await withAbort(Promise.race([creation, failed]), signal);
    await withAbort(Promise.race([worker.setParameters({ tessedit_pageseg_mode: options.layout, preserve_interword_spaces: '1' }), failed]), signal);
    let previousPixels = null;
    let previousResult = null;
    for (let index = 0; index < times.length; index++) {
      checkAbort(signal);
      if (workerFailure) throw workerFailure;
      await seek(decoder, times[index], signal);
      const pixels = capture(decoder, canvas, options);
      let result;
      const identical = previousResult && samePixels(pixels, previousPixels);
      if (identical) result = previousResult;
      else {
        onProgress({ phase: 'Reading video text', completed: index, total: times.length, time: times[index], ratio: index / times.length });
        const response = await withAbort(Promise.race([worker.recognize(canvas), failed]), signal);
        result = { text: response.data.text, confidence: response.data.confidence };
      }
      checkAbort(signal);
      previousPixels = pixels;
      previousResult = result;
      const added = appendFrame(state, { time: times[index], text: result.text, confidence: Math.round(result.confidence || 0), reused: Boolean(identical) }, options.mode);
      if (added) onRecord(state.records.at(-1));
      onProgress({ phase: 'Reading video text', completed: index + 1, total: times.length, time: times[index], ratio: (index + 1) / times.length });
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    return { duration: decoder.duration, samples: times.length };
  } catch (error) {
    if (signal.aborted) throw abortError();
    throw error instanceof Error ? error : new Error(String(error || 'OCR failed. Please reload and try again.'));
  } finally {
    signal.removeEventListener('abort', stopWorker);
    if (worker) await worker.terminate().catch(() => {});
    releaseVideo(decoder);
  }
}
