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
    role          TEXT NOT NULL DEFAULT 'user',
    created_at    TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );
`);
// 兼容旧库：补 role 列（若已存在则忽略）
try { db.exec(`ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user';`); } catch (e) { /* ignore */ }
// 会话表：登录 token
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    token      TEXT PRIMARY KEY,
    user_id    INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
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
  if (pwd.length < 6 || !/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d_@#$%&*]{6,20}$/.test(pwd)) {
    throw new Error('密码需 6-20 位，且需同时包含字母与数字');
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
    .prepare('SELECT id, username, email, role, created_at AS createdAt FROM users WHERE id = ?')
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

// ============ 登录 / 会话（token） ============

/** 密码校验函数导出别名（供鉴权复用） */
/** 生成新登录会话 token，返回 { token, user }；便于匿名引用 */
export function loginUser(account, password) {
  const user = findUserWithPassword(account);
  if (!user) {
    const err = new Error('用户名或密码不正确');
    err.code = 'BAD_CREDENTIALS';
    throw err;
  }
  if (!verifyPassword(String(password || ''), user.password_hash)) {
    const err = new Error('用户名或密码不正确');
    err.code = 'BAD_CREDENTIALS';
    throw err;
  }
  const token = randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions (token, user_id) VALUES (?, ?)').run(token, user.id);
  const pub = getUserById(user.id);
  pub.role = user.role;
  return { token, user: pub };
}

/** 根据 token 解析用户（不含密码哈希）；无效/不存在则返回 null */
export function getUserByToken(token) {
  const key = String(token || '').trim();
  if (!key) return null;
  const row = db
    .prepare('SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?')
    .get(key);
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    role: row.role,
    createdAt: row.created_at,
  };
}

/** 清除某 token 的会话（退出登录） */
export function logoutByToken(token) {
  const key = String(token || '').trim();
  if (!key) return;
  db.prepare('DELETE FROM sessions WHERE token = ?').run(key);
}

/** 设置用户角色（仅 admin 调用） */
export function setUserRole(userId, role) {
  const r = String(role || 'user');
  if (!['user', 'admin'].includes(r)) throw new Error('非法角色');
  const info = db.prepare('UPDATE users SET role = ? WHERE id = ?').run(r, Number(userId));
  if (!info.changes) throw new Error('用户不存在');
  return getUserById(Number(userId));
}

/** 保存一个新用户对象（用于引导创建 admin 测试账号） */
export function ensureAdmin(username, email, password) {
  if (!isUsernameTaken(username) && !isEmailTaken(email)) {
    const user = registerUser(username, email, password);
    const promo = setUserRole(user.id, 'admin');
    return { created: true, user: promo };
  }
  const existing = findUserWithPassword(username);
  if (existing && existing.role === 'admin') return { created: false, user: getUserById(existing.id) };
  const promo = setUserRole(existing.id, 'admin');
  return { created: false, user: promo };
}

/** admin 可用的用户列表（不含密码哈希） */
export function listUsers() {
  return db
    .prepare('SELECT id, username, email, role, created_at AS createdAt FROM users ORDER BY id')
    .all();
}

/** 直接重设密码哈希（改密用） */
export function rehashPassword(userId, newPassword) {
  const pwd = String(newPassword || '');
  if (pwd.length < 6 || !/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d_@#$%&*]{6,20}$/.test(pwd)) throw new Error('新密码需 6-20 位，且需同时包含字母与数字');
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(pwd), Number(userId));
  return getUserById(Number(userId));
}

