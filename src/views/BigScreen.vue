<template>
  <div ref="screenEl" class="heritage-scroll-root">
    <!-- 顶部展厅卷轴标头 -->
    <header class="scroll-header">
      <div class="header-left">
        <el-button class="btn-return" size="small" @click="router.push('/')">
          <el-icon><Back /></el-icon> 返回平台
        </el-button>
        <span class="heritage-seal">齐风鲁韵</span>
      </div>

      <div class="header-center">
        <div class="header-arch-title">❖ 齐鲁非遗时空演化与全域态势长卷 ❖</div>
        <div class="header-arch-sub">山东省国家级与省级非物质文化遗产空间数字化全息展厅</div>
      </div>

      <div class="header-right">
        <div class="cur-time">{{ currentTime }}</div>
        <el-button class="btn-fullscreen" size="small" @click="toggleFullscreen">
          <el-icon><FullScreen /></el-icon> {{ isFullscreen ? '退出全屏' : '全屏展陈' }}
        </el-button>
      </div>
    </header>

    <!-- 顶部核心指标通栏（文博馆开阔陈列风格） -->
    <section class="stat-banner">
      <div class="stat-item">
        <div class="stat-title">全省非遗总建档</div>
        <div class="stat-number gold">{{ activeItems.length }}<span class="stat-unit">项</span></div>
        <div class="stat-desc">涵盖国家级与省级代表性项目</div>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <div class="stat-title">行政区划通达</div>
        <div class="stat-number vermilion">16<span class="stat-unit">地市</span></div>
        <div class="stat-desc">齐鲁大地十六市全境活态传承</div>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <div class="stat-title">公布批次演进</div>
        <div class="stat-number amber">5<span class="stat-unit">批次</span></div>
        <div class="stat-desc">自 2006 年至 2021 年持续收录</div>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <div class="stat-title">重点空间走廊</div>
        <div class="stat-number pine">4<span class="stat-unit">大体系</span></div>
        <div class="stat-desc">黄河 · 运河 · 齐长城 · 胶东沿海</div>
      </div>
    </section>

    <!-- 展屏主体交互网格（舒缓大间距，焦点聚焦于中央地图） -->
    <main class="scroll-body">
      <!-- 左翼：门类分布与时间脉络 -->
      <aside class="scroll-col side-col">
        <div class="heritage-panel flex-1">
          <div class="panel-header">
            <span class="panel-sym">❖</span>
            <h3 class="panel-title">非遗十大门类构成</h3>
          </div>
          <div ref="categoryChartEl" class="chart-container"></div>
        </div>

        <div class="heritage-panel flex-1">
          <div class="panel-header">
            <span class="panel-sym">❖</span>
            <h3 class="panel-title">国家级名录批次公布脉络</h3>
          </div>
          <div ref="batchTrendChartEl" class="chart-container"></div>
        </div>
      </aside>

      <!-- 中央主视窗：齐鲁非遗空间拓扑大地图 + 时空演化轮播 -->
      <section class="scroll-col center-col">
        <div class="heritage-panel map-main-panel">
          <div class="panel-header map-header">
            <div class="ph-left">
              <span class="panel-sym">❖</span>
              <h3 class="panel-title">齐鲁全域空间拓扑与主要文化走廊</h3>
            </div>
            <div class="map-legend">
              <span class="legend-chip"><i class="dot yellow"></i> 黄河生态廊道</span>
              <span class="legend-chip"><i class="dot green"></i> 京杭大运河工坊</span>
              <span class="legend-chip"><i class="dot red"></i> 核心集聚地市</span>
            </div>
          </div>

          <div ref="mapChartEl" class="map-container"></div>

          <!-- 优雅下置式时空切片控制器 -->
          <div class="time-control-bar">
            <button class="btn-play-pause" @click="toggleAutoPlay">
              <el-icon><VideoPlay v-if="!isPlaying" /><VideoPause v-else /></el-icon>
              {{ isPlaying ? '暂停演化' : '时空演化' }}
            </button>
            <div class="time-chips">
              <button
                class="time-chip"
                :class="{ active: currentBatch === 0 }"
                @click="setBatch(0)"
              >
                全省总览
              </button>
              <button
                v-for="b in [1, 2, 3, 4, 5]"
                :key="b"
                class="time-chip"
                :class="{ active: currentBatch === b }"
                @click="setBatch(b)"
              >
                第{{ b }}批（{{ batchYears[b] }}）
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- 右翼：地市分布排位与文化走廊渗透率 -->
      <aside class="scroll-col side-col">
        <div class="heritage-panel flex-1">
          <div class="panel-header">
            <span class="panel-sym">❖</span>
            <h3 class="panel-title">地市非遗承载分布 (TOP 10)</h3>
          </div>
          <div ref="cityRankChartEl" class="chart-container"></div>
        </div>

        <div class="heritage-panel flex-1">
          <div class="panel-header">
            <span class="panel-sym">❖</span>
            <h3 class="panel-title">重点空间走廊覆盖比</h3>
          </div>
          <div ref="corridorChartEl" class="chart-container"></div>
        </div>
      </aside>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { Back, FullScreen, VideoPlay, VideoPause } from '@element-plus/icons-vue';
