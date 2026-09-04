<template>
  <div class="time-slider glass">
    <div class="ts-head">
      <span class="ts-title">⏳ 时空演变</span>
      <span class="ts-badge" :class="{ hot: playing }">{{ statusText }}</span>
      <span class="ts-count">
        累计 <b>{{ cumulative }}</b> / {{ store.items.length }} 项
      </span>
      <div class="ts-actions">
        <el-button size="small" :type="playing ? 'warning' : 'primary'" round @click="togglePlay">
          {{ playing ? '⏸ 暂停' : '▶ 播放' }}
        </el-button>
        <el-button size="small" round @click="reset">全部</el-button>
      </div>
    </div>

    <!-- 五段流光轨道：每段 = 一个批次 -->
    <div class="tl-track" @click="onTrackClick">
      <div
        v-for="n in 5"
        :key="n"
        class="tl-seg"
        :class="{ lit: value >= n, current: value === n, dim: value !== 0 && value < n }"
        :data-n="n"
      >
        <span class="tl-seg-bar"></span>
        <span class="tl-seg-label">
          <b class="tl-seg-num">{{ batchCount(n) }}</b>
          <i>第{{ CN[n] }}批</i>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue';
import { useDataStore } from '@/services/stores/dataStore';
import { BATCH_LABELS } from '@/data/sources/heritage';

const store = useDataStore();
store.init();

const CN = ['', '一', '二', '三', '四', '五'];
const value = ref(0); // 0=全部(null)；1..5=显示至该批(上限)
const playing = ref(false);
let timer: number | null = null;

const batchCount = (n: number) => store.batchCounts[n] ?? 0;

const cumulative = computed(() => {
  if (value.value === 0) return store.items.length;
  return store.items.filter((i) => i.batch != null && i.batch <= value.value).length;
});

const statusText = computed(() => {
  if (playing.value) return value.value === 0 ? '🎬 开播…' : `✨ ${BATCH_LABELS[value.value]}`;
  if (value.value === 0) return '🧭 全部批次';
  if (value.value === 5) return '🎉 已全部亮相';
  return BATCH_LABELS[value.value];
});

function apply(v: number) {
  value.value = v;
  store.filterBatchMax = v === 0 ? null : v;
}

// 轨道点击直达某批（含"点亮到该批"的语义）
function onTrackClick(e: MouseEvent) {
  const target = (e.target as HTMLElement).closest?.('.tl-seg') as HTMLElement | null;
  if (!target) return;
  const n = Number(target.dataset.n);
  stopPlay();
  apply(n);
}

function togglePlay() {
  if (playing.value) {
    stopPlay();
    return;
  }
  playing.value = true;
  // 从"全部/第五批"重新开始 → 先回 0（全显）再逐批生长
  if (value.value === 0 || value.value === 5) apply(0);
  timer = window.setInterval(() => {
    if (value.value >= 5) {
      stopPlay(); // 播完停在第五批（=全部亮相）
      return;
    }
    apply(value.value + 1);
  }, 1100);
}

function stopPlay() {
  playing.value = false;
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

function reset() {
  stopPlay();
  apply(0);
}

// 外部（如 HomeMap 重置筛选）把 filterBatchMax 清掉时，同步滑块回 0
watch(
  () => store.filterBatchMax,
  (v) => {
    if (v !== value.value && v !== null) value.value = v;
    if (v === null) value.value = 0;
  },
);

onBeforeUnmount(stopPlay);
</script>

<style scoped>
.glass {
  background: linear-gradient(135deg, rgba(18, 34, 66, 0.92), rgba(13, 52, 84, 0.92));
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.35);
}
.time-slider {
  position: absolute;
  bottom: 64px;
  left: 50%;
  transform: translateX(-50%);
  width: min(620px, 86vw);
  border-radius: 14px;
  padding: 12px 18px 14px;
  z-index: 9;
  color: #fff;
}
.ts-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.ts-title { font-size: 14px; font-weight: 700; letter-spacing: 0.5px; }
.ts-badge {
  font-size: 12px;
  padding: 2px 10px;
  border-radius: 999px;
  background: rgba(64, 158, 255, 0.22);
  border: 1px solid rgba(64, 158, 255, 0.5);
  transition: all 0.25s;
}
.ts-badge.hot {
  background: rgba(230, 126, 34, 0.3);
  border-color: #e67e22;
  animation: pulse 1s infinite;
}
.ts-count { font-size: 12px; color: #bcd2ee; flex: 1; }
.ts-count b { color: #ffd666; font-size: 15px; }
.ts-actions { display: flex; gap: 6px; }

.tl-track {
  display: flex;
  gap: 6px;
  margin-top: 14px;
  cursor: pointer;
  user-select: none;
}
.tl-seg {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 4px 2px 0;
  border-radius: 8px;
  transition: background 0.2s;
}
.tl-seg:hover { background: rgba(255, 255, 255, 0.06); }
.tl-seg-bar {
  height: 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  overflow: hidden;
  position: relative;
  transition: background 0.3s;
}
.tl-seg.lit .tl-seg-bar {
  background: linear-gradient(90deg, #40a9ff, #36cfc9);
  box-shadow: 0 0 10px rgba(64, 169, 255, 0.6);
}
.tl-seg.current .tl-seg-bar {
  background: linear-gradient(90deg, #ff9c40, #ffd666);
  box-shadow: 0 0 14px rgba(255, 156, 64, 0.8);
  animation: glow 0.9s ease-in-out infinite alternate;
}
.tl-seg-label { display: flex; justify-content: space-between; align-items: baseline; font-style: normal; }
.tl-seg-num {
  font-size: 18px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.35);
  transition: all 0.3s;
}
.tl-seg.lit .tl-seg-num { color: #40a9ff; }
.tl-seg.current .tl-seg-num { color: #ffd666; transform: scale(1.25); }
.tl-seg.dim .tl-seg-num { color: rgba(255, 255, 255, 0.22); }
.tl-seg-label i { font-size: 10px; color: #8fb3dd; font-style: normal; }
.tl-seg.lit .tl-seg-label i { color: #cfe6ff; }
.tl-seg.current .tl-seg-label i { color: #ffe7ba; }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
@keyframes glow {
  from { filter: brightness(1); }
  to { filter: brightness(1.35); }
}
</style>
