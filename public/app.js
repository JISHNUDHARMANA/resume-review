// Keep uploaded resume content in memory rather than an editable text field.
const resumeContent = { value: '' };
const $ = id => id === 'resumeText' ? resumeContent : document.getElementById(id);
const dropzone = $('dropzone');
dropzone.addEventListener('click', () => $('fileInput').click());
dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.style.borderColor = '#227653'; });
dropzone.addEventListener('drop', e => { e.preventDefault(); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); });
$('fileInput').addEventListener('change', e => handleFile(e.target.files[0]));
async function handleFile(file) {
  if (!file) return;
  resumeContent.value = '';
  if (!/\.txt$/i.test(file.name)) {
    $('fileName').textContent = 'Please upload a TXT resume. PDF/DOCX extraction is not supported yet.';
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    $('fileName').textContent = 'Please select a file smaller than 10MB.';
    return;
  }
  try {
    resumeContent.value = await file.text();
    $('fileName').textContent = `✓ ${file.name} selected`;
  } catch {
    $('fileName').textContent = 'Unable to read this file. Please try again.';
  }
}
$('demoBtn').addEventListener('click', () => { $('resumeText').value = 'Jordan Lee\nFull Stack Developer\n\nEXPERIENCE\nSoftware Engineer — Northstar Labs\nBuilt React and Node.js features used by 40,000 customers, reducing page load time by 32%. Led API redesign and shipped 12 releases.\n\nSKILLS\nJavaScript, TypeScript, React, Node.js, SQL, AWS\n\nEDUCATION\nB.S. Computer Science'; $('jobText').value = 'We are looking for a Full Stack Engineer experienced with TypeScript, React, Node.js, REST APIs, SQL, and cloud platforms. You will build scalable products and improve performance.'; });
$('reviewBtn').addEventListener('click', async () => { const btn = $('reviewBtn'); btn.disabled = true; btn.innerHTML = 'Reviewing your resume…'; try { const response = await fetch('/api/review', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({resume:$('resumeText').value, job:$('jobText').value}) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); renderResults(data); } catch (e) { alert(e.message); } finally { btn.disabled = false; btn.innerHTML = 'Review my resume <span>→</span>'; } });
function renderResults(data) { $('results').innerHTML = `<div class="score-wrap"><div class="score-circle"><div><b>${data.score}</b><small>/ 100</small></div></div><div class="eyebrow">YOUR MATCH SCORE</div><h2>${data.score >= 80 ? 'Strong candidate signal' : 'Promising foundation'}</h2><p class="review-summary">${data.summary}</p><div class="result-grid"><h3>What’s working</h3><ul>${data.strengths.map(x=>`<li>✓ ${x}</li>`).join('')}</ul><h3>Quick wins</h3><ul>${data.improvements.map(x=>`<li>→ ${x}</li>`).join('')}</ul><h3>Skills detected</h3><div>${data.keywords.map(x=>`<span class="keyword">${x}</span>`).join('')}</div></div></div>`; }
