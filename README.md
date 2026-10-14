# Hanzi Studio

A Next.js application that reads Chinese text visible in a video and exports an editable Word document. Audio is not needed. The original Chinese text is retained; this app does not translate it.

## বাংলায় শুরু করার নিয়ম

1. [Node.js](https://nodejs.org/) থেকে **Node.js 22 বা পরের সংস্করণ** ইনস্টল করুন।
2. ZIP ফাইল extract করুন। `hanzi-video-docs` ফোল্ডারে যান।
3. Windows হলে `start.bat` ডাবল ক্লিক করুন। প্রথমবার ইন্টারনেট লাগবে। Mac/Linux হলে terminal-এ `sh start.sh` চালান।
4. Server ready হলে Chrome বা Edge-এ **http://localhost:3000** খুলুন।
5. ভিডিও দিন। Mainland China-এর অধিকাংশ ভিডিওতে **Simplified Chinese** বেছে নিন; লেখাটি traditional হলে **Traditional Chinese** নিন।
6. **Extract Chinese text** চাপুন। প্রথমবার OCR মডেল ডাউনলোড হতে সময় লাগবে।
7. শেষ হলে `.docx` Word ফাইল ডাউনলোড হবে। ব্রাউজার স্বয়ংক্রিয় ডাউনলোড আটকালে **Download Word** চাপুন।
8. প্রয়োজন হলে স্ক্রিনে পাওয়া লেখা সংশোধন করে আবার Word ডাউনলোড করুন।

**খরচ:** কোনো paid API বা API key লাগে না। নিজের কম্পিউটারে OCR হয়। Hosting ব্যবহার করলে সেটির নিজস্ব শর্ত বা খরচ থাকতে পারে।

**সীমাবদ্ধতা:** OCR শতভাগ নির্ভুল নয়। নাম, সংখ্যা এবং ছোট/ঝাপসা লেখা যাচাই করুন। খুব দ্রুত লেখা বদলালে `0.25 seconds` বেছে নিন। দুই sample-এর মধ্যেই দেখা দিয়ে চলে যাওয়া লেখা বাদ পড়তে পারে। ভিডিও বড় হলে সময় ও RAM বেশি লাগবে; শুরুতে একটি ছোট clip ব্যবহার করুন।

## Run manually

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Keep the browser tab open during extraction.

For a production build and local preview:

```bash
npm run build
npm start
```

The Next.js configuration produces a static export in `out/`. `npm start` serves that output using the included local server; it intentionally does not call `next start`, which does not serve static exports. The local server binds only to the current computer. For public hosting, serve `out/` through an HTTPS static host at the domain root. Subdirectory/base-path deployment is not configured.

## What is included

- A Next.js App Router shell with a responsive browser interface.
- Local video selection, drag and drop, video preview, and time-based review.
- Simplified Chinese or Traditional Chinese OCR, with English recognition alongside it.
- Full-screen reading by default, bottom subtitle crop, or custom percentage crop.
- Adjustable sampling interval, time range, page layout, contrast, and image scaling.
- A background OCR worker and live progress; cancel and keep partial results.
- Consecutive exact-line deduplication. Changed numbers and punctuation are retained.
- Editable extracted passages, quality scores, and click-to-preview timestamps.
- Word `.docx`, UTF-8 `.txt`, clipboard copy, and `.json` with every sampled OCR result.
- Optional automatic Word download on successful completion.
- Bundled browser worker and Word-export assets, plus scripts to regenerate them.

There is no server upload endpoint, authentication service, database, paid model, or speech-to-text dependency. Videos and their text stay in the browser. OCR model files are downloaded from jsDelivr unless local models are selected; a provider sees the model download request, but receives no video frames. There are no analytics or remote font calls.

## Processing details

1. A separate HTML video decoder opens a local object URL.
2. The selected range is sampled every 0.25, 0.5, 1, or 2 seconds, plus a final decodable frame.
3. Each sampled image is cropped and optionally enhanced. The maximum image dimension is 2560 pixels to control memory use. This can downscale very high-resolution video; cropping helps retain small text.
4. Tesseract.js 7 reads each frame with Chinese and English language models. Exact pixel-identical consecutive images reuse the preceding result. There is no approximate visual-change threshold.
5. The default document keeps only new or changed exact lines relative to the immediately preceding sampled frame. It compares full lines and preserves punctuation and numbers. It does not compare semantically or fuzzy-match.
6. Every sampled OCR result is retained separately. The **All frames** view and JSON export let you inspect repetitions or a line omitted by deduplication. Select **Keep every sampled frame** before processing if repetition itself matters.
7. The DOCX exporter writes reviewed Chinese text with optional timestamps and a Chinese-capable font declaration. Source filename, script, sample interval, and complete/partial status are recorded in the document.

Output is a text transcript. It does not reconstruct table cells, diagrams, animations, or slide layout. It does not guarantee detection of every word. Text that changes between sample times can be missed. Sparse text, vertical Chinese, motion blur, compression, and moving backgrounds may require different settings. Chinese vertical layout is experimental; horizontal text is the primary use case.

## Local models and restricted networks

To download all three models once:

```bash
npm run models:download
```

Then enable **Advanced options → Use locally downloaded OCR models**. Run the command before `npm run build` for a production export. Models are stored under `public/models/`; do not rename them. If model download fails, check whether your network permits `cdn.jsdelivr.net`.

The worker, WebAssembly engines, and Word exporter are served locally from `public/vendor/`. The postinstall script copies these from the pinned packages. Run `npm run prepare:assets` if they are missing. Local model files allow processing without third-party network requests while the app is served locally. This is not a service-worker offline-installable PWA.

## Troubleshooting

| Problem | Action |
| --- | --- |
| Video will not open | Try Chrome or Edge and an H.264 MP4 or VP9 WebM. An MP4 container does not guarantee a supported codec; some HEVC/MOV/MKV files need conversion. |
| Model download fails | Check internet access; retry or use the local-model command above. Do not enable local models before downloading them. |
| Chinese script looks wrong | Switch Simplified/Traditional to match the actual video. |
| Missing or garbled text | Crop to the text, try the other page layout, increase image size, try contrast on/off, or use a clearer source. |
| Repeated passages | OCR differences produce slightly different lines. Edit them, or try a tighter crop. Raw results are kept. |
| Text disappears from the clean document | Compare All frames; rerun with Keep every sampled frame if persistent lines are needed on each page. |
| Long video is too slow | Select a shorter time range, reduce image size, or use a longer sampling interval. A range is limited to 20,000 samples. |
| Word did not download automatically | Click Download Word after extraction. Browser policies can block automatic downloads. |
| Word shows boxes instead of Chinese | Install a Chinese-capable font such as Noto Sans CJK, or open the file on a system with Microsoft YaHei/PingFang. Text is Unicode and editable. |
| Refresh lost the result | Results are held in memory. Save DOCX/TXT/JSON before refreshing or closing. |

## Project structure

```text
app/                     Next.js App Router layout and client page
public/studio/           Browser application, OCR pipeline, and DOCX export
public/vendor/           Prepared third-party browser assets and licenses
scripts/                 Asset preparation, model download, local serving
tests/                   Sampling, Chinese deduplication, video lifecycle, DOCX tests
start.bat / start.sh     One-command local startup
```

The Next.js page loads a web component from `public/studio/entry.mjs`. Keeping OCR and DOCX code in browser-native ES modules prevents bundlers from treating the worker's absolute asset URLs as server modules. React owns the page shell; the component owns its isolated UI and cancels processing when disconnected.

`public/preview.html` loads the identical component without the Next.js shell for diagnostics. With bundled vendor assets, `node scripts/serve-preview.mjs` can preview it without installing Next.js; the production app remains the Next.js project.

## Validation

```bash
npm run check
npm test
npm run build
```

See `VALIDATION.md` for the checks performed in the delivery environment and the checks that still require a browser with model-download access. The tests do not claim that the Chinese OCR engine is accurate for every video.

No lockfile is included because npm registry access was denied in the delivery environment. The OCR and document libraries are pinned; Next.js and React accept current releases in their specified major versions. Your first `npm install` generates `package-lock.json`. Keep that file for repeatable future installs.

## References

- [Next.js installation](https://nextjs.org/docs/app/getting-started/installation)
- [Tesseract.js](https://github.com/naptha/tesseract.js)
- [Tesseract.js API](https://github.com/naptha/tesseract.js/blob/master/docs/api.md)
- [docx](https://docx.js.org/)

Third-party licenses are copied into `public/vendor/`. The application source is provided under the MIT license in `LICENSE`.
# Hanzi-Studio
