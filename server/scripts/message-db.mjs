// 私聊消息存储
// 与 shop.db 同库（users 表在此）
import { DatabaseSync } from 'node:sqlite';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', 'data', 'users.db');
let db = null;
function getDb() { if (!db) db = new DatabaseSync(DB_PATH); return db; }

export function initMessageDb() {
  getDb().exec(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_user_id INTEGER NOT NULL,
    to_user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    read_at TEXT
  )`);
  getDb().exec('CREATE INDEX IF NOT EXISTS idx_msg_pair ON messages(from_user_id, to_user_id)');
  getDb().exec('CREATE INDEX IF NOT EXISTS idx_msg_to ON messages(to_user_id)');
}

export function sendMessage(fromId, toId, content) {
  const db = getDb();
  const info = db.prepare('INSERT INTO messages (from_user_id, to_user_id, content) VALUES (?, ?, ?)').run(fromId, toId, String(content).slice(0, 2000));
  return { id: info.lastInsertRowid, from: fromId, to: toId, content, ts: Date.now() };
}

export function getConversation(userA, userB, limit = 50) {
  const rows = getDb().prepare('SELECT * FROM messages WHERE (from_user_id=? AND to_user_id=?) OR (from_user_id=? AND to_user_id=?) ORDER BY id DESC LIMIT ?').all(userA, userB, userB, userA, limit).reverse();
  const users = new Map(getDb().prepare('SELECT id, username FROM users').all().map((u) => [u.id, u.username]));
  return rows.map((r) => ({ ...r, fromName: users.get(r.from_user_id) || '未知' }));
}

export function getUnread(userId) {
  return getDb().prepare('SELECT from_user_id, COUNT(*) cnt FROM messages WHERE to_user_id=? AND read_at IS NULL GROUP BY from_user_id').all(userId);
}

export function markRead(fromId, toId) {
  getDb().prepare("UPDATE messages SET read_at=datetime('now','localtime') WHERE from_user_id=? AND to_user_id=? AND read_at IS NULL").run(fromId, toId);
}

export function markAllRead(userId) {
  getDb().prepare("UPDATE messages SET read_at=datetime('now','localtime') WHERE to_user_id=? AND read_at IS NULL").run(userId);
}

initMessageDb();
