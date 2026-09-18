<template>
  <div class="ws-debug" v-if="show">
    <div class="wsd-head" @click="show = !show">
      <span class="dot" :class="{ ok: wsConnected }"></span>
      WS {{ wsConnected ? '已连接' : '断开' }} | {{ events.length }}条
    </div>
    <div class="wsd-body">
      <div v-for="(e, i) in events.slice(-6)" :key="i" class="wsd-item">
        <span class="wsd-type">{{ e.type }}</span>
        <span class="wsd-data">{{ JSON.stringify(e.data).slice(0, 50) }}</span>
      </div>
      <div v-if="!events.length" class="wsd-empty">等待事件...</div>
    </div>
  </div>
  <div v-else class="ws-debug-collapsed" @click="show = !show" title="WS 调试">
    <span class="dot" :class="{ ok: wsConnected }"></span>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { wsConnected } from '@/composables/useWebSocket';

const show = ref(true);
const events = ref([]);

function onEvent(e) {
  if (e.detail?.type) events.value.push(e.detail);
}

onMounted(() => window.addEventListener('ws-event', onEvent));
onUnmounted(() => window.removeEventListener('ws-event', onEvent));
</script>

<style scoped>
.ws-debug { position: fixed; bottom: 56px; right: 24px; width: 260px; background: rgba(30,24,18,0.95); color: #fdf6e6; border-radius: 8px; font-size: 11px; z-index: 9998; box-shadow: 0 4px 14px rgba(0,0,0,.3); }
.ws-debug-collapsed { position: fixed; bottom: 56px; right: 24px; width: 28px; height: 28px; border-radius: 50%; background: rgba(30,24,18,0.9); display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 9998; }
.wsd-head { display: flex; align-items: center; gap: 6px; padding: 6px 10px; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,.1); }
.wsd-body { max-height: 160px; overflow-y: auto; padding: 6px; }
.wsd-item { display: flex; gap: 6px; padding: 3px 0; border-bottom: 1px solid rgba(255,255,255,.05); }
.wsd-type { color: #d4a03c; flex: 0 0 70px; }
.wsd-data { color: #a08c72; word-break: break-all; }
.dot { width: 6px; height: 6px; border-radius: 50%; background: #ccc; }
.dot.ok { background: #4caf50; box-shadow: 0 0 4px #4caf50; }
</style>
