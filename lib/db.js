// lib/db.js
import { Pool } from 'pg';

let pool;

let _dbInstance; // To hold the singleton db instance

async function initializePostgresPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      console.error('DATABASE_URL environment variable is NOT set during initialization.');
      throw new Error('DATABASE_URL environment variable is not set.');
    }
    console.log('DATABASE_URL is set, attempting to connect.');
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

export async function getDatabase() {
  if (!_dbInstance) {
    const postgresPool = await initializePostgresPool(); // Ensure pool is initialized
    _dbInstance = {
      async query(sql, params = []) {
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
          _dbInstance = null; // Clear instance on end
          console.log('PostgreSQL database pool closed.');
        }
      }
    };
  }
  return _dbInstance;
}
