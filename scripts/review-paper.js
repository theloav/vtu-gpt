// scripts/review-paper.js
// Extracts text from VTU_GPT.pdf and Rasool Paper - Overall Suggestions.docx,
// and loads VTU-GPT-IEEE-Paper.md for comparison.

const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');

async function readPdf(filePath) {
  const dataBuffer = fs.readFileSync(filePath);
  const result = await pdf(dataBuffer);
  return result.text;
}

async function readDocx(filePath) {
  const buffer = fs.readFileSync(filePath);
  const res = await mammoth.extractRawText({ buffer });
  return res.value || '';
}

async function run() {
  const pdfPath = path.join(process.cwd(), 'VTU_GPT.pdf');
  const docxPath = path.join(process.cwd(), 'Rasool Paper - Overall Suggestions.docx');
  const mdPath = path.join(process.cwd(), 'VTU-GPT-IEEE-Paper.md');

  console.log('🔄 Reading inputs...');
  const [pdfText, docxText, mdText] = await Promise.all([
    readPdf(pdfPath).catch(e => (console.error('PDF read error:', e.message), '')),
    readDocx(docxPath).catch(e => (console.error('DOCX read error:', e.message), '')),
    fs.readFileSync(mdPath, 'utf8')
  ]);

  // Save extracted text for inspection
  fs.writeFileSync('outputs/paper_pdf_text.txt', pdfText || '');
  fs.writeFileSync('outputs/suggestions_text.txt', docxText || '');
  fs.writeFileSync('outputs/paper_md_text.txt', mdText || '');

  // Quick heuristic breakdown by sections for the MD paper
  const sectionRegex = /^##\s+(.+)$/gm;
  const sections = [];
  let m;
  while ((m = sectionRegex.exec(mdText)) !== null) {
    sections.push({ title: m[1].trim(), index: m.index });
  }
  // Append end index markers
  for (let i = 0; i < sections.length; i++) {
    sections[i].end = i + 1 < sections.length ? sections[i + 1].index : mdText.length;
    sections[i].content = mdText.slice(sections[i].index, sections[i].end);
  }

  console.log('📄 Detected sections in MD paper:', sections.map(s => s.title));

  // Very light keyword cues from suggestions to map actions (heuristic)
  const suggestionsLower = (docxText || '').toLowerCase();
  const cues = {
    abstract: /abstract|keywords/i,
    related: /related\s+work|literature\s+review|prior\s+work/i,
    methodology: /methodology|algorithm|approach|pipeline/i,
    experiments: /experiment|evaluation|metrics|dataset|baseline/i,
    results: /results|discussion|analysis/i,
    conclusion: /conclusion|future\s+work|limitations/i,
    references: /references|citations|ieee\s+style/i,
    figures: /figure|screenshot|diagram|architecture|schema|chart/i,
    title: /title|rename|rename\s+paper|improve\s+title/i
  };

  const triggered = Object.entries(cues)
    .filter(([k, rx]) => rx.test(docxText))
    .map(([k]) => k);

  console.log('🔎 Suggestion cue categories found:', triggered);

  // Output a compact report for manual mapping
  console.log('\n===== SUGGESTIONS (first 4000 chars) =====');
  console.log((docxText || '').slice(0, 4000));
  console.log('\n===== END SUGGESTIONS =====');

  console.log('\n===== PDF TEXT (first 2000 chars) =====');
  console.log((pdfText || '').slice(0, 2000));
  console.log('\n===== END PDF TEXT =====');

  console.log('\n✅ Extracted. See outputs/ for full texts.');
}

// Ensure outputs dir
try { fs.mkdirSync('outputs', { recursive: true }); } catch {}

run().catch(err => { console.error('❌ review-paper failed:', err); process.exit(1); });