import * as echarts from 'echarts';
import { useDataStore } from '@/services/stores/dataStore';
import shandongGeo from '@/data/shandong-city-boundary.json';

const router = useRouter();
const dataStore = useDataStore();
dataStore.init();

const screenEl = ref<HTMLElement | null>(null);
const isFullscreen = ref(false);
const currentTime = ref('');
let timerId: any = null;

// 批次年份映射
const batchYears: Record<number, string> = {
  1: '2006',
  2: '2008',
  3: '2011',
  4: '2014',
  5: '2021',
};

const currentBatch = ref<number>(0);
const isPlaying = ref<boolean>(false);
let playInterval: any = null;

// 图表 DOM
const categoryChartEl = ref<HTMLElement | null>(null);
const batchTrendChartEl = ref<HTMLElement | null>(null);
const mapChartEl = ref<HTMLElement | null>(null);
const cityRankChartEl = ref<HTMLElement | null>(null);
const corridorChartEl = ref<HTMLElement | null>(null);

let categoryChart: echarts.ECharts | null = null;
let batchTrendChart: echarts.ECharts | null = null;
let mapChart: echarts.ECharts | null = null;
let cityRankChart: echarts.ECharts | null = null;
let corridorChart: echarts.ECharts | null = null;

// 过滤要素
const activeItems = computed(() => {
  if (currentBatch.value === 0) return dataStore.items;
  return dataStore.items.filter((item) => item.batch === currentBatch.value);
});

// 注册山东省地图
echarts.registerMap('shandong', shandongGeo as any);

// 16 地市中心坐标
const CITY_COORDS: Record<string, [number, number]> = {
  济南市: [117.0009, 36.6758],
  青岛市: [120.3826, 36.0671],
  淄博市: [118.0476, 36.8149],
  枣庄市: [117.5579, 34.8564],
  东营市: [118.6647, 37.4346],
  烟台市: [121.3914, 37.5393],
  潍坊市: [119.1071, 36.7093],
  济宁市: [116.5872, 35.4154],
  泰安市: [117.1290, 36.1949],
  威海市: [122.1164, 37.5097],
  日照市: [119.4612, 35.4286],
  临沂市: [118.3264, 35.0653],
  德州市: [116.3075, 37.4540],
  聊城市: [115.9804, 36.4560],
  滨州市: [118.0169, 37.3835],
  菏泽市: [115.4694, 35.2465],
};

// 黄河山东段示意流线
const yellowRiverLine = [
  [115.4694, 35.2465],
  [116.5872, 35.4154],
  [115.9804, 36.4560],
  [117.1290, 36.1949],
  [117.0009, 36.6758],
  [116.3075, 37.4540],
  [118.0169, 37.3835],
  [118.0476, 36.8149],
  [118.6647, 37.4346],
];

