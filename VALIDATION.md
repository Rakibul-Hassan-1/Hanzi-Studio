# Delivery validation

## Passed

- JavaScript syntax checks for the application, Next.js shell, scripts, and tests.
- 11 automated tests covering frame sampling, time boundaries, crop validation, Chinese exact-line deduplication, changed numbers, repeated text after a blank frame, Unicode exports, partial-result metadata, and video cancellation/metadata handling.
- A real Tesseract.js 7 OCR smoke test using the environment's installed English model: read two generated images containing `Total beds: 1500` and `Total beds: 1700`, retained the changed figure, and removed unchanged lines.
- DOCX creation using the production document builder. The resulting English test document was rendered to an image and visually inspected for layout and clipping.
- Structural DOCX checks confirming Chinese Unicode text, Chinese font declarations, edited content, optional time markers, and partial-result status.
- Local HTTP checks: application HTML, browser modules, OCR worker, WebAssembly engine, and Word-export module returned HTTP 200 with appropriate content types.

## Not verified in this environment

- `npm install` / `next build`: access to the npm registry was denied with HTTP 403. The environment had Tesseract.js 7 and docx 9.6.1 available, but did not have Next.js or React installed. No Next.js build success is claimed.
- A full browser run from video selection to Word download: no browser executable was available.
- Chinese OCR accuracy on a real video: no user video, Chinese trained-data file, or Chinese-capable system font was available. Chinese recognition is implemented using `chi_sim` or `chi_tra` plus English, but the executed real-OCR smoke test was English only.
- Browser screenshot inspection and Chinese glyph rendering in Word.

## Suggested first run on your computer

1. Install dependencies and run `npm run check`, `npm test`, and `npm run build`.
2. Open a short clear Chinese video and process it using the matching script.
3. Check a name and a changing number against the video.
4. Verify that Word opens the downloaded document and displays editable Chinese.
5. Run again and click Stop; confirm partial results remain downloadable.
6. For scrolling or rapidly changing text, use a shorter sample interval and compare the raw All frames view.

OCR quality depends on the video. Passing the logic and export tests does not establish perfect recognition or complete coverage of every visible word.
