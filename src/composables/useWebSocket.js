// WebSocket 实时连接（window 事件总线，确保全局唯一投递）
import { ref, onUnmounted } from 'vue';

const WS_BASE = (() => {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${location.host}/ws`;
})();

let ws = null;
let reconnectTimer = null;
let manualClose = false;

export const wsConnected = ref(false);
export const wsLastEvent = ref(null);

/** 订阅事件（走 window 事件总线，全局唯一） */
export function onEvent(type, fn) {
  const handler = (e) => {
    const msg = e.detail;
    if (!msg) return;
    if (type === '*') fn(msg.type, msg.data);
    else if (msg.type === type) fn(msg);
  };
  window.addEventListener('ws-event', handler);
  return () => window.removeEventListener('ws-event', handler);
}

function connect() {
  const token = localStorage.getItem('webgis_token');
  if (!token) return;

  ws = new WebSocket(`${WS_BASE}?token=${encodeURIComponent(token)}`);

  ws.onopen = () => { wsConnected.value = true; clearTimeout(reconnectTimer); };
  ws.onclose = () => {
    wsConnected.value = false;
    if (!manualClose) { clearTimeout(reconnectTimer); reconnectTimer = setTimeout(connect, 5000); }
  };
  ws.onerror = () => ws?.close();
  ws.onmessage = (evt) => {
    try {
      const msg = JSON.parse(evt.data);
      wsLastEvent.value = msg;
      // 唯一投递通道：window 事件总线
      window.dispatchEvent(new CustomEvent('ws-event', { detail: msg }));
    } catch { /* ignore */ }
  };
}

export function disconnect() { manualClose = true; clearTimeout(reconnectTimer); ws?.close(); }
export const wsConnect = () => { manualClose = false; connect(); };
export function wsDisconnect() { disconnect(); }

if (localStorage.getItem('webgis_token')) connect();
onUnmounted(() => clearTimeout(reconnectTimer));
