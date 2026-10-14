import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { makeDocument } from '../public/studio/export.mjs';

const require = createRequire(import.meta.url);
const dep = name => process.env.HANZI_DEPENDENCY_DIR ? require(`${process.env.HANZI_DEPENDENCY_DIR}/${name}`) : require(name);
test('Word export contains Chinese, metadata, corrected text, and optional timestamps', async () => {
  const docx = dep('docx');
  const JSZip = dep('jszip');
  const meta = { filename: '南京.mp4', language: 'chi_tra', interval: 0.5, status: 'Partial — stopped by user' };
  const records = [{ time: 2.5, text: '醫院共有1700張床位\n中文测验', confidence: 55 }];
  const zip = await JSZip.loadAsync(await docx.Packer.toBuffer(makeDocument(docx, records, meta, true)));
  const xml = await zip.file('word/document.xml').async('string');
  assert.ok(xml.includes('醫院共有1700張床位'));
  assert.ok(xml.includes('00:02.5'));
  assert.ok(xml.includes('Partial'));
  assert.ok(xml.includes('Microsoft YaHei'));
  const noTimeZip = await JSZip.loadAsync(await docx.Packer.toBuffer(makeDocument(docx, records, meta, false)));
  assert.ok(!(await noTimeZip.file('word/document.xml').async('string')).includes('00:02.5'));
});
