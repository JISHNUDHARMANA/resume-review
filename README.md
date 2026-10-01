# CareerLens — Resume Reviewer

A small full-stack resume reviewer built with zero dependencies: a responsive browser UI and a Node.js HTTP API.

## Run locally

Requires Node.js 18+.

```bash
npm start
```

Open http://localhost:3000. Use **Load demo** for sample content, or upload a `.txt` resume and paste a job description. The `POST /api/review` endpoint returns a structured score, strengths, improvements, and keyword matches.

## Production notes

The scoring function in `server.js` is intentionally dependency-free and local. For production, replace `scoreResume()` with a server-side LLM provider, add PDF/DOCX extraction, authentication, rate limiting, and persistent review storage. Keep provider keys server-side in environment variables.
