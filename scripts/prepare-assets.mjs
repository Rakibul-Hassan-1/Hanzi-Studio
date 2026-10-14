import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { mkdir, copyFile, readdir } from 'node:fs/promises';

const require = createRequire(import.meta.url);
const root = resolve(import.meta.dirname, '..');
// Optional path is only for maintainers running checks with preinstalled dependencies.
const installed = process.env.HANZI_DEPENDENCY_DIR;
const packageRoot = name => installed ? join(installed, name) : dirname(require.resolve(`${name}/package.json`));
const tesseract = packageRoot('tesseract.js');
const core = packageRoot('tesseract.js-core');
const docxRoot = installed ? join(installed, 'docx') : resolve(dirname(require.resolve('docx')), '..');
const vendor = join(root, 'public', 'vendor');
await mkdir(join(vendor, 'tesseract', 'core'), { recursive: true });
for (const file of ['tesseract.esm.min.js', 'worker.min.js', 'worker.min.js.LICENSE.txt', 'tesseract.min.js.LICENSE.txt']) {
  await copyFile(join(tesseract, 'dist', file), join(vendor, 'tesseract', file));
}
for (const file of await readdir(core)) {
  if (/^tesseract-core.*lstm.*\.(js|wasm)$/.test(file) || file === 'LICENSE') await copyFile(join(core, file), join(vendor, 'tesseract', 'core', file));
}
await copyFile(join(docxRoot, 'dist', 'index.mjs'), join(vendor, 'docx.mjs'));
await copyFile(join(docxRoot, 'LICENSE'), join(vendor, 'DOCX-LICENSE'));
await copyFile(join(tesseract, 'LICENSE.md'), join(vendor, 'TESSERACT-LICENSE')).catch(async () => {
  await copyFile(join(tesseract, 'LICENSE'), join(vendor, 'TESSERACT-LICENSE'));
});
console.log('Local OCR worker, WebAssembly engines, and Word exporter are ready.');
