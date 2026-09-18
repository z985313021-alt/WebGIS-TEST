<template>
  <div class="online-badge" :class="{ live: wsConnected }">
    <span class="dot"></span>
    <span class="txt">{{ wsConnected ? '在线' : '连接中' }}</span>
    <span v-if="wsConnected && total > 1" class="cnt">{{ total }}人</span>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { wsConnected } from '@/composables/useWebSocket';

const total = ref(1);
let timer = null;

async function fetchStats() {
  try {
    const { data } = await fetch('/api/ws/stats', { credentials: 'include' }).then((r) => r.json());
    if (data?.ws?.total) total.value = data.ws.total;
  } catch {}
}

onMounted(() => {
  fetchStats();
  timer = setInterval(fetchStats, 10_000);
});
onUnmounted(() => clearInterval(timer));
</script>

<style scoped>
.online-badge { display: flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 999px; background: rgba(0,0,0,0.06); font-size: 11px; }
.dot { width: 7px; height: 7px; border-radius: 50%; background: #ccc; transition: background 0.3s; }
.live .dot { background: #4caf50; box-shadow: 0 0 4px #4caf50; animation: pulse 2s infinite; }
.live .txt { color: #4caf50; }
.cnt { color: #a08c72; }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
</style>
