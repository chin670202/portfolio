const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'trades.db');
const db = new Database(dbPath);

// Enable WAL mode and foreign keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables (with user column for per-user isolation)
db.exec(`
  CREATE TABLE IF NOT EXISTS trades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user TEXT NOT NULL,
    trade_date TEXT NOT NULL,
    asset_type TEXT NOT NULL CHECK(asset_type IN ('tw_stock', 'us_stock', 'crypto', 'futures', 'options')),
    symbol TEXT NOT NULL,
    name TEXT,
    side TEXT NOT NULL CHECK(side IN ('buy', 'sell')),
    price REAL NOT NULL,
    quantity REAL NOT NULL,
    fee REAL NOT NULL DEFAULT 0,
    tax REAL NOT NULL DEFAULT 0,
    notes TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
  );

  CREATE TABLE IF NOT EXISTS pnl_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user TEXT NOT NULL,
    sell_trade_id INTEGER NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
    buy_trade_id INTEGER NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    asset_type TEXT NOT NULL,
    matched_qty REAL NOT NULL,
    buy_price REAL NOT NULL,
    sell_price REAL NOT NULL,
    buy_fee REAL NOT NULL DEFAULT 0,
    sell_fee REAL NOT NULL DEFAULT 0,
    sell_tax REAL NOT NULL DEFAULT 0,
    realized_pnl REAL NOT NULL,
    buy_date TEXT NOT NULL,
    sell_date TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
  );

  CREATE TABLE IF NOT EXISTS open_lots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user TEXT NOT NULL,
    trade_id INTEGER NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    asset_type TEXT NOT NULL,
    remaining_qty REAL NOT NULL,
    original_qty REAL NOT NULL,
    price REAL NOT NULL,
    fee REAL NOT NULL DEFAULT 0,
    trade_date TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_trades_user ON trades(user);
  CREATE INDEX IF NOT EXISTS idx_trades_user_symbol ON trades(user, symbol);
  CREATE INDEX IF NOT EXISTS idx_open_lots_user_symbol ON open_lots(user, symbol, asset_type);
  CREATE INDEX IF NOT EXISTS idx_pnl_records_user ON pnl_records(user);

  CREATE TABLE IF NOT EXISTS brokers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    name_en TEXT,
    tw_stock_discount REAL NOT NULL DEFAULT 0.6,
    tw_stock_min_fee REAL NOT NULL DEFAULT 20,
    us_stock_fee_rate REAL,
    us_stock_min_fee REAL,
    notes TEXT,
    sort_order INTEGER NOT NULL DEFAULT 100
  );

  CREATE TABLE IF NOT EXISTS user_settings (
    user TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    PRIMARY KEY (user, key)
  );
`);

// Add broker_id column to trades if it doesn't exist
try {
  db.prepare('SELECT broker_id FROM trades LIMIT 1').get();
} catch {
  db.exec('ALTER TABLE trades ADD COLUMN broker_id TEXT');
}

// Seed brokers on startup
const { seedBrokers } = require('./seed-brokers');
seedBrokers(db);

module.exports = db;
