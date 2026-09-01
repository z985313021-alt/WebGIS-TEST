// T11 点赞/评论数据模块：node:sqlite（Node ≥ 22.5 内置，本机 v25 可用）
// 独立模块：db 初始化 + likes/comments 表的读写，与 HTTP 层分离
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', 'data', 'interact.db');

const db = new DatabaseSync(DB_PATH);
db.exec(`
  CREATE TABLE IF NOT EXISTS likes (
    item_id INTEGER PRIMARY KEY,
    count   INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS comments (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id    INTEGER NOT NULL,
    nickname   TEXT NOT NULL DEFAULT '匿名',
    content    TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );
  CREATE INDEX IF NOT EXISTS idx_comments_item ON comments(item_id);
`);

/** 取某非遗的点赞数（无记录返回 0） */
export function getLikeCount(itemId) {
  const row = db.prepare('SELECT count FROM likes WHERE item_id = ?').get(itemId);
  return row ? row.count : 0;
}

/** 点赞 +1，返回最新点赞数 */
export function addLike(itemId) {
  db.prepare(
    'INSERT INTO likes (item_id, count) VALUES (?, 1) ON CONFLICT(item_id) DO UPDATE SET count = count + 1',
  ).run(itemId);
  return getLikeCount(itemId);
}

/** 取某非遗的全部评论（新→旧） */
export function getComments(itemId) {
  return db
    .prepare('SELECT id, item_id AS itemId, nickname, content, created_at AS createdAt FROM comments WHERE item_id = ? ORDER BY id DESC')
    .all(itemId);
}

/** 新增评论，返回完整评论对象 */
export function addComment(itemId, nickname, content) {
  const nick = String(nickname || '').trim() || '匿名';
  const text = String(content || '').trim();
  if (!text) throw new Error('评论内容不能为空');
  const info = db.prepare('INSERT INTO comments (item_id, nickname, content) VALUES (?, ?, ?)').run(itemId, nick, text);
  const row = db
    .prepare('SELECT id, item_id AS itemId, nickname, content, created_at AS createdAt FROM comments WHERE id = ?')
    .get(info.lastInsertRowid);
  return row;
}
