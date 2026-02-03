import Database from 'better-sqlite3';

// Create tables directly in the test database
const createTablesSQL = `
CREATE TABLE IF NOT EXISTS parties (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  name TEXT NOT NULL,
  date TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active' NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS bets (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  party_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  question TEXT NOT NULL,
  created_by TEXT NOT NULL,
  status TEXT DEFAULT 'open' NOT NULL,
  winning_option_id INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (party_id) REFERENCES parties(id) ON UPDATE NO ACTION ON DELETE NO ACTION
);

CREATE TABLE IF NOT EXISTS bet_options (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  bet_id INTEGER NOT NULL,
  label TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (bet_id) REFERENCES bets(id) ON UPDATE NO ACTION ON DELETE NO ACTION
);

CREATE TABLE IF NOT EXISTS wagers (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  bet_id INTEGER NOT NULL,
  option_id INTEGER NOT NULL,
  user_name TEXT NOT NULL,
  amount REAL NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (bet_id) REFERENCES bets(id) ON UPDATE NO ACTION ON DELETE NO ACTION,
  FOREIGN KEY (option_id) REFERENCES bet_options(id) ON UPDATE NO ACTION ON DELETE NO ACTION
);

CREATE TABLE IF NOT EXISTS settlements (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  bet_id INTEGER NOT NULL,
  user_name TEXT NOT NULL,
  total_wagered REAL NOT NULL,
  payout REAL NOT NULL,
  net_win_loss REAL NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (bet_id) REFERENCES bets(id) ON UPDATE NO ACTION ON DELETE NO ACTION
);
`;

// Global setup function (runs once before all tests)
export default function setup() {
  try {
    // Create a new in-memory database connection
    const sqlite = new Database(':memory:');

    // Execute the SQL to create tables
    sqlite.exec(createTablesSQL);

    console.log('✅ Test database initialized');

    // Note: We can't return the sqlite instance here because globalSetup runs in a separate context
    // The db/index.ts will create its own in-memory connection per test worker
  } catch (error) {
    console.error('❌ Failed to initialize test database:', error);
    throw error;
  }
}
