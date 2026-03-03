-- D1 schema migration: matches existing SQLite schema from server/db/index.js
-- Plus new tables for Cloudflare migration (portfolios, backups)

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
    broker_id TEXT,
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

-- New tables for Cloudflare migration
CREATE TABLE IF NOT EXISTS portfolios (
    user TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE TABLE IF NOT EXISTS backups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user TEXT NOT NULL,
    filename TEXT NOT NULL,
    data TEXT NOT NULL,
    backup_date TEXT NOT NULL,
    backup_time TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_trades_user ON trades(user);
CREATE INDEX IF NOT EXISTS idx_trades_user_symbol ON trades(user, symbol);
CREATE INDEX IF NOT EXISTS idx_open_lots_user_symbol ON open_lots(user, symbol, asset_type);
CREATE INDEX IF NOT EXISTS idx_pnl_records_user ON pnl_records(user);
CREATE INDEX IF NOT EXISTS idx_backups_user ON backups(user);