// 大运河齐鲁段示意流线
const grandCanalLine = [
  [116.3075, 37.4540],
  [115.9804, 36.4560],
  [117.1290, 36.1949],
  [116.5872, 35.4154],
  [117.5579, 34.8564],
];

// 1. 门类分布图 (传统国风典雅配色)
function initCategoryChart() {
  if (!categoryChartEl.value) return;
  categoryChart = echarts.init(categoryChartEl.value);
  updateCategoryChart();
}

function updateCategoryChart() {
  if (!categoryChart) return;
  const counts: Record<string, number> = {};
  activeItems.value.forEach((item) => {
    counts[item.category] = (counts[item.category] || 0) + 1;
  });

  const data = Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // 温润宣纸与朱砂赭墨配色
  const colors = [
    '#9e2a1d', '#c59b3f', '#3c6a50', '#7a5a2a', '#a65628',
    '#5c7a82', '#b38242', '#8c3d2e', '#486856', '#d4a84e'
  ];

  categoryChart.setOption({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: '#272019',
      borderColor: '#c59b3f',
      borderWidth: 1,
      textStyle: { color: '#f5edd8', fontSize: 12 },
      formatter: '{b}：<b>{c}</b> 项 ({d}%)',
    },
    legend: {
      orient: 'vertical',
      right: '2%',
      top: 'middle',
      textStyle: { color: '#c2b39f', fontSize: 11 },
      itemWidth: 8,
      itemHeight: 8,
    },
    series: [
      {
        name: '非遗门类',
        type: 'pie',
        radius: ['42%', '68%'],
        center: ['36%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 3,
          borderColor: '#1e1813',
          borderWidth: 2,
        },
        color: colors,
        label: { show: false },
        emphasis: {
          label: {
            show: true,
            fontSize: 13,
            fontWeight: 'bold',
            color: '#e8cb85',
            formatter: '{b}\n{c} 项',
          },
        },
        data,
      },
    ],
  });
}

// 2. 批次递进趋势图
function initBatchTrendChart() {
  if (!batchTrendChartEl.value) return;
  batchTrendChart = echarts.init(batchTrendChartEl.value);

  const batches = ['第1批', '第2批', '第3批', '第4批', '第5批'];
  const batchCounts = [0, 0, 0, 0, 0];
  dataStore.items.forEach((i) => {
    if (i.batch && i.batch >= 1 && i.batch <= 5) {
      batchCounts[i.batch - 1]++;
    }
  });

  let sum = 0;
  const cumulative = batchCounts.map((c) => {
    sum += c;
    return sum;
  });

  batchTrendChart.setOption({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#272019',
      borderColor: '#c59b3f',
      textStyle: { color: '#f5edd8', fontSize: 12 },
    },
    grid: { left: '12%', right: '6%', top: '16%', bottom: '18%' },
    xAxis: {
      type: 'category',
      data: batches,
      axisLabel: { color: '#a69682', fontSize: 11 },
      axisLine: { lineStyle: { color: '#44382c' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#a69682', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(92, 77, 61, 0.35)', type: 'dashed' } },
    },
    series: [
      {
        name: '累计公布',
        type: 'line',
        smooth: true,
        data: cumulative,
        lineStyle: { color: '#c59b3f', width: 2.5 },
        itemStyle: { color: '#9e2a1d', borderColor: '#c59b3f', borderWidth: 1.5 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(197, 155, 63, 0.35)' },
            { offset: 1, color: 'rgba(197, 155, 63, 0.02)' },
          ]),
        },
      },
      {
        name: '当期批次',
        type: 'bar',
        barWidth: '24%',
        data: batchCounts,
        itemStyle: {
          color: '#9e2a1d',
          borderRadius: [2, 2, 0, 0],
        },
      },
    ],
  });
}

