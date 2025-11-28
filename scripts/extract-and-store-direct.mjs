// scripts/extract-and-store-direct.mjs
import fs from 'fs';
import path from 'path';
import eventExtractor from '../lib/eventExtractor.js';
const { extractDatesAndEvents } = eventExtractor;
import dbModule from '../lib/db.js';
const { getDatabase } = dbModule;

async function run() {
  console.log('🔄 Direct extraction and storage test...');
  const filePath = path.join(process.cwd(), 'Sample-Academic-Calendar-Document.txt');
  const text = fs.readFileSync(filePath, 'utf8');
  
  const events = extractDatesAndEvents(text, 'Sample-Academic-Calendar-Document.txt');
  console.log(`📊 Extracted ${events.length} events`);
  
  if (events.length === 0) {
    console.log('❌ No events extracted, aborting storage');
    process.exit(1);
  }
  
  const db = await getDatabase();
  let stored = 0;
  for (const e of events) {
    await db.run(
      `INSERT INTO events (title, date, source_file, event_type, description, is_active) VALUES (?, ?, ?, ?, ?, 1)`,
      [e.title, e.date, e.sourceFile, e.eventType || 'general', e.description || '']
    );
    stored++;
  }
  console.log(`✅ Stored ${stored} events in SQLite`);
}

run().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
