<template>
  <div ref="screenEl" class="heritage-scroll-root" :class="{ 'is-open': scrollOpen }">
    <!-- 卷轴轴头：合拢时并拢在中间，展开后分置两端 -->
    <div class="scroll-rod rod-left"></div>
    <div class="scroll-rod rod-right"></div>

    <!-- 画心：整幅内容随卷轴展开而铺开 -->
    <div class="scroll-stage">
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

    <!--
      画卷左侧的「题签」：平时只在纸边露出一枚竖排题签（像引首题名），
      鼠标移入或点击题签才滑出十门类印章墙 —— 让它看着就是画卷的一部分。
    -->
    <aside class="cat-rail" :class="{ pinned: railPinned }">
      <button class="rail-tab" :class="{ active: railPinned }" @click="railPinned = !railPinned">
        <span class="tab-text">非遗门类</span>
        <span class="tab-seal">印</span>
      </button>
      <div class="rail-body">
        <button
          v-for="c in categoryChips"
          :key="c.name"
          class="cat-btn"
          :class="{ active: activeCategory === c.name }"
          :title="`${c.name} · ${c.count} 项`"
          @click="toggleCategory(c.name)"
        >
          <span class="seal" :style="{ background: c.color }">{{ c.glyph }}</span>
          <span class="cnt">{{ c.count }}</span>
        </button>
      </div>
    </aside>

    <!-- 原顶部指标通栏（已收起，大屏以地图为主体） -->
    <section v-if="false" class="stat-banner">
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
      <!-- 左翼图表（已收起，仅保留地图主体；需要时可再放回） -->
      <aside v-if="false" class="scroll-col side-col">
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
              <span class="legend-chip"><i class="dot seal-dot">印</i> 非遗点位（按门类印章）</span>
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

      <!-- 右翼图表（已收起） -->
      <aside v-if="false" class="scroll-col side-col">
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { Back, FullScreen, VideoPlay, VideoPause } from '@element-plus/icons-vue';
import * as echarts from 'echarts';
import { useDataStore } from '@/services/stores/dataStore';
import shandongGeo from '@/data/shandong-city-boundary.json';
import { CATEGORIES, CATEGORY_COLORS, categoryGlyph } from '@/data/sources/heritage';
import { sealIconDataUri } from '@/services/map/sealIcon';

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

/** 当前下钻的地市（null = 全省视角）；由地市榜点击驱动 */
const activeCity = ref<string | null>(null);
/** 当前选中的非遗门类（null = 全部门类）；由左侧印章墙驱动 */
const activeCategory = ref<string | null>(null);
/** 题签是否被钉住展开（悬停也会临时展开） */
const railPinned = ref(false);

/** 印章墙数据：沿用平台主页的十门类图标与色标 */
const categoryChips = computed(() =>
  CATEGORIES.map((name) => ({
    name,
    color: CATEGORY_COLORS[name] ?? '#8a6b45',
    glyph: categoryGlyph(name),
    count: dataStore.items.filter((i) => i.category === name).length,
  })),
);

/** 点门类：再点一次取消；筛选后地图与图表一起收敛 */
function toggleCategory(name: string) {
  activeCategory.value = activeCategory.value === name ? null : name;
  refreshAllCharts();
  applyCityFocus();
  // 选完就把题签收回去，让画面重新变回一整幅画
  window.setTimeout(() => {
    railPinned.value = false;
  }, 900);
}

