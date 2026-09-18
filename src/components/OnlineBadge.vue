<template>
  <div class="online-badge" :class="{ live: wsConnected }" :title="wsConnected ? 'WebSocket 已连接 · ' + total + '人在线' : '连接中...'">
    <span class="dot"></span>
    <span class="txt">{{ wsConnected ? total + '人在线' : '连接中' }}</span>
    <span v-if="wsConnected && redisOk" class="redis" title="Redis 已连接">⚡</span>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { wsConnected } from '@/composables/useWebSocket';

const total = ref(0);
const redisOk = ref(false);
let timer = null;

async function fetchStats() {
  try {
    const j = await fetch('/api/ws/stats').then((r) => r.json());
    total.value = j?.total || 0;
    redisOk.value = !!j?.redis;
  } catch {}
}

onMounted(() => {
  fetchStats();
  timer = setInterval(fetchStats, 8_000);
});
onUnmounted(() => clearInterval(timer));
</script>

<style scoped>
.online-badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 999px; background: #f5efe0; border: 1px solid #e6ddcc; font-size: 11px; font-family: var(--zi-font-sans); transition: all .3s; cursor: default; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.online-badge.live { background: #e8f5e9; border-color: #a5d6a7; }
.dot { width: 7px; height: 7px; border-radius: 50%; background: #b0a090; transition: .3s; }
.live .dot { background: #388e3c; box-shadow: 0 0 6px #4caf50; animation: pulse 2s infinite; }
.txt { color: #6d4c2a; font-weight: 600; }
.live .txt { color: #2e7d32; }
.redis { font-size: 10px; }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
</style>
