import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

// Use in-memory database for testing
const DATABASE_URL = process.env.NODE_ENV === 'test'
  ? ':memory:'
  : (process.env.DATABASE_URL || './data/place-a-bet.db');

// Create SQLite connection
const sqlite = new Database(DATABASE_URL);

// Enable WAL mode for better concurrent access (skip for in-memory)
if (DATABASE_URL !== ':memory:') {
  sqlite.pragma('journal_mode = WAL');
}

// Create drizzle instance
export const db = drizzle(sqlite, { schema });

// Export sqlite instance for direct access if needed
export { sqlite };