// 3. 中央山东非遗空间态势大地图
function initMapChart() {
  if (!mapChartEl.value) return;
  mapChart = echarts.init(mapChartEl.value);
  updateMapChart();
}

function updateMapChart() {
  if (!mapChart) return;

  const cityCounts: Record<string, number> = {};
  activeItems.value.forEach((i) => {
    cityCounts[i.city] = (cityCounts[i.city] || 0) + 1;
  });

  const scatterData = Object.entries(CITY_COORDS).map(([city, coords]) => {
    const count = cityCounts[city] || 0;
    return {
      name: city,
      value: [coords[0], coords[1], count],
    };
  });

  mapChart.setOption({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: '#272019',
      borderColor: '#c59b3f',
      borderWidth: 1,
      textStyle: { color: '#f5edd8', fontSize: 12 },
      formatter: (params: any) => {
        if (params.seriesType === 'effectScatter') {
          const cName = params.data.name;
          const count = params.data.value[2];
          const items = activeItems.value.filter((i) => i.city === cName).slice(0, 3);
          const itemNames = items.map((i) => `· ${i.name} (${i.category})`).join('<br/>');
          return `<b>❖ ${cName}</b><br/>收录非遗：<b>${count}</b> 项<br/><span style="color:#d4a84e">${itemNames}</span>`;
        }
        if (params.seriesType === 'lines') return params.seriesName;
        return params.name;
      },
    },
    geo: {
      map: 'shandong',
      roam: true,
      zoom: 1.16,
      center: [118.8, 36.3],
      aspectScale: 0.85,
      itemStyle: {
        areaColor: '#1d1712',
        borderColor: '#544332',
        borderWidth: 1.2,
        shadowColor: 'rgba(0, 0, 0, 0.5)',
        shadowBlur: 10,
      },
      emphasis: {
        itemStyle: {
          areaColor: '#2b2119',
          borderColor: '#c59b3f',
          borderWidth: 1.5,
        },
        label: {
          show: true,
          color: '#faeed7',
          fontSize: 12,
        },
      },
      label: {
        show: false,
      },
    },
    series: [
      // 黄河生态廊道
      {
        name: '❖ 黄河流域（山东段）非遗生态廊道',
        type: 'lines',
        coordinateSystem: 'geo',
        zlevel: 1,
        effect: {
          show: true,
          period: 4,
          trailLength: 0.25,
          symbol: 'circle',
          symbolSize: 4,
          color: '#c59b3f',
        },
        lineStyle: {
          color: 'rgba(197, 155, 63, 0.45)',
          width: 2.5,
          curveness: 0.2,
        },
        data: [{ coords: yellowRiverLine }],
      },
      // 大运河工坊分布带
      {
        name: '❖ 京杭大运河（齐鲁段）工坊分布带',
        type: 'lines',
        coordinateSystem: 'geo',
        zlevel: 1,
        effect: {
          show: true,
          period: 3.5,
          trailLength: 0.25,
          symbol: 'circle',
          symbolSize: 4,
          color: '#3c6a50',
        },
        lineStyle: {
          color: 'rgba(60, 106, 80, 0.45)',
          width: 2.2,
          curveness: -0.15,
        },
        data: [{ coords: grandCanalLine }],
      },
      // 十六地市非遗点位散点
      {
        name: '地市非遗',
        type: 'effectScatter',
        coordinateSystem: 'geo',
        zlevel: 2,
        rippleEffect: {
          brushType: 'stroke',
          scale: 2.8,
          period: 4,
        },
        label: {
          show: true,
          formatter: (p: any) => `${p.data.name} (${p.data.value[2]})`,
          position: 'right',
          color: '#e5ca8b',
          fontSize: 11,
          fontFamily: 'serif',
        },
        symbolSize: (val: any) => Math.max(9, Math.min(22, val[2] * 1.3)),
        itemStyle: {
          color: '#9e2a1d',
          borderColor: '#e8cb85',
          borderWidth: 1,
        },
        data: scatterData,
      },
    ],
  });
}

