import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';

const root = fileURLToPath(new URL('.', import.meta.url));
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' };
const MAX_BYTES = 10 * 1024 * 1024;
const publicFiles = new Map([
  ['/', ['public/index.html', 'text/html']],
  ['/index.html', ['public/index.html', 'text/html']],
  ['/styles.css', ['public/styles.css', 'text/css']],
  ['/app.js', ['public/app.js', 'text/javascript']]
]);

function readBody(req, limit = MAX_BYTES) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let settled = false;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > limit) {
        settled = true;
        req.destroy();
        reject(Object.assign(new Error(`Request body exceeds ${limit / 1024 / 1024}MB limit`), { statusCode: 413 }));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => { if (!settled) resolve(Buffer.concat(chunks)); });
    req.on('error', error => { if (!settled) reject(error); });
  });
}

function json(res, status, value) {
  res.writeHead(status, { 'content-type': 'application/json', 'access-control-allow-origin': '*' });
  res.end(JSON.stringify(value));
}

function filenameFromHeader(value) {
  if (!value) throw new Error('X-Filename header is required');
  try { return decodeURIComponent(value); } catch { throw new Error('X-Filename must be URL-encoded'); }
}

async function extract(buffer, filename) {
  const extension = extname(filename).toLowerCase();
  if (!['.pdf', '.docx', '.txt'].includes(extension)) throw new Error('Unsupported file type; use PDF, DOCX, or TXT');
  let text;
  if (extension === '.txt') text = buffer.toString('utf8');
  else if (extension === '.docx') text = (await mammoth.extractRawText({ buffer })).value;
  else {
    if (buffer.subarray(0, 5).toString() !== '%PDF-') throw new Error('Invalid PDF file');
    const parser = new PDFParse({ data: buffer });
    try { text = (await parser.getText()).text; } finally { await parser.destroy(); }
  }
  text = String(text || '').replace(/\u0000/g, '').trim();
  if (!text) throw new Error(extension === '.pdf' ? 'PDF contains no selectable text (it may be scanned); upload an OCR or text-based PDF' : 'The file contains no readable text');
  return text;
}

function scoreResume(resume, job) {
  const text = `${resume} ${job}`.toLowerCase();
  const checks = [
    ['Keyword alignment', /(javascript|typescript|react|node|sql|python|api|cloud)/.test(text)],
    ['Impact metrics', /\b(\d+%|\$\d+|\d+x|increased|reduced|saved)\b/.test(resume.toLowerCase())],
    ['Clear structure', /(experience|education|skills|projects)/.test(resume.toLowerCase())],
    ['Relevant role', /(engineer|developer|product|design|data)/.test(text)]
  ];
  const score = Math.min(98, 46 + checks.filter(([, ok]) => ok).length * 12 + Math.min(12, Math.floor(resume.length / 500)));
  return {
    score,
    checks,
    summary: score >= 80 ? 'Strong match with a clear story. A few targeted edits can make this application even sharper.' : 'Good foundation, but the resume needs stronger evidence and closer keyword alignment for this role.',
    strengths: ['Readable one-page structure', 'Professional summary is easy to scan', 'Experience is ordered from most recent to oldest'],
    improvements: [
      'Add 2–3 measurable outcomes to your most recent role.',
      'Mirror the job description language for your top technical skills.',
      'Replace passive phrases with direct action verbs like “built”, “led”, and “shipped”.'
    ],
    keywords: ['TypeScript', 'React', 'Node.js', 'REST APIs', 'SQL', 'Cloud']
  };
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/api/review') {
    try {
      const { resume = '', job = '' } = JSON.parse((await readBody(req, 1024 * 1024)).toString('utf8'));
      if (typeof resume !== 'string' || !resume.trim()) throw new Error('Resume text is required');
      if (typeof job !== 'string') throw new Error('Job description must be text');
      json(res, 200, scoreResume(resume, job));
    } catch (error) { json(res, error.statusCode || 400, { error: error.message }); }
    return;
  }
  if (req.method === 'POST' && req.url === '/api/extract') {
    try {
      const filename = filenameFromHeader(req.headers['x-filename']);
      const text = await extract(await readBody(req), filename);
      json(res, 200, { text });
    } catch (error) { json(res, error.statusCode || 400, { error: error.message }); }
    return;
  }
  const asset = publicFiles.get(req.url);
  if (!asset || req.method !== 'GET') { res.writeHead(404); res.end('Not found'); return; }
  try {
    const content = await readFile(join(root, asset[0]));
    res.writeHead(200, { 'content-type': asset[1] });
    res.end(content);
  } catch { res.writeHead(404); res.end('Not found');
  }
});

server.listen(process.env.PORT || 3000, () => console.log(`Resume Reviewer running at http://localhost:${process.env.PORT || 3000}`));
