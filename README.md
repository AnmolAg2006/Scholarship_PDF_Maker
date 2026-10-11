# Scholarship PDF Maker

A browser-based Next.js app for splitting one merged scholarship PDF into individual, clearly named PDFs and downloading them as a ZIP.

## Features

- Prescribed document order for the scholarship workflow
- Optional Gap Certificate, 12th Marksheet, tuition/exam fee slips, and hostel fee slips
- Page-count inputs for fee slips and undertaking (0 pages allowed)
- Application Form is fixed at 3 pages
- Admission Form is excluded because it is pre-uploaded
- Automatic page-range calculation
- PDF page-count validation before splitting
- Individual PDF downloads and ZIP download
- PDF processing occurs locally in the browser; no upload API/backend is used
- PDF-only upload, 100 MB size limit, and readable error states

## Requirements

- Node.js 20.9 or newer
- npm

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Production build

```bash
npm run build
npm start
```

## Important user instructions

Users must merge documents in the exact order displayed in the app and must not include documents marked as skipped. The app validates the total page count, but it cannot visually verify that each page contains the expected document. Students should review their source PDF and the generated PDFs before uploading to the scholarship portal.

## Privacy

This app uses `pdf-lib` and `JSZip` in the browser. It has no upload endpoint, account system, database, analytics, or external API calls. Files are processed in the active browser tab. For sensitive documents, use a trusted device and close the tab after use.

## Document order/configuration

The current defaults are configured in `app/page.tsx` in `initialDocs`:
1. Income Certificate — 1 page
2. Tuition/Exam Fee Slips — optional, variable pages
3. Domicile — 1 page
4. Gap Certificate — optional, 1 page
5. High School Marksheet — 1 page
6. Last Year University Marksheet/Profile Print — 1 page
7. Aadhaar Card — 1 page
8. 12th Marksheet — optional, 1 page
9. Undertaking — variable pages, default 1 (0 allowed)
10. Application Form — 3 pages
11. Admission Form — shown for clarity but excluded from processing
12. Hostel Fee Slips — optional, variable pages

If official requirements change, update `initialDocs` in `app/page.tsx` and rebuild.
