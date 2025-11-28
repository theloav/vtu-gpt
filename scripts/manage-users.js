// scripts/manage-users.js
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const bcrypt = require('bcryptjs');
const readline = require('readline');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

let db = null;

async function getDatabase() {
  if (!db) {
    const dbPath = path.join(__dirname, '..', 'database', 'vtu_gpt.db');
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
  }
  return db;
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function listUsers() {
  try {
    const database = await getDatabase();
    const users = await database.all(`
      SELECT id, email, is_verified, created_at
      FROM users
      ORDER BY created_at DESC
    `);

    console.log('\n📋 All Users:');
    console.log('ID | Email | Verified | Created');
    console.log('---|-------|----------|--------');

    users.forEach(user => {
      const verified = user.is_verified ? '✅' : '❌';
      const date = new Date(user.created_at).toLocaleDateString();
      console.log(`${user.id} | ${user.email} | ${verified} | ${date}`);
    });

    console.log(`\nTotal users: ${users.length}`);
  } catch (error) {
    console.error('Error listing users:', error.message);
  }
}

async function addUser() {
  try {
    const email = await question('Enter email (@veltech.edu.in): ');

    if (!email.endsWith('@veltech.edu.in')) {
      console.log('❌ Email must end with @veltech.edu.in');
      return;
    }

    const password = await question('Enter password: ');
    const verified = await question('Mark as verified? (y/n): ');

    const hashedPassword = await bcrypt.hash(password, 12);
    const isVerified = verified.toLowerCase() === 'y';

    const database = await getDatabase();
    const result = await database.run(`
      INSERT INTO users (email, password_hash, is_verified)
      VALUES (?, ?, ?)
    `, [email, hashedPassword, isVerified]);

    const newUser = await database.get('SELECT id, email FROM users WHERE id = ?', [result.lastID]);
    console.log(`✅ User created: ${newUser.email} (ID: ${newUser.id})`);
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      console.log('❌ User with this email already exists');
    } else {
      console.error('Error adding user:', error.message);
    }
  }
}

async function deleteUser() {
  try {
    const email = await question('Enter email to delete: ');

    const database = await getDatabase();
    const user = await database.get('SELECT email FROM users WHERE email = ?', [email]);

    if (user) {
      await database.run('DELETE FROM users WHERE email = ?', [email]);
      console.log(`✅ User deleted: ${user.email}`);
    } else {
      console.log('❌ User not found');
    }
  } catch (error) {
    console.error('Error deleting user:', error.message);
  }
}

async function verifyUser() {
  try {
    const email = await question('Enter email to verify: ');

    const database = await getDatabase();
    const user = await database.get('SELECT email FROM users WHERE email = ?', [email]);

    if (user) {
      await database.run(`
        UPDATE users
        SET is_verified = 1, verification_token = null, verification_token_expires = null
        WHERE email = ?
      `, [email]);
      console.log(`✅ User verified: ${user.email}`);
    } else {
      console.log('❌ User not found');
    }
  } catch (error) {
    console.error('Error verifying user:', error.message);
  }
}

async function showUnverified() {
  try {
    const database = await getDatabase();
    const users = await database.all(`
      SELECT email, created_at
      FROM users
      WHERE is_verified = 0
      ORDER BY created_at DESC
    `);

    console.log('\n📋 Unverified Users:');
    if (users.length === 0) {
      console.log('No unverified users found.');
      return;
    }

    users.forEach(user => {
      const date = new Date(user.created_at).toLocaleDateString();
      console.log(`- ${user.email} (${date})`);
    });
  } catch (error) {
    console.error('Error listing unverified users:', error.message);
  }
}

async function main() {
  console.log('🔧 VTU-GPT User Management Tool\n');

  while (true) {
    console.log('\nChoose an option:');
    console.log('1. List all users');
    console.log('2. Add new user');
    console.log('3. Delete user');
    console.log('4. Verify user email');
    console.log('5. Show unverified users');
    console.log('6. Exit');

    const choice = await question('\nEnter your choice (1-6): ');

    switch (choice) {
      case '1':
        await listUsers();
        break;
      case '2':
        await addUser();
        break;
      case '3':
        await deleteUser();
        break;
      case '4':
        await verifyUser();
        break;
      case '5':
        await showUnverified();
        break;
      case '6':
        console.log('👋 Goodbye!');
        rl.close();
        if (db) await db.close();
        process.exit(0);
      default:
        console.log('❌ Invalid choice. Please enter 1-6.');
    }
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { listUsers, addUser, deleteUser, verifyUser };
