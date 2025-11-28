// lib/db.js
import { Pool } from 'pg';

let pool;

async function getPostgresPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set.');
    }
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false // Required for Supabase in some environments, adjust as needed for production
      }
    });

    // Test the connection
    try {
      await pool.query('SELECT 1');
      console.log('Successfully connected to PostgreSQL database.');
    } catch (error) {
      console.error('Failed to connect to PostgreSQL database:', error);
      throw error;
    }
  }
  return pool;
}

const db = {
  async query(sql, params = []) {
    const postgresPool = await getPostgresPool();
    try {
      const result = await postgresPool.query(sql, params);
      return result; // pg's result object already has rows, rowCount, etc.
    } catch (error) {
      console.error('Database query failed:', error);
      throw error;
    }
  },

  async end() {
    if (pool) {
      await pool.end();
      pool = null;
      console.log('PostgreSQL database pool closed.');
    }
  }
};

export default db;
