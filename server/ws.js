// WebSocket 实时通知服务：订单全生命周期的事件推送
// - 用户下单 / 付款 / 取消 → 通知所有在线管理员
// - 管理员发货 / 用户确认收货 → 通知订单归属用户
import { WebSocketServer } from 'ws';
import { getUserByToken } from './scripts/user-db.mjs';

/** @type {WebSocketServer} */
let wss = null;

// 连接注册表：userId → Set<WebSocket>（一个用户可能多端登录）
const userConns = new Map();
// 管理员连接集合（role === 'admin' 的连接）
const adminConns = new Set();

/**
 * 将 WebSocket 服务挂载到现有 HTTP 服务器。
 * 客户端通过 ws://host:port/?token=xxx 建立连接，服务器校验 token 后注册。
 * @param {import('http').Server} server
 */
export function attachWebSocket(server) {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    // 1) 握手鉴权：从 URL query 取 token
    const url = new URL(req.url, 'http://localhost');
    const token = url.searchParams.get('token') || '';
    const user = token ? getUserByToken(token) : null;

    if (!user) {
      ws.send(JSON.stringify({ type: 'error', msg: '未授权，请重新登录' }));
      ws.close(4001, 'unauthorized');
      return;
    }

    // 2) 注册连接
    ws._userId = user.id;
    ws._role = user.role;
    if (!userConns.has(user.id)) userConns.set(user.id, new Set());
    userConns.get(user.id).add(ws);
    if (user.role === 'admin') adminConns.add(ws);

    // 3) 欢迎消息
    ws.send(JSON.stringify({
      type: 'connected',
      user: { id: user.id, username: user.username, role: user.role },
      ts: Date.now(),
    }));

    ws.on('close', () => {
      userConns.get(user.id)?.delete(ws);
      if (userConns.get(user.id)?.size === 0) userConns.delete(user.id);
      adminConns.delete(ws);
    });

    ws.on('error', () => { /* 忽略，close 会清理 */ });

    // 心跳检测：每 30s ping，超时无 pong 则断开
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });
  });

  // 心跳定时器：60s 一次，清理死连接
  const heartbeat = setInterval(() => {
    if (!wss) return;
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) return ws.terminate();
      ws.isAlive = false;
      try { ws.ping(); } catch {}
    });
  }, 60_000);

  wss.on('close', () => clearInterval(heartbeat));

  return wss;
}

/**
 * 通知所有在线管理员。
 * @param {string} type   事件类型，如 'order:created'
 * @param {any} data      附加数据
 */
export function notifyAdmins(type, data) {
  if (!wss) return;
  const payload = JSON.stringify({ type, data, ts: Date.now() });
  for (const ws of adminConns) {
    if (ws.readyState === 1) ws.send(payload);   // 1 === OPEN
  }
}

/**
 * 通知指定用户（所有该用户的在线连接）。
 * @param {number} userId  用户 ID
 * @param {string} type    事件类型
 * @param {any} data       附加数据
 */
export function notifyUser(userId, type, data) {
  if (!wss) return;
  const conns = userConns.get(userId);
  if (!conns) return;
  const payload = JSON.stringify({ type, data, ts: Date.now() });
  for (const ws of conns) {
    if (ws.readyState === 1) ws.send(payload);
  }
}

/** 当前在线统计（供管理面板用） */
export function stats() {
  return { total: wss?.clients?.size ?? 0, admins: adminConns.size, users: userConns.size };
}
