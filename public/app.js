const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(['pdf', 'docx', 'txt']);
const resume = { text: '', status: 'empty', request: 0 };

const $ = id => document.getElementById(id);
const dropzone = $('dropzone');
const fileInput = $('fileInput');
const fileName = $('fileName');

dropzone.addEventListener('click', () => fileInput.click());
dropzone.addEventListener('dragover', event => {
  event.preventDefault();
  dropzone.style.borderColor = '#227653';
});
dropzone.addEventListener('dragleave', () => { dropzone.style.borderColor = ''; });
dropzone.addEventListener('drop', event => {
  event.preventDefault();
  dropzone.style.borderColor = '';
  if (event.dataTransfer.files[0]) handleFile(event.dataTransfer.files[0]);
});
fileInput.addEventListener('change', event => {
  handleFile(event.target.files[0]);
  fileInput.value = '';
});

function setResumeError(message) {
  resume.text = '';
  resume.status = 'error';
  fileName.textContent = message;
}

async function handleFile(file) {
  if (!file) return;
  const request = ++resume.request;
  resume.text = '';
  resume.status = 'pending';
  fileName.textContent = `Extracting ${file.name}…`;
  const extension = file.name.split('.').pop().toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    if (request === resume.request) setResumeError('Please upload a PDF, DOCX, or TXT file.');
    return;
  }
  if (file.size > MAX_FILE_SIZE) {
    if (request === resume.request) setResumeError('Please select a file no larger than 10MB.');
    return;
  }
  try {
    const response = await fetch('/api/extract', {
      method: 'POST',
      headers: { 'X-Filename': encodeURIComponent(file.name) },
      body: file
    });
    const data = await response.json();
    if (!response.ok || typeof data.text !== 'string') throw new Error(data.error || 'Unable to extract resume text.');
    if (request !== resume.request) return;
    resume.text = data.text;
    resume.status = 'ready';
    fileName.textContent = `✓ ${file.name} ready`;
  } catch (error) {
    if (request === resume.request) setResumeError(error.message || 'Unable to extract this file. Please try again.');
  }
}

$('demoBtn').addEventListener('click', () => {
  ++resume.request;
  resume.text = 'Jordan Lee\nFull Stack Developer\n\nEXPERIENCE\nSoftware Engineer — Northstar Labs\nBuilt React and Node.js features used by 40,000 customers, reducing page load time by 32%. Led API redesign and shipped 12 releases.\n\nSKILLS\nJavaScript, TypeScript, React, Node.js, SQL, AWS\n\nEDUCATION\nB.S. Computer Science';
  resume.status = 'ready';
  fileName.textContent = '✓ Demo resume loaded';
  $('jobText').value = 'We are looking for a Full Stack Engineer experienced with TypeScript, React, Node.js, REST APIs, SQL, and cloud platforms. You will build scalable products and improve performance.';
});

$('reviewBtn').addEventListener('click', async () => {
  if (resume.status === 'pending') { fileName.textContent = 'Please wait for resume extraction to finish.'; return; }
  if (resume.status !== 'ready' || !resume.text) { fileName.textContent = 'Upload a valid resume before reviewing.'; return; }
  const btn = $('reviewBtn');
  btn.disabled = true;
  btn.innerHTML = 'Reviewing your resume…';
  try {
    const response = await fetch('/api/review', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ resume: resume.text, job: $('jobText').value }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Review failed.');
    renderResults(data);
  } catch (error) { fileName.textContent = error.message || 'Review failed. Please try again.'; }
  finally { btn.disabled = false; btn.innerHTML = 'Review my resume <span>→</span>'; }
});

function escapeHtml(value) { const div = document.createElement('div'); div.textContent = String(value ?? ''); return div.innerHTML; }
function renderResults(data) {
  const list = values => values.map(value => `<li>${escapeHtml(value)}</li>`).join('');
  $('results').innerHTML = `<div class="score-wrap"><div class="score-circle"><div><b>${escapeHtml(data.score)}</b><small>/ 100</small></div></div><div class="eyebrow">YOUR MATCH SCORE</div><h2>${data.score >= 80 ? 'Strong candidate signal' : 'Promising foundation'}</h2><p class="review-summary">${escapeHtml(data.summary)}</p><div class="result-grid"><h3>What’s working</h3><ul>${list(data.strengths || [])}</ul><h3>Quick wins</h3><ul>${list(data.improvements || [])}</ul><h3>Skills detected</h3><div>${(data.keywords || []).map(value => `<span class="keyword">${escapeHtml(value)}</span>`).join('')}</div></div></div>`;
}
