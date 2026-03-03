/**
 * One-time migration script: Export existing SQLite + JSON data to D1-compatible SQL.
 *
 * Usage:
 *   node scripts/migrate-to-d1.js > migrations/0003_seed_data.sql
 *
 * Requires Node v20 and better-sqlite3 (from server/node_modules).
 */

const Database = require('../server/node_modules/better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', 'server', 'data', 'trades.db');
const dataDir = path.join(__dirname, '..', 'public', 'data');

function escapeSQL(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  return "'" + String(val).replace(/'/g, "''") + "'";
}

function main() {
  const lines = [];

  // --- 1. Export trades ---
  if (fs.existsSync(dbPath)) {
    const db = new Database(dbPath, { readonly: true });

    const trades = db.prepare('SELECT * FROM trades ORDER BY id').all();
    if (trades.length > 0) {
      lines.push('-- Trades');
      for (const t of trades) {
        lines.push(
          `INSERT INTO trades (id, user, trade_date, asset_type, symbol, name, side, price, quantity, fee, tax, notes, broker_id, created_at, updated_at) VALUES (${t.id}, ${escapeSQL(t.user)}, ${escapeSQL(t.trade_date)}, ${escapeSQL(t.asset_type)}, ${escapeSQL(t.symbol)}, ${escapeSQL(t.name)}, ${escapeSQL(t.side)}, ${t.price}, ${t.quantity}, ${t.fee}, ${t.tax}, ${escapeSQL(t.notes)}, ${escapeSQL(t.broker_id)}, ${t.created_at}, ${t.updated_at});`
        );
      }
      lines.push('');
    }

    const pnl = db.prepare('SELECT * FROM pnl_records ORDER BY id').all();
    if (pnl.length > 0) {
      lines.push('-- P&L Records');
      for (const p of pnl) {
        lines.push(
          `INSERT INTO pnl_records (id, user, sell_trade_id, buy_trade_id, symbol, asset_type, matched_qty, buy_price, sell_price, buy_fee, sell_fee, sell_tax, realized_pnl, buy_date, sell_date, created_at) VALUES (${p.id}, ${escapeSQL(p.user)}, ${p.sell_trade_id}, ${p.buy_trade_id}, ${escapeSQL(p.symbol)}, ${escapeSQL(p.asset_type)}, ${p.matched_qty}, ${p.buy_price}, ${p.sell_price}, ${p.buy_fee}, ${p.sell_fee}, ${p.sell_tax}, ${p.realized_pnl}, ${escapeSQL(p.buy_date)}, ${escapeSQL(p.sell_date)}, ${p.created_at});`
        );
      }
      lines.push('');
    }

    const lots = db.prepare('SELECT * FROM open_lots ORDER BY id').all();
    if (lots.length > 0) {
      lines.push('-- Open Lots');
      for (const l of lots) {
        lines.push(
          `INSERT INTO open_lots (id, user, trade_id, symbol, asset_type, remaining_qty, original_qty, price, fee, trade_date) VALUES (${l.id}, ${escapeSQL(l.user)}, ${l.trade_id}, ${escapeSQL(l.symbol)}, ${escapeSQL(l.asset_type)}, ${l.remaining_qty}, ${l.original_qty}, ${l.price}, ${l.fee}, ${escapeSQL(l.trade_date)});`
        );
      }
      lines.push('');
    }

    const settings = db.prepare('SELECT * FROM user_settings').all();
    if (settings.length > 0) {
      lines.push('-- User Settings');
      for (const s of settings) {
        lines.push(
          `INSERT INTO user_settings (user, key, value, updated_at) VALUES (${escapeSQL(s.user)}, ${escapeSQL(s.key)}, ${escapeSQL(s.value)}, ${s.updated_at});`
        );
      }
      lines.push('');
    }

    db.close();
  } else {
    console.error('Warning: trades.db not found at', dbPath);
  }

  // --- 2. Export portfolio JSON files ---
  const jsonFiles = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));
  if (jsonFiles.length > 0) {
    lines.push('-- Portfolio JSON data');
    for (const file of jsonFiles) {
      const user = file.replace('.json', '');
      const data = fs.readFileSync(path.join(dataDir, file), 'utf-8');
      lines.push(
        `INSERT INTO portfolios (user, data, updated_at) VALUES (${escapeSQL(user)}, ${escapeSQL(data)}, ${Date.now()});`
      );
    }
    lines.push('');
  }

  // --- 3. Export backup files ---
  const backupsDir = path.join(dataDir, 'backups');
  if (fs.existsSync(backupsDir)) {
    const users = fs.readdirSync(backupsDir).filter(d =>
      fs.statSync(path.join(backupsDir, d)).isDirectory()
    );
    if (users.length > 0) {
      lines.push('-- Backup data');
      for (const user of users) {
        const userBackupDir = path.join(backupsDir, user);
        const backupFiles = fs.readdirSync(userBackupDir).filter(f => f.endsWith('.json'));
        for (const bf of backupFiles) {
          // Parse filename: {user}_{date}_{time}.json
          const match = bf.match(/^(.+)_(\d{4}-\d{2}-\d{2})_(\d{6})\.json$/);
          if (!match) continue;
          const [, , backupDate, backupTime] = match;
          const data = fs.readFileSync(path.join(userBackupDir, bf), 'utf-8');
          lines.push(
            `INSERT INTO backups (user, filename, data, backup_date, backup_time) VALUES (${escapeSQL(user)}, ${escapeSQL(bf)}, ${escapeSQL(data)}, ${escapeSQL(backupDate)}, ${escapeSQL(backupTime)});`
          );
        }
      }
      lines.push('');
    }
  }

  console.log(lines.join('\n'));
}

main();
