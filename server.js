import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' };

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
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { resume = '', job = '' } = JSON.parse(body);
        if (!resume.trim()) throw new Error('Resume text is required');
        res.writeHead(200, { 'content-type': 'application/json', 'access-control-allow-origin': '*' });
        res.end(JSON.stringify(scoreResume(resume, job)));
      } catch (error) {
        res.writeHead(400, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }
  const path = req.url === '/' ? '/public/index.html' : `/public${req.url}`;
  try {
    const content = await readFile(join(root, path));
    res.writeHead(200, { 'content-type': mime[extname(path)] || 'text/plain' });
    res.end(content);
  } catch {
    res.writeHead(404); res.end('Not found');
  }
});

server.listen(process.env.PORT || 3000, () => console.log(`Resume Reviewer running at http://localhost:${process.env.PORT || 3000}`));
