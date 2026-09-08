<template>
  <div class="chart-page">
    <div class="cp-header">
      <div class="cp-title-wrap">
        <span class="cp-seal">❖ 透视</span>
        <h2 class="cp-title">齐鲁非遗空间多维可视化统计</h2>
      </div>
      <p class="cp-desc">
        与地图主页及空间分析无缝共享筛选状态；点击任意柱状图或门类扇区可即时联动反向筛选。
      </p>
      <div class="cp-toolbar">
        <span class="cp-count">
          当前呈现 <b>{{ store.filteredItems.length }}</b> / {{ store.items.length }} 项非遗要素
        </span>
        <el-button size="small" @click="store.resetFilters()">重置筛选</el-button>
        <el-button size="small" type="primary" @click="goMap">前往空间地图</el-button>
        <el-button size="small" type="warning" plain @click="router.push('/screen')">
          <el-icon style="margin-right: 4px;"><Platform /></el-icon> 态势大屏
        </el-button>
      </div>
    </div>

    <el-row :gutter="18" class="chart-grid">
      <el-col :span="12">
        <el-card shadow="never" class="chart-card">
          <template #header><span class="card-htitle">❖ 门类分布透视</span></template>
          <div ref="pieEl" class="chart-box"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="never" class="chart-card">
          <template #header><span class="card-htitle">❖ 齐鲁地市非遗排位（点击联动）</span></template>
          <div ref="cityEl" class="chart-box"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="never" class="chart-card">
          <template #header><span class="card-htitle">❖ 国家级公布批次递增趋势</span></template>
          <div ref="trendEl" class="chart-box"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="never" class="chart-card">
          <template #header><span class="card-htitle">❖ 优势门类 TOP5（点击联动）</span></template>
          <div ref="topEl" class="chart-box"></div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { useRouter } from 'vue-router';
import { Platform } from '@element-plus/icons-vue';
import * as echarts from 'echarts';
import { useDataStore } from '@/services/stores/dataStore';
import { CATEGORY_COLORS, BATCHES, BATCH_LABELS } from '@/data/sources/heritage';

const router = useRouter();
const store = useDataStore();
store.init();

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
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
          { offset: 0, color: '#a03526' },
          { offset: 1, color: '#d4a84e' },
        ]),
        borderRadius: [0, 4, 4, 0],
      },
      label: { show: true, position: 'right', fontSize: 10, color: '#6c5f47' },
    }],
  }, true);

  // 申报趋势：各批次新增 + 累计线
  const batchNew = BATCHES.map((b) => items.filter((i) => i.batch === b).length);
  const batchCum = BATCHES.map((_, idx) => batchNew.slice(0, idx + 1).reduce((a, b) => a + b, 0));
  trend?.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['新增', '累计'], top: 0, textStyle: { fontSize: 11, color: '#5c4f3d' } },
    grid: { left: 45, right: 20, top: 30, bottom: 30 },
    xAxis: { type: 'category', data: BATCHES.map((b) => BATCH_LABELS[b]), axisLabel: { color: '#6c5f47' } },
    yAxis: { type: 'value', minInterval: 1, axisLabel: { color: '#6c5f47' } },
    series: [
      {
        name: '新增',
        type: 'bar',
        data: batchNew,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#3c6a50' },
            { offset: 1, color: '#6f907a' },
          ]),
          borderRadius: [4, 4, 0, 0],
        },
      },
      {
        name: '累计',
        type: 'line',
        data: batchCum,
        smooth: true,
        itemStyle: { color: '#a03526' },
        lineStyle: { width: 3, color: '#a03526' },
      },
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
  [pie, city, trend, top].forEach((c) => {
    if (c) {
      c.off('click');
      c.dispose();
    }
  });
  pie = null;
  city = null;
  trend = null;
  top = null;
});
</script>

<style scoped>
.chart-page {
  padding: 20px 24px 40px;
  max-width: 1280px;
  margin: 0 auto;
}
.cp-header {
  margin-bottom: 20px;
  background: #ffffff;
  border: 1px solid #dcd1ba;
  border-radius: 4px;
  padding: 16px 20px;
  box-shadow: 0 1px 4px rgba(43, 34, 24, 0.05);
}
.cp-title-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}
.cp-seal {
  color: var(--zi-gold, #b4861f);
  font-family: var(--zi-font-serif, "STSong", serif);
  font-size: 13px;
  font-weight: 700;
}
.cp-title {
  font-family: var(--zi-font-serif, "STSong", "Songti SC", serif);
  font-size: 18px;
  color: #3a2b1c;
  font-weight: 700;
  letter-spacing: 0.04em;
  margin: 0;
}
.cp-desc {
  color: #6c5f47;
  font-size: 13px;
  margin: 6px 0 12px;
}
.cp-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.cp-count {
  font-size: 12.5px;
  color: #7a6946;
  font-family: var(--zi-font-serif, "STSong", serif);
}
.cp-count b {
  color: var(--zi-red, #8f2317);
  font-size: 14px;
}

.chart-grid {
  row-gap: 16px;
}
.card-htitle {
  font-family: var(--zi-font-serif, "STSong", "Songti SC", serif);
  font-weight: 700;
  color: #8f2317;
  font-size: 14px;
  letter-spacing: 0.04em;
}
.chart-card {
  background: #ffffff;
  border: 1px solid #dcd1ba;
  border-radius: 4px;
  box-shadow: 0 1px 4px rgba(43, 34, 24, 0.05);
  transition: border-color 150ms ease-out;
}
.chart-card:hover {
  border-color: #b4861f;
}
.chart-box {
  width: 100%;
  height: 310px;
}
</style>