// 4. 地市排行分布图 (TOP 10，温润典雅)
function initCityRankChart() {
  if (!cityRankChartEl.value) return;
  cityRankChart = echarts.init(cityRankChartEl.value);
  updateCityRankChart();
}

function updateCityRankChart() {
  if (!cityRankChart) return;
  const counts: Record<string, number> = {};
  activeItems.value.forEach((i) => {
    counts[i.city] = (counts[i.city] || 0) + 1;
  });

  const sorted = Object.entries(counts)
    .sort((a, b) => a[1] - b[1])
    .slice(-10); // 取前 10 名，保证排版舒缓不拥挤

  const cities = sorted.map((item) => item[0].replace('市', ''));
  const values = sorted.map((item) => item[1]);

  cityRankChart.setOption({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: '#272019',
      borderColor: '#c59b3f',
      textStyle: { color: '#f5edd8', fontSize: 12 },
    },
    grid: { left: '16%', right: '12%', top: '6%', bottom: '8%' },
    xAxis: {
      type: 'value',
      axisLabel: { color: '#a69682', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(92, 77, 61, 0.35)' } },
    },
    yAxis: {
      type: 'category',
      data: cities,
      axisLabel: { color: '#d9cbb7', fontSize: 11 },
      axisLine: { lineStyle: { color: '#44382c' } },
    },
    series: [
      {
        name: '非遗数量',
        type: 'bar',
        barWidth: '38%',
        data: values,
        itemStyle: {
          borderRadius: [0, 2, 2, 0],
          color: (params: any) => {
            if (params.dataIndex >= cities.length - 3) {
              return new echarts.graphic.LinearGradient(1, 0, 0, 0, [
                { offset: 0, color: '#9e2a1d' },
                { offset: 1, color: '#c59b3f' },
              ]);
            }
            return '#7a5a2a';
          },
        },
        label: {
          show: true,
          position: 'right',
          color: '#d4a84e',
          fontSize: 10,
          formatter: '{c}',
        },
      },
    ],
  });
}

// 5. 走廊覆盖比例图
function initCorridorChart() {
  if (!corridorChartEl.value) return;
  corridorChart = echarts.init(corridorChartEl.value);

  corridorChart.setOption({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: '#272019',
      borderColor: '#3c6a50',
      textStyle: { color: '#f5edd8', fontSize: 12 },
    },
    grid: { left: '33%', right: '12%', top: '8%', bottom: '8%' },
    xAxis: {
      type: 'value',
      max: 100,
      axisLabel: { color: '#a69682', fontSize: 10, formatter: '{value}%' },
      splitLine: { lineStyle: { color: 'rgba(92, 77, 61, 0.35)' } },
    },
    yAxis: {
      type: 'category',
      data: ['胶东沿海民俗', '京杭大运河带', '黄河生态廊道', '齐长城文化带'],
      axisLabel: { color: '#d9cbb7', fontSize: 11 },
      axisLine: { lineStyle: { color: '#44382c' } },
    },
    series: [
      {
        name: '非遗占比',
        type: 'bar',
        barWidth: '35%',
        data: [18.4, 25.9, 35.1, 44.3],
        itemStyle: {
          borderRadius: [0, 2, 2, 0],
          color: new echarts.graphic.LinearGradient(1, 0, 0, 0, [
            { offset: 0, color: '#3c6a50' },
            { offset: 1, color: '#689679' },
          ]),
        },
        label: {
          show: true,
          position: 'right',
          color: '#89b69b',
          fontSize: 11,
          formatter: '{c}%',
        },
      },
    ],
  });
}

function setBatch(batch: number) {
  currentBatch.value = batch;
  updateCategoryChart();
  updateMapChart();
  updateCityRankChart();
}

