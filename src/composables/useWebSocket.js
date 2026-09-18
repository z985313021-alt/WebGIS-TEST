// WebSocket 实时连接：自动鉴权 + 重连 + 事件订阅
import { ref, onUnmounted } from 'vue';

const WS_BASE = (() => {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${location.host}/ws`;
})();

/** @type {WebSocket | null} */
let ws = null;
let reconnectTimer = null;
let manualClose = false;

/** 响应式状态 */
export const wsConnected = ref(false);
export const wsLastEvent = ref(null);

const listeners = new Map();   // type => Set<fn>

function connect() {
  const token = localStorage.getItem('webgis_token');
  if (!token) return;   // 未登录不连

  ws = new WebSocket(`${WS_BASE}?token=${encodeURIComponent(token)}`);

  ws.onopen = () => { wsConnected.value = true; clearTimeout(reconnectTimer); };
  ws.onclose = () => {
    wsConnected.value = false;
    if (!manualClose) {
      // 断线自动重连（5 秒后）
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(connect, 5000);
    }
  };
  ws.onerror = () => { ws?.close(); };
  ws.onmessage = (evt) => {
    try {
      const msg = JSON.parse(evt.data);
      wsLastEvent.value = msg;
      const fns = listeners.get(msg.type);
      if (fns) fns.forEach((fn) => fn(msg));
      // 通配 '*'
      const all = listeners.get('*');
      if (all) all.forEach((fn) => fn(msg.type, msg.data));
    } catch { /* 忽略非 JSON */ }
  };
}

/** 订阅事件：返回取消订阅函数 */
export function onEvent(type, fn) {
  if (!listeners.has(type)) listeners.set(type, new Set());
  listeners.get(type).add(fn);
  return () => listeners.get(type)?.delete(fn);
}

/** 主动断开 */
export function disconnect() {
  manualClose = true;
  clearTimeout(reconnectTimer);
  ws?.close();
}

// 自动启动（已登录则连）
if (localStorage.getItem('webgis_token')) connect();

// 暴露给登录/登出逻辑调用
export const wsConnect = () => { manualClose = false; connect(); };
export function wsDisconnect() { disconnect(); }

onUnmounted(() => { clearTimeout(reconnectTimer); });
