# CareerLens — Resume Reviewer

A small full-stack resume reviewer built with zero dependencies: a responsive browser UI and a Node.js HTTP API.

## Run locally

Requires Node.js 18+.

```bash
npm install
npm start
```

Open http://localhost:3000. Use **Load demo** for sample content, or upload a PDF, DOCX, or TXT resume (maximum 10MB) and paste a job description. Uploads are sent to `POST /api/extract` as the raw file body with an `X-Filename` header containing the encoded filename; it returns `{ "text": "..." }` or `{ "error": "..." }`. The `POST /api/review` endpoint returns a structured score, strengths, improvements, and keyword matches.

## Production notes

The scoring function in `server.js` is intentionally dependency-free and rule-based, so results are indicative rather than an AI judgment and may miss context or nuance. Extraction is handled by the server endpoint; keep provider keys server-side in environment variables and add authentication, rate limiting, and persistent review storage for production.