// 过滤要素：批次 + 地市两级
const activeItems = computed(() => {
  let list = dataStore.items;
  if (currentBatch.value !== 0) list = list.filter((item) => item.batch === currentBatch.value);
  if (activeCity.value) list = list.filter((item) => item.city === activeCity.value);
  if (activeCategory.value) list = list.filter((item) => item.category === activeCategory.value);
  return list;
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
    '#9e2a1d', '#c9b89a', '#3c6a50', '#7a5a2a', '#a65628',
    '#5c7a82', '#b38242', '#8c3d2e', '#486856', '#d4a84e'
  ];

  categoryChart.setOption({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(43, 34, 24, 0.92)',
      borderColor: '#c9b89a',
      borderWidth: 1,
      textStyle: { color: '#4a3a2f', fontSize: 12 },
      formatter: '{b}：<b>{c}</b> 项 ({d}%)',
    },
    // 图例改底部横排：竖排在面板高度不足时会把文字压到饼图上
    legend: {
      orient: 'horizontal',
      bottom: 0,
      left: 'center',
      itemWidth: 8,
      itemHeight: 8,
      itemGap: 8,
      textStyle: { color: '#6d5b45', fontSize: 10, width: 58, overflow: 'truncate' },
      formatter: (name: string) => (name === '传统体育、游艺与杂技' ? '体育游艺' : name.replace(/^传统/, '')),
    },
    series: [
      {
        name: '非遗门类',
        type: 'pie',
        radius: ['40%', '66%'],
        center: ['50%', '44%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 3,
          borderColor: '#e6ddcc',
          borderWidth: 2,
        },
        color: colors,
        label: { show: false },
        emphasis: {
          label: {
            show: true,
            fontSize: 13,
            fontWeight: 'bold',
            color: '#b8352b',
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
      backgroundColor: 'rgba(43, 34, 24, 0.92)',
      borderColor: '#c9b89a',
      textStyle: { color: '#4a3a2f', fontSize: 12 },
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
        lineStyle: { color: '#c9b89a', width: 2.5 },
        itemStyle: { color: '#9e2a1d', borderColor: '#c9b89a', borderWidth: 1.5 },
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
  // 点地图上的地市 → 下钻该市（卷轴收起再展开的转场）
  mapChart.on('click', (params: { name?: string }) => {
    const name = params?.name;
    if (!name || !CITY_COORDS[name]) return; // 只响应地市区域，点到散点不触发
    void jumpToCity(name);
  });
}

function updateMapChart() {
  if (!mapChart) return;

  const cityCounts: Record<string, number> = {};
  activeItems.value.forEach((i) => {
    cityCounts[i.city] = (cityCounts[i.city] || 0) + 1;
  });

  // 逐项非遗印章：与地图主页同一套视觉符号（门类色印面 + 门类单字）
  // 不再做地市级聚合，也不加数量标注
  const scatterData = activeItems.value
    .filter((i) => Number.isFinite(i.lng) && Number.isFinite(i.lat))
    .map((i) => ({
      name: i.name,
      city: i.city,
      category: i.category,
      value: [i.lng, i.lat],
      symbol: 'image://' + sealIconDataUri(CATEGORY_COLORS[i.category] ?? '#8a6b45', categoryGlyph(i.category)),
    }));

  mapChart.setOption({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(43, 34, 24, 0.92)',
      borderColor: '#c9b89a',
      borderWidth: 1,
      textStyle: { color: '#4a3a2f', fontSize: 12 },
      formatter: (params: any) => {
        if (params.seriesType === 'scatter') {
          const d = params.data;
          return `<b>❖ ${d.name}</b><br/>${d.category ?? ''} · ${d.city ?? ''}`;
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
        // 宣纸山水：浅米底 + 淡墨描边，与整幅卷轴同色系
        areaColor: '#f7f0dd',
        borderColor: '#c9b89a',
        borderWidth: 1.2,
        shadowColor: 'rgba(43, 34, 24, 0.10)',
        shadowBlur: 12,
      },
      emphasis: {
        itemStyle: {
          areaColor: '#f0e0bc',
          borderColor: '#b8352b',
          borderWidth: 1.5,
        },
        label: {
          show: true,
          color: '#6d4c2a',
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
        // 不做流动光效：卷轴底色上跑光会显得很"电子屏"，
        // 只用静态虚线表现廊道走向
        effect: { show: false },
        lineStyle: {
          color: 'rgba(197, 155, 63, 0.75)',
          width: 2,
          curveness: 0.2,
          type: 'dashed',
        },
        data: [{ coords: yellowRiverLine }],
      },
      // 大运河工坊分布带
      {
        name: '❖ 京杭大运河（齐鲁段）工坊分布带',
        type: 'lines',
        coordinateSystem: 'geo',
        zlevel: 1,
        effect: { show: false },
        lineStyle: {
          color: 'rgba(60, 106, 80, 0.45)',
          width: 2.2,
          curveness: -0.15,
        },
        data: [{ coords: grandCanalLine }],
      },
      // 非遗点位：逐个用印章图标呈现（与主页一致），不做聚合、不加数量标注、不加涟漪
      {
        name: '非遗点位',
        type: 'scatter',
        coordinateSystem: 'geo',
        zlevel: 2,
        symbolSize: 20,
        label: { show: false },
        emphasis: { scale: 1.25 },
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
  // 点击柱条 → 下钻该市（卷轴收起再展开的转场）
  cityRankChart.on('click', (params: { name?: string }) => {
    if (params?.name) void jumpToCity(String(params.name));
  });
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
      backgroundColor: 'rgba(43, 34, 24, 0.92)',
      borderColor: '#c9b89a',
      textStyle: { color: '#4a3a2f', fontSize: 12 },
    },
    grid: { left: '16%', right: '12%', top: '12%', bottom: '18%', containLabel: false },
    xAxis: {
      type: 'value',
      axisLabel: { color: '#a69682', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(92, 77, 61, 0.35)' } },
    },
    yAxis: {
      type: 'category',
      data: cities,
      // interval:0 强制显示每个城市名，避免 ECharts 自动隔项隐藏造成标签与柱体错位
      axisLabel: { color: '#d9cbb7', fontSize: 11, interval: 0, margin: 8 },
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
                { offset: 1, color: '#c9b89a' },
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
      backgroundColor: 'rgba(43, 34, 24, 0.92)',
      borderColor: '#3c6a50',
      textStyle: { color: '#4a3a2f', fontSize: 12 },
    },
    grid: { left: '33%', right: '12%', top: '12%', bottom: '18%', containLabel: false },
    xAxis: {
      type: 'value',
      max: 100,
      axisLabel: { color: '#a69682', fontSize: 10, formatter: '{value}%' },
      splitLine: { lineStyle: { color: 'rgba(92, 77, 61, 0.35)' } },
    },
    yAxis: {
      type: 'category',
      data: ['胶东沿海民俗', '京杭大运河带', '黄河生态廊道', '齐长城文化带'],
      axisLabel: { color: '#d9cbb7', fontSize: 11, interval: 0, margin: 8 },
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

/**
 * 卷轴开合：进页时先合拢（两根轴并在中间），再横向展开把画心铺开，
 * 展开完成后中央地图才缓缓浮现 —— 即「卷轴展开、地图慢慢铺上去」。
 */
const scrollOpen = ref(false);
let scrollTimer: number | null = null;

/** 卷轴收起 → 执行切换 → 再展开（用于点击地市跳转的转场） */
async function withScrollTransition(mutate: () => void | Promise<void>) {
  scrollOpen.value = false;
  if (scrollTimer) window.clearTimeout(scrollTimer);
  await new Promise((r) => {
    scrollTimer = window.setTimeout(r, 520);
  });
  await mutate();
  await nextTick();
  mapChart?.resize();
  scrollOpen.value = true;
}

/** 图表随筛选数据整体刷新 */
function refreshAllCharts() {
  // 批次趋势与走廊覆盖比是静态基线，不随地市下钻变化
  updateCategoryChart();
  updateMapChart();
  updateCityRankChart();
}

/** 地图聚焦：全省 ↔ 某市 */
function applyCityFocus() {
  if (!mapChart) return;
  const city = activeCity.value;
  if (!city) {
    mapChart.setOption({ geo: { zoom: 1.16, center: [118.8, 36.3] } });
    return;
  }
  const coord = CITY_COORDS[city] ?? [118.8, 36.3];
  mapChart.setOption({ geo: { zoom: 2.6, center: coord } });
}

/**
 * 点击地市榜某个市：先把卷轴收起，切换视角与数据后再展开。
 * 再次点击同一个市则返回全省视角。
 */
async function jumpToCity(cityShort: string) {
  const full = cityShort.endsWith('市') ? cityShort : `${cityShort}市`;
  await withScrollTransition(async () => {
    activeCity.value = activeCity.value === full ? null : full;
    refreshAllCharts();
    applyCityFocus();
  });
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
    // 图表就绪后再展开卷轴，避免展开过程中图表尺寸测量为 0
    window.setTimeout(() => {
      scrollOpen.value = true;
      window.setTimeout(() => mapChart?.resize(), 820);
    }, 120);
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
/* ---------- 卷轴：轴头 + 画心 ---------- */
/* 整屏 = 一幅展开的卷轴：两根轴头先合拢在中间，再横向展开分置两端，
   画心（全部内容）随之铺开；中央地图在展开到位后缓缓浮现 */
.heritage-scroll-root {
  position: relative;
  overflow: hidden;
}
.scroll-rod {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 26px;
  z-index: 9;
  border-radius: 13px;
  background: linear-gradient(90deg, #7a5433 0%, #b08550 45%, #6d4c2a 100%);
  box-shadow:
    0 0 18px rgba(43, 34, 24, 0.26),
    inset 0 0 0 1px rgba(255, 248, 236, 0.4);
  transition: transform 640ms cubic-bezier(0.65, 0, 0.35, 1);
}
/* 合拢状态：两根轴并到屏幕中线 */
.rod-left {
  left: 0;
  transform: translateX(calc(50vw - 13px));
}
.rod-right {
  right: 0;
  transform: translateX(calc(-50vw + 13px));
}
.heritage-scroll-root.is-open .rod-left,
.heritage-scroll-root.is-open .rod-right {
  transform: translateX(0);
}

/* 画心：从中间向两侧展开 */
.scroll-stage {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  clip-path: inset(0 50% 0 50%);
  transition: clip-path 700ms cubic-bezier(0.65, 0, 0.35, 1);
}
.heritage-scroll-root.is-open .scroll-stage {
  clip-path: inset(0 0 0 0);
}

/* 地图显隐：卷轴动画期间完全不显示（visibility:hidden 不参与渲染），
   否则地图会跟着 clip-path 裁切区域不断重排，看起来"不跟手"。
   收起 → 立即隐藏；展开 → 等画心完全铺开(700ms)后再浮现。 */
.map-main-panel .map-container {
  opacity: 0;
  visibility: hidden;
  transform: scale(0.985);
  transition: opacity 240ms ease, visibility 0s linear 240ms, transform 240ms ease;
}
.heritage-scroll-root.is-open .map-main-panel .map-container {
  opacity: 1;
  visibility: visible;
  transform: none;
  transition: opacity 520ms ease 780ms, visibility 0s linear 780ms,
    transform 620ms cubic-bezier(0.65, 0, 0.35, 1) 780ms;
}

/* ---------- 画卷左侧「题签」与十门类印章墙 ---------- */
/* 平时只在纸边露出一枚竖排题签（像书画引首），点击才滑出印章墙 */
.cat-rail {
  position: absolute;
  /* 让开卷轴轴头（轴头占左侧 26px），题签贴在轴头右侧像画卷的引首 */
  left: 27px;
  top: 88px;
  z-index: 12;
  display: flex;
  align-items: flex-start;
  max-height: calc(100vh - 110px);
}
.rail-tab {
  position: relative;
  z-index: 2;
  width: 26px;
  padding: 12px 0 9px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  background: linear-gradient(180deg, #faf5e9 0%, #efe4cd 100%);
  border: 1px solid #d8c9a8;
  border-left: none;
  border-radius: 0 9px 9px 0;
  box-shadow: 2px 0 12px rgba(43, 34, 24, 0.12);
  cursor: pointer;
  transition: background 0.2s;
}
.rail-tab:hover,
.rail-tab.active {
  background: linear-gradient(180deg, #fff9ec 0%, #f3e9d4 100%);
}
.tab-text {
  writing-mode: vertical-rl;
  letter-spacing: 2.5px;
  font-size: 11px;
  color: #6d4c2a;
  font-family: var(--zi-font-serif, "STSong", "Songti SC", serif);
}
.tab-seal {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: #fff8ec;
  background: #b8352b;
  border-radius: 3px;
  font-family: KaiTi, STKaiti, SimSun, serif;
}
/* 印章墙：默认收在题签之后（与题签咬合），点击题签滑出 */
.rail-body {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 10px 8px;
  margin-left: -9px;
  padding-left: 14px;
  background: linear-gradient(180deg, #2a2320 0%, #1c1815 100%);
  border-radius: 0 12px 12px 0;
  box-shadow: 5px 0 20px rgba(43, 34, 24, 0.24);
  max-height: calc(100vh - 110px);
  overflow-y: auto;
  transform: translateX(-108%);
  transition: transform 430ms cubic-bezier(0.65, 0, 0.35, 1);
}
.cat-rail.pinned .rail-body {
  transform: translateX(0);
}
.cat-btn {
  flex: 0 0 auto;
  width: 50px;
  padding: 4px 0 3px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 9px;
  cursor: pointer;
  transition: background 0.18s, border-color 0.18s, transform 0.18s;
}
.cat-btn:hover {
  background: rgba(255, 248, 236, 0.08);
  transform: translateY(-1px);
}
.cat-btn.active {
  background: rgba(184, 53, 43, 0.24);
  border-color: rgba(217, 160, 32, 0.6);
}
.cat-btn .seal {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff8ec;
  font-size: 14px;
  font-weight: 700;
  font-family: KaiTi, STKaiti, SimSun, serif;
  box-shadow: inset 0 0 0 1px rgba(255, 248, 236, 0.5);
}
.cat-btn .cnt {
  font-size: 10px;
  color: #cdbda2;
  font-family: ui-monospace, Consolas, monospace;
}

/* 展厅基底：温润宣纸 + 朱砂淡晕 */
.heritage-scroll-root {
  width: 100%;
  min-height: 100vh;
  background-color: #efe7d6;
  background-image:
    radial-gradient(ellipse 70% 50% at 50% 0%, rgba(158, 42, 29, 0.08), transparent 70%),
    radial-gradient(ellipse 80% 60% at 50% 60%, rgba(158, 42, 29, 0.05), #f5efe0);
  color: #4a3a2f;
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
  flex: 0 0 auto;
}
.btn-return {
  background: #f8f2e4;
  border-color: #5a4531;
  color: #8a6b45;
  font-family: var(--zi-font-serif, serif);
}
.btn-return:hover {
  background: #f0e7d4;
  border-color: #8a6b45;
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
  min-width: 0;
  overflow: hidden;
  padding: 0 10px;
}
.header-arch-title {
  font-family: var(--zi-font-serif, "STSong", "Songti SC", "SimSun", serif);
  /* 字号随视口自适应，避免窄屏换行撑破 60px 头栏 */
  font-size: clamp(13px, 1.45vw, 22px);
  font-weight: 700;
  letter-spacing: clamp(0px, 0.14vw, 2px);
  color: #4a3a2f;
  text-shadow: none;
  white-space: nowrap;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}
.header-arch-sub {
  font-size: clamp(9px, 0.72vw, 11px);
  color: #9e8d79;
  letter-spacing: clamp(0px, 0.08vw, 1px);
  margin-top: 3px;
  white-space: nowrap;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}

.header-right {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 14px;
  flex: 0 0 auto;
}
.cur-time {
  font-family: var(--zi-font-serif, serif);
  font-size: 13px;
  color: #8a6b45;
  letter-spacing: 0.5px;
}
.btn-fullscreen {
  background: #f8f2e4;
  border-color: #5a4531;
  color: #6d5b45;
}

/* 顶部核心指标通栏（文博馆开阔陈列） */
.stat-banner {
  display: flex;
  align-items: center;
  justify-content: space-around;
  background: #faf5ea;
  border: 1px solid #3d3023;
  border-radius: 6px;
  padding: 12px 20px;
  margin-bottom: 16px;
  box-shadow: 0 4px 16px rgba(43, 34, 24, 0.10);
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
/* 主体：两翼图表已收起，只留中央地图，因此用 flex 让地图铺满整幅卷轴 */
.scroll-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1;
  min-height: 0;
  padding: 0 16px 16px;
  box-sizing: border-box;
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
  background: #fffdf8;
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
  min-height: 200px;
  min-width: 0;
}

/* 中央主地图视窗：两翼收起后需要撑满整幅卷轴（宽与高都要） */
.center-col {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  min-height: 0;
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
.legend-chip .seal-dot {
  width: 13px;
  height: 13px;
  border-radius: 3px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #b8352b;
  color: #fff8ec;
  font-size: 9px;
  font-family: KaiTi, STKaiti, SimSun, serif;
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
.dot.yellow { background: #d9a020; }
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
  background: #f6efe0;
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
  background: #fffdf8;
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
  border-color: #8a6b45;
  color: #f7eedb;
}
.time-chip.active {
  background: #c9b89a;
  border-color: #8a6b45;
  color: #e6ddcc;
  font-weight: bold;
}
</style>
