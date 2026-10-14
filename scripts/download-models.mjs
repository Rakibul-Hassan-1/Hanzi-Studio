import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const directory = resolve(import.meta.dirname, '../public/models');
await mkdir(directory, { recursive: true });
for (const language of ['chi_sim', 'chi_tra', 'eng']) {
  const url = `https://cdn.jsdelivr.net/npm/@tesseract.js-data/${language}/4.0.0_best_int/${language}.traineddata.gz`;
  const destination = join(directory, `${language}.traineddata.gz`);
  console.log(`Downloading ${language}…`);
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(180000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length < 10000 || bytes[0] !== 0x1f || bytes[1] !== 0x8b) throw new Error('Invalid model archive');
    await writeFile(`${destination}.partial`, bytes);
    await rename(`${destination}.partial`, destination);
    console.log(`Saved ${language}: ${(bytes.length / 1024 / 1024).toFixed(1)} MB`);
  } catch (error) {
    await rm(`${destination}.partial`, { force: true });
    console.error(`Could not download ${language}: ${error.message}. Check your internet connection and rerun the command.`);
    process.exitCode = 1;
    break;
  }
}
if (!process.exitCode) console.log('Ready. Enable “Use locally downloaded OCR models” in Advanced options. Rebuild if serving a production export.');
