// 鉴权工具：解析 Bearer token / 当前用户（供 HTTP 与 WebSocket 共用）
import { getUserByToken } from './scripts/user-db.mjs';

/** 从请求头提取 Bearer token */
export function bearerToken(req) {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) return null;
  return h.slice(7).trim();
}

/** 解析当前登录用户；未登录时返回 null */
export function currentUser(req) {
  const token = bearerToken(req);
  return token ? getUserByToken(token) : null;
}
