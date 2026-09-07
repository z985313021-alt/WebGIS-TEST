// 用户个人资料 & 收货地址簿数据模块：node:sqlite
// 独立于既有登录/购物模块，仅扩展 users 资料字段与新增 addresses 表。
// 与 HTTP 分离；校验规则集中于此。
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', 'data', 'users.db');

const db = new DatabaseSync(DB_PATH);

// 兼容旧库：users 追加可选资料列（已存在则忽略）
for (const [col, ddl] of [
  ['nickname', 'TEXT DEFAULT \'\''],
  ['phone', 'TEXT DEFAULT \'\''],
  ['avatar_url', 'TEXT DEFAULT \'\''],
]) {
  try { db.exec(`ALTER TABLE users ADD COLUMN ${col} ${ddl};`); } catch (e) { /* 已存在则忽略 */ }
}

// 收货地址簿
db.exec(`
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS addresses (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL,
    receiver   TEXT NOT NULL,
    phone      TEXT NOT NULL,
    region     TEXT DEFAULT '',
    detail     TEXT NOT NULL,
    is_default INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

const PHONE_RE = /^1[3-9]\d{9}$/;
const NAME_RE = /^[\u4e00-\u9fa5a-zA-Z ·]{1,30}$/;

/** 公开的用户资料行（不含密码哈希/会话） */
export function getPublicUser(id) {
  const row = db
    .prepare(`SELECT id, username, email, role, nickname, phone, avatar_url AS avatarUrl,
                     created_at AS createdAt FROM users WHERE id = ?`)
    .get(Number(id));
  return row;
}

/** 更新资料（nickname / phone / avatarUrl 均可选，只更新传入项） */
export function updateUserProfile(userId, patch = {}) {
  const curr = getPublicUser(userId);
  if (!curr) throw new Error('用户不存在');

  const out = {};
  const set = [];
  const vals = [];
  if (patch.nickname !== undefined) {
    const nick = String(patch.nickname).trim();
    if (nick && nick.length > 30) throw new Error('昵称最多 30 字');
    if (!/^[\u4e00-\u9fa5a-zA-Z0-9_ .·-]{1,30}$/.test(nick) && nick !== '') {
      throw new Error('昵称含非法字符（仅支持中文、字母、数字、_ . -）');
    }
    set.push('nickname = ?'); vals.push(nick); out.nickname = nick;
  }
  if (patch.phone !== undefined) {
    const phone = String(patch.phone).trim();
    if (phone && !PHONE_RE.test(phone)) throw new Error('请输入正确的 11 位手机号');
    set.push('phone = ?'); vals.push(phone); out.phone = phone;
  }
  if (patch.avatarUrl !== undefined) {
    const url = String(patch.avatarUrl).trim();
    if (url.length > 500) throw new Error('头像地址过长');
    set.push('avatar_url = ?'); vals.push(url); out.avatarUrl = url;
  }
  if (set.length === 0) return getPublicUser(userId);

  vals.push(Number(userId));
  db.prepare(`UPDATE users SET ${set.join(', ')} WHERE id = ?`).run(...vals);
  return getPublicUser(userId);
}

/** ---------- 收货地址簿 ---------- */
function emptyDefaultFor(userId) {
  db.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ? AND is_default = 1').run(Number(userId));
}

export function listAddresses(userId) {
  return db
    .prepare(`SELECT id, receiver, phone, region, detail, is_default AS isDefault,
                     created_at AS createdAt FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC`)
    .all(Number(userId));
}

export function createAddress(userId, { receiver, phone, region, detail, isDefault = false }) {
  const name = String(receiver ?? '').trim();
  const hp = String(phone ?? '').trim();
  const reg = String(region ?? '').trim();
  const det = String(detail ?? '').trim();
  if (!NAME_RE.test(name)) throw new Error('请填写正确的收货人姓名');
  if (!PHONE_RE.test(hp)) throw new Error('请输入正确的 11 位手机号');
  if (!reg) throw new Error('请选择所在地区');
  if (det.length < 5) throw new Error('请填写详细地址（不少于 5 字）');

  if (isDefault) emptyDefaultFor(userId);
  const info = db
    .prepare(`INSERT INTO addresses (user_id, receiver, phone, region, detail, is_default)
              VALUES (?, ?, ?, ?, ?, ?)`)
    .run(Number(userId), name, hp, reg, det, isDefault ? 1 : 0);
  return {
    id: Number(info.lastInsertRowid), receiver: name, phone: hp, region: reg, detail: det,
    isDefault: !!isDefault,
    createdAt: null,
  };
}

function owned(id) {
  return db.prepare('SELECT * FROM addresses WHERE id = ?').get(Number(id));
}

export function findAddress(id) { return owned(id); }

export function updateAddress(userId, id, { receiver, phone, region, detail, isDefault }) {
  const row = owned(id);
  if (!row || row.user_id !== Number(userId)) throw new Error('地址不存在');
  const na = {
    receiver: receiver !== undefined ? String(receiver).trim() : row.receiver,
    phone: phone !== undefined ? String(phone).trim() : row.phone,
    region: region !== undefined ? String(region).trim() : row.region,
    detail: detail !== undefined ? String(detail).trim() : row.detail,
  };
  if (!NAME_RE.test(na.receiver)) throw new Error('请填写正确的收货人姓名');
  if (!PHONE_RE.test(na.phone)) throw new Error('请输入正确的 11 位手机号');
  if (!na.region) throw new Error('请选择所在地区');
  if (!na.detail) throw new Error('请填写详细地址');
  if (na.detail.length > 100) throw new Error('详细地址请控制在 100 字以内');

  const def = isDefault === undefined ? !!row.is_default : !!isDefault;
  if (def) emptyDefaultFor(userId);

  db.prepare(`UPDATE addresses SET receiver = ?, phone = ?, region = ?, detail = ?, is_default = ?
              WHERE id = ?`).run(na.receiver, na.phone, na.region, na.detail, def ? 1 : 0, Number(id));
  let r = listAddresses(userId).find((a) => a.id === Number(id));
  return r;
}

export function setDefaultAddress(userId, id) {
  const row = owned(id);
  if (!row || row.user_id !== Number(userId)) throw new Error('地址不存在');
  emptyDefaultFor(userId);
  db.prepare('UPDATE addresses SET is_default = 1 WHERE id = ?').run(Number(id));
  return listAddresses(userId);
}

export function deleteAddress(userId, id) {
  const row = owned(id);
  if (!row || row.user_id !== Number(userId)) throw new Error('地址不存在');
  const wasDefault = !!row.is_default;
  db.prepare('DELETE FROM addresses WHERE id = ?').run(Number(id));
  if (wasDefault) {
    const first = db.prepare('SELECT id FROM addresses WHERE user_id = ? ORDER BY id LIMIT 1').get(Number(userId));
    if (first) db.prepare('UPDATE addresses SET is_default = 1 WHERE id = ?').run(first.id);
  }
  return listAddresses(userId);
}
