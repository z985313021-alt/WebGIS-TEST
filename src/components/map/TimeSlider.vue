<template>
  <div class="time-slider">
    <div class="ts-header">
      <span class="ts-title">⏳ 时空演变</span>
      <span class="ts-status">
        {{ currentLabel }} · 累计 <b>{{ cumulative }}</b> 项
      </span>
      <el-button size="small" text type="primary" @click="togglePlay">
        {{ playing ? '暂停' : '播放' }}
      </el-button>
      <el-button size="small" text @click="reset">全部</el-button>
    </div>
    <el-slider
      v-model="value"
      :min="0"
      :max="5"
      :step="1"
      :show-tooltip="false"
      :marks="marks"
    />
    <div class="ts-steps">
      <span v-for="(label, i) in LABELS" :key="i" class="ts-step" :class="{ active: value === i }">{{ label }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue';
import { useDataStore } from '@/services/stores/dataStore';
import { BATCH_LABELS } from '@/data/sources/heritage';

const store = useDataStore();
store.init();

const LABELS = ['全部', BATCH_LABELS[1], BATCH_LABELS[2], BATCH_LABELS[3], BATCH_LABELS[4], BATCH_LABELS[5]];
const value = ref(0);
const playing = ref(false);
let timer: number | null = null;

const marks = computed(() => {
  const m: Record<number, string> = {};
  for (let i = 1; i <= 5; i++) {
    m[i] = String(store.batchCounts[i] ?? 0);
  }
  return m;
});

const currentLabel = computed(() => (value.value === 0 ? '全部批次' : BATCH_LABELS[value.value]));

// 累计 = 批次 <= value 的要素数（时空演变：随批次增长）
const cumulative = computed(() => {
  if (value.value === 0) return store.items.length;
  return store.items.filter((i) => i.batch != null && i.batch <= value.value).length;
});

function apply(v: number) {
  store.filterBatchMax = v === 0 ? null : v;
}

// 值变化即同步筛选（拖动/点击/播放/重置都生效）
watch(value, (v) => apply(v));

function reset() {
  value.value = 0;
  store.filterBatchMax = null;
  stopPlay();
}

function togglePlay() {
  if (playing.value) stopPlay();
  else {
    playing.value = true;
    timer = window.setInterval(() => {
      value.value = (value.value + 1) % 6;
      apply(value.value);
      if (value.value === 0) stopPlay();
    }, 1200);
  }
}
function stopPlay() {
  playing.value = false;
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

onBeforeUnmount(stopPlay);
</script>

<style scoped>
.time-slider {
  position: absolute;
  bottom: 64px;
  left: 50%;
  transform: translateX(-50%);
  width: min(560px, 80vw);
  background: rgba(255, 255, 255, 0.94);
  border-radius: 10px;
  box-shadow: 0 2px 14px rgba(0, 0, 0, 0.18);
  padding: 10px 18px 6px;
  z-index: 9;
}
.ts-header { display: flex; align-items: center; gap: 10px; }
.ts-title { font-size: 13px; font-weight: 600; }
.ts-status { font-size: 12px; color: #888; flex: 1; }
.ts-steps { display: flex; justify-content: space-between; margin-top: -6px; }
.ts-step { font-size: 11px; color: #bbb; }
.ts-step.active { color: #409eff; font-weight: 600; }
</style>
