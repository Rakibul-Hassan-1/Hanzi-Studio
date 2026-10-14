import { buildTranscript, formatTime, safeFilename } from './core.mjs';

export function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = name;
  document.body.append(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

// Dependency injection lets the same document builder run in browser and Node QA.
export function makeDocument(docx, records, meta, timestamps = true) {
  const { Document, Paragraph, TextRun, HeadingLevel } = docx;
  const font = { ascii: 'Aptos', hAnsi: 'Aptos', eastAsia: 'Microsoft YaHei', cs: 'Arial' };
  const text = value => new TextRun({ text: value, font, size: 23, language: { value: 'en-US', eastAsia: meta.language === 'chi_tra' ? 'zh-TW' : 'zh-CN' } });
  const children = [
    new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: 'Chinese text extracted from video', bold: true, size: 36, color: '000000', font })] }),
    new Paragraph({ children: [text(`Source: ${meta.filename}`)] }),
    new Paragraph({ children: [text(`Language: ${meta.language === 'chi_tra' ? 'Traditional Chinese' : 'Simplified Chinese'} | Sample interval: ${meta.interval}s | Status: ${meta.status || 'Complete'}`)] }),
    new Paragraph({ spacing: { after: 240 }, children: [text('The following text was read from visible video frames in time order. OCR output may contain errors; check names, numbers, and unclear passages against the video.')] }),
  ];
  for (const record of records) {
    if (!record.text.trim()) continue;
    if (timestamps) children.push(new Paragraph({ keepNext: true, spacing: { before: 180, after: 80 }, children: [new TextRun({ text: formatTime(record.time), bold: true, size: 21, color: '000000', font })] }));
    for (const line of record.text.split('\n').filter(Boolean)) children.push(new Paragraph({ spacing: { after: 100, line: 320 }, children: [text(line)] }));
  }
  return new Document({
    creator: 'Hanzi Studio', title: 'Chinese text extracted from video',
    styles: { default: { document: { run: { font, size: 23, color: '000000' } } } },
    sections: [{ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1080, bottom: 1080, left: 1080, right: 1080 } } }, children }],
  });
}

export async function exportWord(records, meta, timestamps) {
  const docx = await import('/vendor/docx.mjs');
  const blob = await docx.Packer.toBlob(makeDocument(docx, records, meta, timestamps));
  saveBlob(blob, `${safeFilename(meta.filename)}.docx`);
}

export function exportText(records, meta, timestamps) {
  saveBlob(new Blob(['\ufeff', buildTranscript(records, timestamps)], { type: 'text/plain;charset=utf-8' }), `${safeFilename(meta.filename)}.txt`);
}

export function exportJson(state, meta) {
  saveBlob(new Blob([JSON.stringify({ version: 1, metadata: meta, editedRecords: state.records, sampledFrames: state.raw }, null, 2)], { type: 'application/json;charset=utf-8' }), `${safeFilename(meta.filename)}-all-frames.json`);
}
