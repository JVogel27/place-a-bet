import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get the directory of this file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Construct paths relative to the server directory
const DATABASE_URL = process.env.DATABASE_URL || join(__dirname, '../../data/place-a-bet.db');
const MIGRATIONS_FOLDER = process.env.MIGRATIONS_FOLDER || join(__dirname, '../../drizzle');

console.log(`Database path: ${DATABASE_URL}`);
console.log(`Migrations folder: ${MIGRATIONS_FOLDER}`);

// Ensure data directory exists
const dbDir = dirname(DATABASE_URL);
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
  console.log(`Created database directory: ${dbDir}`);
}

// Create database connection
const sqlite = new Database(DATABASE_URL);
sqlite.pragma('journal_mode = WAL');

const db = drizzle(sqlite);

console.log('Running migrations...');

try {
  migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  console.log('✅ Migrations completed successfully!');
} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
} finally {
  sqlite.close();
}
