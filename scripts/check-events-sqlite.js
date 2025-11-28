// scripts/check-events-sqlite.js
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function run() {
  const dbPath = path.join(process.cwd(), 'database', 'vtu_gpt.db');
  const db = await open({ filename: dbPath, driver: sqlite3.Database });
  const rows = await db.all('SELECT id, title, date, source_file, event_type FROM events WHERE is_active = 1 ORDER BY date ASC');
  console.log('📅 Events in SQLite:', rows);
  console.log('Total:', rows.length);
  await db.close();
}

run().catch(err => { console.error(err); process.exit(1); });
