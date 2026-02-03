import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const DATABASE_URL = process.env.DATABASE_URL || './data/place-a-bet.db';

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
  migrate(db, { migrationsFolder: './drizzle' });
  console.log('✅ Migrations completed successfully!');
} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
} finally {
  sqlite.close();
}