function toggleAutoPlay() {
  isPlaying.value = !isPlaying.value;
  if (isPlaying.value) {
    playInterval = setInterval(() => {
      let next = currentBatch.value + 1;
      if (next > 5) next = 0;
      setBatch(next);
    }, 4000);
  } else {
    clearInterval(playInterval);
  }
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    screenEl.value?.requestFullscreen?.();
    isFullscreen.value = true;
  } else {
    document.exitFullscreen?.();
    isFullscreen.value = false;
  }
}

function handleResize() {
  categoryChart?.resize();
  batchTrendChart?.resize();
  mapChart?.resize();
  cityRankChart?.resize();
  corridorChart?.resize();
}

function updateTime() {
  const now = new Date();
  const Y = now.getFullYear();
  const M = String(now.getMonth() + 1).padStart(2, '0');
  const D = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  currentTime.value = `${Y}年${M}月${D}日 ${h}:${m}:${s}`;
}

onMounted(() => {
  updateTime();
  timerId = setInterval(updateTime, 1000);
  window.addEventListener('resize', handleResize);

  setTimeout(() => {
    initCategoryChart();
    initBatchTrendChart();
    initMapChart();
    initCityRankChart();
    initCorridorChart();
  }, 100);
});

onBeforeUnmount(() => {
  clearInterval(timerId);
  if (playInterval) clearInterval(playInterval);
  window.removeEventListener('resize', handleResize);
  categoryChart?.dispose();
  batchTrendChart?.dispose();
  mapChart?.dispose();
  cityRankChart?.dispose();
  corridorChart?.dispose();
});
</script>

<style scoped>
/* 东方墨韵沉香展厅基底（摒弃科幻蓝黑网格，采用温润深古木与宣纸暗调） */
.heritage-scroll-root {
  width: 100%;
  min-height: 100vh;
  background-color: #16120e;
  background-image:
    radial-gradient(ellipse 70% 50% at 50% 0%, rgba(158, 42, 29, 0.08), transparent 70%),
    radial-gradient(ellipse 80% 60% at 50% 60%, rgba(30, 24, 18, 0.9), #14100c);
  color: #f2e9db;
  font-family: var(--zi-font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  padding: 16px 24px 24px;
}

/* 顶部展厅卷轴标头 */
.scroll-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 60px;
  border-bottom: 1px solid rgba(197, 155, 63, 0.25);
  margin-bottom: 14px;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 25%;
}
.btn-return {
  background: #251e18;
  border-color: #5a4531;
  color: #c59b3f;
  font-family: var(--zi-font-serif, serif);
}
.btn-return:hover {
  background: #36291f;
  border-color: #c59b3f;
  color: #ffffff;
}
.heritage-seal {
  font-family: var(--zi-font-serif, "STSong", "Songti SC", serif);
  font-size: 11px;
  padding: 2px 7px;
  border: 1px solid #9e2a1d;
  color: #9e2a1d;
  background: rgba(158, 42, 29, 0.08);
  border-radius: 2px;
  letter-spacing: 1px;
}

.header-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}
.header-arch-title {
  font-family: var(--zi-font-serif, "STSong", "Songti SC", "SimSun", serif);
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 2px;
  color: #fbf5ea;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.6);
}
.header-arch-sub {
  font-size: 11px;
  color: #9e8d79;
  letter-spacing: 1px;
  margin-top: 3px;
}

.header-right {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 14px;
  width: 25%;
}
.cur-time {
  font-family: var(--zi-font-serif, serif);
  font-size: 13px;
  color: #c59b3f;
  letter-spacing: 0.5px;
}
.btn-fullscreen {
  background: #251e18;
  border-color: #5a4531;
  color: #e5ded3;
}

