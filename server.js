const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 8787;
const DB_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DB_DIR, 'content-studio.db');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  date_key TEXT NOT NULL,
  account TEXT NOT NULL,
  platform TEXT NOT NULL,
  content TEXT NOT NULL,
  created TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_posts_user_date ON posts(user_id, date_key);
`);

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(__dirname));

function normalizeUserId(rawValue) {
  const value = (rawValue || '').trim().toLowerCase();
  return value.replace(/[^a-z0-9_-]/g, '').slice(0, 64);
}

function requireUser(req, res, next) {
  const userId = normalizeUserId(req.header('x-user-id') || req.query.userId || req.body?.userId);
  if (!userId) {
    return res.status(400).json({ error: { message: 'Missing user ID. Provide x-user-id header.' } });
  }

  db.prepare('INSERT OR IGNORE INTO users (id) VALUES (?)').run(userId);
  req.userId = userId;
  return next();
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, storage: 'sqlite', dbPath: DB_PATH });
});

app.get('/api/posts', requireUser, (req, res) => {
  const rows = db.prepare(
    'SELECT date_key, account, platform, content, created FROM posts WHERE user_id = ? ORDER BY created DESC'
  ).all(req.userId);

  const grouped = {};
  for (const row of rows) {
    if (!grouped[row.date_key]) grouped[row.date_key] = [];
    grouped[row.date_key].push({
      account: row.account,
      platform: row.platform,
      content: row.content,
      created: row.created
    });
  }

  res.json({ userId: req.userId, posts: grouped, count: rows.length });
});

app.put('/api/posts', requireUser, (req, res) => {
  const payload = req.body?.posts;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return res.status(400).json({ error: { message: 'Invalid posts payload.' } });
  }

  const clearStmt = db.prepare('DELETE FROM posts WHERE user_id = ?');
  const insertStmt = db.prepare(
    'INSERT INTO posts (user_id, date_key, account, platform, content, created) VALUES (?, ?, ?, ?, ?, ?)'
  );

  const tx = db.transaction((userId, postsByDate) => {
    clearStmt.run(userId);
    for (const [dateKey, list] of Object.entries(postsByDate)) {
      if (!Array.isArray(list)) continue;
      for (const item of list) {
        if (!item || typeof item !== 'object') continue;
        const account = String(item.account || '').trim();
        const platform = String(item.platform || '').trim();
        const content = String(item.content || '').trim();
        if (!account || !platform || !content) continue;
        insertStmt.run(userId, dateKey, account, platform, content, item.created || new Date().toISOString());
      }
    }
  });

  tx(req.userId, payload);
  return res.json({ ok: true });
});

app.get('/api/backup/export', requireUser, (req, res) => {
  const rows = db.prepare(
    'SELECT date_key, account, platform, content, created FROM posts WHERE user_id = ? ORDER BY date_key ASC, created ASC'
  ).all(req.userId);

  const posts = {};
  for (const row of rows) {
    if (!posts[row.date_key]) posts[row.date_key] = [];
    posts[row.date_key].push({
      account: row.account,
      platform: row.platform,
      content: row.content,
      created: row.created
    });
  }

  res.json({
    version: 1,
    userId: req.userId,
    exportedAt: new Date().toISOString(),
    posts
  });
});

app.post('/api/backup/import', requireUser, (req, res) => {
  const payload = req.body?.posts;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return res.status(400).json({ error: { message: 'Invalid import payload.' } });
  }

  const clearStmt = db.prepare('DELETE FROM posts WHERE user_id = ?');
  const insertStmt = db.prepare(
    'INSERT INTO posts (user_id, date_key, account, platform, content, created) VALUES (?, ?, ?, ?, ?, ?)'
  );

  const tx = db.transaction((userId, postsByDate) => {
    clearStmt.run(userId);
    for (const [dateKey, list] of Object.entries(postsByDate)) {
      if (!Array.isArray(list)) continue;
      for (const item of list) {
        if (!item || typeof item !== 'object') continue;
        const account = String(item.account || '').trim();
        const platform = String(item.platform || '').trim();
        const content = String(item.content || '').trim();
        if (!account || !platform || !content) continue;
        insertStmt.run(userId, dateKey, account, platform, content, item.created || new Date().toISOString());
      }
    }
  });

  tx(req.userId, payload);
  return res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Meri Content Studio running on http://localhost:${PORT}`);
});
