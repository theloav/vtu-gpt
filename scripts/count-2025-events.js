// scripts/count-2025-events.js
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function run() {
  const dbPath = path.join(process.cwd(), 'database', 'vtu_gpt.db');
  const db = await open({ filename: dbPath, driver: sqlite3.Database });
  const rows = await db.all(
    `SELECT id, title, date, source_file, event_type
     FROM events
     WHERE is_active = 1 AND source_file = ?
     ORDER BY date ASC`,
    ['Sample-Academic-Calendar-2025.txt']
  );
  console.log('📅 2025 Events in SQLite:', rows);
  console.log('Total:', rows.length);
  await db.close();
}

run().catch(err => { console.error(err); process.exit(1); });
