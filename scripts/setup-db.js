// scripts/setup-db.js
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
  // Read environment variables
  require('dotenv').config({ path: '.env.local' });

  try {
    console.log('🔄 Setting up SQLite database...');

    // Ensure database directory exists
    const dbDir = path.join(__dirname, '..', 'database');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
      console.log('📁 Created database directory');
    }

    // Open SQLite database
    const dbPath = path.join(dbDir, 'vtu_gpt.db');
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    // Read and execute the SQL file
    const sqlPath = path.join(__dirname, 'init-sqlite.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await db.exec(sql);

    console.log('✅ SQLite database setup completed successfully!');
    console.log('📋 Tables created:');
    console.log('   - users (with indexes and triggers)');
    console.log('   - events (Smart Academic Event Calendar)');
    console.log('📍 Database location:', dbPath);

    await db.close();

  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  setupDatabase();
}

module.exports = setupDatabase;
