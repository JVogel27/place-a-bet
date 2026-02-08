import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables before anything else
// This runs when the module is imported, ensuring env vars are available
dotenv.config();

// Get the directory of this file to construct paths relative to the server root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use in-memory database for testing
const DATABASE_URL = process.env.NODE_ENV === 'test'
  ? ':memory:'
  : (process.env.DATABASE_URL || path.join(__dirname, '../../data/place-a-bet.db'));

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
