import test from 'node:test';
import assert from 'node:assert/strict';
import { appendFrame, buildTranscript, cropRect, formatTime, newLines, sampleTimes, samePixels, safeFilename } from '../public/studio/core.mjs';

test('sampling includes the start and a decodable final frame', () => {
  assert.deepEqual(sampleTimes(1, 0.5), [0, 0.5, 0.96]);
  assert.deepEqual(sampleTimes(10, 0.5, 4, 5), [4, 4.5, 4.96]);
  assert.equal(sampleTimes(0.01, 0.5)[0], 0);
  assert.throws(() => sampleTimes(10, 0));
  assert.throws(() => sampleTimes(10, 0.5, 5, 4));
  assert.throws(() => sampleTimes(10, 0.5, 0, 11));
});
test('deduplication preserves changed figures and punctuation', () => {
  assert.equal(newLines('南京医院\n床位1700张', '南京医院\n床位1500张'), '床位1700张');
  assert.equal(newLines('增长率3.5%', '增长率35%'), '增长率3.5%');
  assert.equal(newLines('医院共有1500张床位', '医 院 共 有1500张床位'), '');
  assert.equal(newLines('医院医院', '医院'), '医院医院');
});
test('scroll overlap drops only already visible exact lines', () => {
  assert.equal(newLines('第二行\n第三行\n第四行', '第一行\n第二行\n第三行'), '第四行');
  assert.equal(newLines('南京\n南京', '南京'), '南京');
});
test('reappearing text survives after a blank or different frame', () => {
  const state = { records: [], raw: [], previousText: '' };
  const add = (text, time) => appendFrame(state, { text, time, confidence: 90 });
  add('南京医院', 0); add('南京医院', 0.5); add('', 1); add('南京医院', 1.5);
  assert.equal(state.records.length, 2); assert.equal(state.raw.length, 4);
  assert.equal(state.records[1].time, 1.5);
});
test('keep every frame retains repeats and editable records do not mutate raw results', () => {
  const state = { records: [], raw: [], previousText: '' };
  appendFrame(state, { text: '中文', time: 0, confidence: 85 }, 'frames');
  appendFrame(state, { text: '中文', time: 1, confidence: 85 }, 'frames');
  assert.equal(state.records.length, 2);
  state.records[0].text = '修正';
  assert.equal(state.raw[0].text, '中文');
});
test('crop validation and one-pixel changes are not silently discarded', () => {
  assert.deepEqual(cropRect(1920, 1080, { left: 0, top: 65, right: 100, bottom: 100 }), { x: 0, y: 702, width: 1920, height: 378 });
  assert.throws(() => cropRect(100, 100, { left: 80, top: 0, right: 70, bottom: 100 }));
  assert.equal(samePixels(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 4])), false);
  assert.equal(samePixels(new Uint8Array([1, 2]), new Uint8Array([1, 2])), true);
});
test('export text preserves Unicode, edits, and time markers', () => {
  assert.equal(buildTranscript([{ time: 61.5, text: '醫院\n南京' }]), '[01:01.5]\n醫院\n南京');
  assert.equal(buildTranscript([{ time: 61.5, text: '中文' }], false), '中文');
  assert.equal(formatTime(3661.2), '1:01:01.2');
  assert.equal(formatTime(59.96), '01:00');
  assert.equal(safeFilename('南京/医院.mp4'), '南京_医院-chinese-text');
});
