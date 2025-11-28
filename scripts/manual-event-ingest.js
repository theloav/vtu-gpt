// scripts/manual-event-ingest.js
// Standalone script to parse Sample-Academic-Calendar-Document.txt and insert events into SQLite
// This bypasses the upload pipeline to ensure the calendar gets populated now.

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const KEYWORDS = {
  exam: /(exam|examination|assessment|test)/i,
  registration: /(registration|register|enroll|enrollment)/i,
  deadline: /(deadline|last date|due date|final date|closing date|due\s+on|due\s+by)/i,
  fee: /(fee|payment|tuition|charges|dues)/i,
  holiday: /(holiday|vacation|break|closed|festival)/i,
  workshop: /(workshop|seminar|conference|training|session|fair|symposium|event)/i,
  result: /(result|marks|grades|declared|published)/i,
  project: /(project|thesis|dissertation|submission)/i,
};

// Date regexes
const MONTHS = '(January|February|March|April|May|June|July|August|September|October|November|December)';
const DATE_MDYYYY = new RegExp(`\\b${MONTHS}\\s+(\\d{1,2}),?\\s+(\\d{4})\\b`, 'gi');
const DATE_DMY = /\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})\b/g;

function toISO(year, monthNameOrNum, day) {
  const monthMap = {
    january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
    july: '07', august: '08', september: '09', october: '10', november: '11', december: '12'
  };
  let m = monthNameOrNum;
  if (isNaN(m)) m = monthMap[String(m).toLowerCase()];
  else m = String(m).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

function extractDates(text) {
  const dates = [];
  let match;
  DATE_MDYYYY.lastIndex = 0;
  while ((match = DATE_MDYYYY.exec(text)) !== null) {
    const [, month, day, year] = match;
    dates.push({ iso: toISO(year, month, day), raw: match[0], index: match.index });
  }
  DATE_DMY.lastIndex = 0;
  while ((match = DATE_DMY.exec(text)) !== null) {
    const [raw, d, m, y] = match;
    const year = y.length === 2 ? `20${y}` : y;
    const iso = `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    dates.push({ iso, raw, index: match.index });
  }
  return dates.sort((a, b) => a.index - b.index);
}

function detectType(line) {
  for (const [type, rx] of Object.entries(KEYWORDS)) {
    if (rx.test(line)) return type;
  }
  return 'academic';
}

async function run() {
  const filePath = path.join(process.cwd(), 'Sample-Academic-Calendar-Document.txt');
  if (!fs.existsSync(filePath)) {
    console.error('❌ Sample file not found:', filePath);
    process.exit(1);
  }
  const text = fs.readFileSync(filePath, 'utf8');
  const lines = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);

  // Build candidate events by scanning lines that include dates
  const candidateEvents = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const ctx = [lines[i-1] || '', line, lines[i+1] || ''].join(' ');
    const dates = extractDates(ctx);
    if (dates.length === 0) continue;

    const type = detectType(ctx);
    // If range "from X to Y" present, keep two dates, otherwise first date
    let titleBase = line.replace(/[:]+\s*$/, '').slice(0, 120);

    if (/from\s+.+?\s+to\s+.+?(\.|$)/i.test(ctx) && dates.length >= 2) {
      candidateEvents.push({ title: `${titleBase} (Starts)`, date: dates[0].iso, type });
      candidateEvents.push({ title: `${titleBase} (Ends)`, date: dates[1].iso, type });
    } else {
      candidateEvents.push({ title: titleBase, date: dates[0].iso, type });
    }
  }

  // Heuristic de-dupe by (title,date)
  const unique = [];
  const seen = new Set();
  for (const ev of candidateEvents) {
    const key = `${ev.title}|${ev.date}`;
    if (!seen.has(key)) { seen.add(key); unique.push(ev); }
  }

  console.log(`📄 Candidate events found: ${unique.length}`);
  unique.forEach(e => console.log(`  - ${e.date} :: ${e.title} [${e.type}]`));

  // Insert into SQLite
  const dbPath = path.join(process.cwd(), 'database', 'vtu_gpt.db');
  const db = await open({ filename: dbPath, driver: sqlite3.Database });

  await db.exec(`CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(500) NOT NULL,
    date DATE NOT NULL,
    source_file VARCHAR(255) NOT NULL,
    event_type VARCHAR(100) DEFAULT 'general',
    description TEXT,
    extracted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );`);

  let stored = 0, skipped = 0;
  for (const e of unique) {
    const exists = await db.get(
      `SELECT id FROM events WHERE is_active = 1 AND title = ? AND date = ? AND source_file = ?`,
      [e.title, e.date, 'Sample-Academic-Calendar-Document.txt']
    );
    if (exists) { skipped++; continue; }
    await db.run(
      `INSERT INTO events (title, date, source_file, event_type, description, is_active) VALUES (?, ?, ?, ?, ?, 1)`,
      [e.title, e.date, 'Sample-Academic-Calendar-Document.txt', e.type, 'Auto-ingested from TXT']
    );
    stored++;
  }

  console.log(`✅ Stored ${stored} events (skipped ${skipped} duplicates)`);
  await db.close();
}

run().catch(err => { console.error('❌ Error:', err); process.exit(1); });