/* 顶部核心指标通栏（文博馆开阔陈列） */
.stat-banner {
  display: flex;
  align-items: center;
  justify-content: space-around;
  background: #201913;
  border: 1px solid #3d3023;
  border-radius: 6px;
  padding: 12px 20px;
  margin-bottom: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
}
.stat-item {
  text-align: center;
  flex: 1;
}
.stat-title {
  font-family: var(--zi-font-serif, serif);
  font-size: 12px;
  color: #ab9b88;
  margin-bottom: 2px;
  letter-spacing: 0.5px;
}
.stat-number {
  font-family: var(--zi-font-serif, serif);
  font-size: 26px;
  font-weight: 700;
  line-height: 1.2;
}
.stat-number.gold { color: #d4a84e; }
.stat-number.vermilion { color: #c0392b; }
.stat-number.amber { color: #e67e22; }
.stat-number.pine { color: #3c6a50; }
.stat-unit {
  font-size: 12px;
  font-weight: normal;
  margin-left: 3px;
  color: #a89a87;
}
.stat-desc {
  font-size: 11px;
  color: #7a6b5a;
  margin-top: 2px;
}
.stat-divider {
  width: 1px;
  height: 36px;
  background: rgba(197, 155, 63, 0.15);
}

/* 主体交互网格（舒缓大间距） */
.scroll-body {
  display: grid;
  grid-template-columns: 290px minmax(0, 1fr) 290px;
  gap: 16px;
  flex: 1;
  min-height: 0;
}
@media (max-width: 1180px) {
  .scroll-body {
    grid-template-columns: 1fr;
  }
}

.scroll-col {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}
.side-col {
  min-width: 0;
}

/* 典雅卡片通用样式 */
.heritage-panel {
  background: #1f1812;
  border: 1px solid #3e3124;
  border-radius: 6px;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  min-width: 0;
}
.heritage-panel.flex-1 {
  flex: 1;
  min-height: 200px;
}
.panel-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-bottom: 8px;
  margin-bottom: 8px;
  border-bottom: 1px solid rgba(197, 155, 63, 0.15);
}
.panel-sym {
  color: #9e2a1d;
  font-size: 13px;
}
.panel-title {
  font-family: var(--zi-font-serif, "STSong", "Songti SC", serif);
  font-size: 13px;
  font-weight: 700;
  color: #f7eedb;
  margin: 0;
  letter-spacing: 0.5px;
}
.chart-container {
  flex: 1;
  width: 100%;
  min-height: 160px;
  min-width: 0;
}

/* 中央主地图视窗 */
.center-col {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.map-main-panel {
  flex: 1;
  min-height: 480px;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}
.map-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.ph-left {
  display: flex;
  align-items: center;
  gap: 6px;
}
.map-legend {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: #ab9b88;
}
.legend-chip {
  display: flex;
  align-items: center;
  gap: 4px;
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}
.dot.yellow { background: #c59b3f; }
.dot.green { background: #3c6a50; }
.dot.red { background: #9e2a1d; }

.map-container {
  flex: 1;
  width: 100%;
  min-height: 380px;
  min-width: 0;
}

/* 下置式时空切片控制器 */
.time-control-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #281f18;
  border: 1px solid #4a3a2b;
  border-radius: 6px;
  padding: 8px 14px;
  margin-top: 8px;
  flex-wrap: wrap;
  gap: 8px;
}
.btn-play-pause {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #9e2a1d;
  color: #fff;
  border: none;
  padding: 5px 12px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  font-family: var(--zi-font-serif, serif);
  transition: opacity 150ms;
}
.btn-play-pause:hover {
  opacity: 0.9;
}
.time-chips {
  display: flex;
  gap: 6px;
  flex-wrap: nowrap;
  overflow-x: auto;
}
.time-chip {
  background: #1b1510;
  border: 1px solid #443526;
  color: #a89985;
  padding: 4px 8px;
  border-radius: 3px;
  font-size: 11px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 160ms ease-out;
}
.time-chip:hover {
  border-color: #c59b3f;
  color: #f7eedb;
}
.time-chip.active {
  background: #c59b3f;
  border-color: #c59b3f;
  color: #1e1813;
  font-weight: bold;
}
</style>
