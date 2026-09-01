<template>
  <div class="chart-page">
    <h2>图表可视化</h2>
    <p class="desc">
      基于当前筛选条件统计（与地图主页共享状态）；点击图表可设置筛选并跳回地图。
      <el-tag size="small" type="info">当前命中 {{ store.filteredItems.length }} / {{ store.items.length }} 项</el-tag>
      <el-button size="small" @click="store.resetFilters()">重置筛选</el-button>
      <el-button size="small" type="primary" @click="goMap">去地图查看</el-button>
    </p>

    <el-row :gutter="16" class="chart-grid">
      <el-col :span="12">
        <el-card shadow="never" class="chart-card">
          <template #header>🏷️ 类别分布</template>
          <div ref="pieEl" class="chart-box"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="never" class="chart-card">
          <template #header>📍 地市排行（点击筛选）</template>
          <div ref="cityEl" class="chart-box"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="never" class="chart-card">
          <template #header>📈 申报趋势（批次）</template>
          <div ref="trendEl" class="chart-box"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="never" class="chart-card">
          <template #header>🔥 热门类别 TOP5（点击筛选）</template>
          <div ref="topEl" class="chart-box"></div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { useRouter } from 'vue-router';
import * as echarts from 'echarts';
import { useDataStore } from '@/services/stores/dataStore';
import { CATEGORY_COLORS, BATCHES, BATCH_LABELS } from '@/data/sources/heritage';

const router = useRouter();
const store = useDataStore();
store.init();
// 暴露 store 便于调试/联动验证（与 MapContainer 一致）
(window as any).__dataStore = store;

const pieEl = ref<HTMLElement | null>(null);
const cityEl = ref<HTMLElement | null>(null);
const trendEl = ref<HTMLElement | null>(null);
const topEl = ref<HTMLElement | null>(null);

let pie: echarts.ECharts | null = null;
let city: echarts.ECharts | null = null;
let trend: echarts.ECharts | null = null;
let top: echarts.ECharts | null = null;

function initCharts() {
  if (pieEl.value) pie = echarts.init(pieEl.value);
  if (cityEl.value) city = echarts.init(cityEl.value);
  if (trendEl.value) trend = echarts.init(trendEl.value);
  if (topEl.value) top = echarts.init(topEl.value);
  window.addEventListener('resize', onResize);
}

function onResize() {
  [pie, city, trend, top].forEach((c) => c?.resize());
}

function refresh() {
  const items = store.filteredItems;

  // 类别饼图
  const catCounts: Record<string, number> = {};
  for (const i of items) catCounts[i.category] = (catCounts[i.category] || 0) + 1;
  const pieData = Object.entries(catCounts).map(([name, value]) => ({ name, value }));
  pie?.setOption({
    tooltip: { trigger: 'item' },
    legend: { type: 'scroll', orient: 'vertical', right: 0, top: 'center', textStyle: { fontSize: 11 } },
    series: [{
      type: 'pie',
      radius: ['38%', '66%'],
      center: ['40%', '50%'],
      label: { show: false },
      data: pieData,
      color: Object.values(CATEGORY_COLORS),
    }],
  }, true);

  // 地市排行（横向柱状，点击筛选）
  const cityCounts: Record<string, number> = {};
  for (const i of items) cityCounts[i.city] = (cityCounts[i.city] || 0) + 1;
  const cityData = Object.entries(cityCounts).sort((a, b) => b[1] - a[1]);
  city?.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: 70, right: 30, top: 10, bottom: 30 },
    xAxis: { type: 'value', minInterval: 1 },
    yAxis: { type: 'category', data: cityData.map((d) => d[0]), axisLabel: { fontSize: 11 } },
    series: [{
      type: 'bar',
      data: cityData.map((d) => d[1]),
      itemStyle: { color: '#409eff', borderRadius: [0, 3, 3, 0] },
      label: { show: true, position: 'right', fontSize: 10 },
    }],
  }, true);

  // 申报趋势：各批次新增 + 累计线
  const batchNew = BATCHES.map((b) => items.filter((i) => i.batch === b).length);
  const batchCum = BATCHES.map((_, idx) => batchNew.slice(0, idx + 1).reduce((a, b) => a + b, 0));
  trend?.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['新增', '累计'], top: 0, textStyle: { fontSize: 11 } },
    grid: { left: 45, right: 20, top: 30, bottom: 30 },
    xAxis: { type: 'category', data: BATCHES.map((b) => BATCH_LABELS[b]) },
    yAxis: { type: 'value', minInterval: 1 },
    series: [
      { name: '新增', type: 'bar', data: batchNew, itemStyle: { color: '#67c23a', borderRadius: [3, 3, 0, 0] } },
      { name: '累计', type: 'line', data: batchCum, smooth: true, itemStyle: { color: '#e6a23c' } },
    ],
  }, true);

  // 热门类别 TOP5
  const topData = Object.entries(catCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  top?.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: 90, right: 30, top: 10, bottom: 30 },
    xAxis: { type: 'value', minInterval: 1 },
    yAxis: { type: 'category', data: topData.map((d) => d[0]), axisLabel: { fontSize: 11 } },
    series: [{
      type: 'bar',
      data: topData.map((d, i) => ({
        value: d[1],
        itemStyle: { color: Object.values(CATEGORY_COLORS)[i] || '#409eff', borderRadius: [0, 3, 3, 0] },
      })),
      label: { show: true, position: 'right', fontSize: 10 },
    }],
  }, true);
}

function bindClicks() {
  city?.on('click', (p: any) => {
    store.filterCity = p.name as string;
  });
  pie?.on('click', (p: any) => {
    store.filterCategories = [p.name as string];
  });
  top?.on('click', (p: any) => {
    store.filterCategories = [p.name as string];
  });
}

function goMap() {
  router.push('/');
}

onMounted(() => {
  initCharts();
  refresh();
  bindClicks();
});

// 筛选变化 → 图表刷新（与地图主页共享 store 状态）
watch(
  () => store.filteredItems,
  () => refresh(),
);

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize);
  [pie, city, trend, top].forEach((c) => c?.dispose());
});
</script>

<style scoped>
.chart-page { padding: 16px; max-width: 1100px; }
.desc { color: #888; font-size: 13px; margin: 4px 0 16px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.chart-grid { row-gap: 16px; }
.chart-card { margin-bottom: 4px; }
.chart-box { width: 100%; height: 300px; }
</style>
