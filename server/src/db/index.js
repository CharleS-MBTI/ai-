const Database = require('better-sqlite3');
const path = require('path');
const config = require('../config');

const dbPath = path.resolve(config.db.path);
const dbDir = path.dirname(dbPath);

// 确保数据目录存在
const fs = require('fs');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// 启用WAL模式提升性能
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// 建表
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    openid TEXT UNIQUE NOT NULL,
    nickname TEXT DEFAULT '',
    avatar_url TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS schedules (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT DEFAULT '',
    category TEXT DEFAULT 'general',
    schedule_date TEXT NOT NULL,
    schedule_time TEXT DEFAULT '',
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS suggestions (
    id TEXT PRIMARY KEY,
    schedule_id TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    tips TEXT DEFAULT '[]',
    time_plan TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_schedules_user_date
    ON schedules(user_id, schedule_date);
  CREATE INDEX IF NOT EXISTS idx_suggestions_user
    ON suggestions(user_id);
`);

module.exports = db;
