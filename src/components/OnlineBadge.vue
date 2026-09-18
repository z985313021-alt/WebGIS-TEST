<template>
  <div class="online-badge" :class="{ live: wsConnected }" :title="wsConnected ? 'WebSocket 已连接' : '连接中...'">
    <span class="dot"></span>
    <span class="txt">{{ wsConnected ? '在线' : '连接中' }}</span>
    <span v-if="wsConnected && total > 0" class="cnt">{{ total }}人</span>
    <span v-if="wsConnected" class="redis" :title="redisOk ? 'Redis 已连接' : '内存模式'">●</span>
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
.online-badge { display: flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 999px; background: rgba(0,0,0,0.07); font-size: 12px; font-family: var(--zi-font-sans); }
.dot { width: 7px; height: 7px; border-radius: 50%; background: #ccc; transition: .3s; }
.live .dot { background: #4caf50; box-shadow: 0 0 6px #4caf50; animation: pulse 2s infinite; }
.txt { color: #6d4c2a; }
.live .txt { color: #4caf50; font-weight: 600; }
.cnt { background: #b8352b; color: #fff; border-radius: 999px; padding: 0 6px; font-size: 10px; }
.redis { font-size: 8px; color: #4caf50; }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
</style>
