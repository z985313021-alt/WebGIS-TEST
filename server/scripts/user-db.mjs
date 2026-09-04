// 用户注册数据模块：node:sqlite（Node ≥ 22.5 内置，本机 v24 可用）
// 独立模块：db 初始化 + users 表读写，与 HTTP 层分离
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', 'data', 'users.db');

const db = new DatabaseSync(DB_PATH);
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT NOT NULL UNIQUE,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );
`);

const USERNAME_RE = /^[a-zA-Z0-9_\u4e00-\u9fa5]{2,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 密码加盐哈希（scrypt），返回 "盐:哈希" 字符串 */
function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

/** 校验密码是否匹配存储的哈希 */
function verifyPassword(password, stored) {
  const [salt, hash] = String(stored || '').split(':');
  if (!salt || !hash) return false;
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** 用户名是否已存在 */
export function isUsernameTaken(username) {
  return !!db.prepare('SELECT 1 FROM users WHERE username = ?').get(username);
}

/** 邮箱是否已注册 */
export function isEmailTaken(email) {
  return !!db.prepare('SELECT 1 FROM users WHERE email = ?').get(email);
}

/** 注册新用户，返回不含密码哈希的用户对象 */
export function registerUser(username, email, password) {
  const name = String(username || '').trim();
  const mail = String(email || '').trim().toLowerCase();
  const pwd = String(password || '');

  if (!USERNAME_RE.test(name)) {
    throw new Error('用户名需为 2-20 位字母、数字、下划线或中文');
  }
  if (!EMAIL_RE.test(mail)) {
    throw new Error('邮箱格式不正确');
  }
  if (pwd.length < 6) {
    throw new Error('密码至少 6 位');
  }
  if (isUsernameTaken(name)) {
    throw new Error('用户名已被占用');
  }
  if (isEmailTaken(mail)) {
    throw new Error('该邮箱已注册');
  }

  const info = db
    .prepare('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)')
    .run(name, mail, hashPassword(pwd));
  return getUserById(info.lastInsertRowid);
}

/** 按 id 查询用户（不含密码哈希） */
export function getUserById(id) {
  return db
    .prepare('SELECT id, username, email, created_at AS createdAt FROM users WHERE id = ?')
    .get(id);
}

/** 按用户名或邮箱查询（登录用，含密码哈希，仅后端内部使用） */
export function findUserWithPassword(account) {
  const key = String(account || '').trim();
  return db
    .prepare('SELECT * FROM users WHERE username = ? OR email = ?')
    .get(key, key.toLowerCase());
}

export { verifyPassword };
