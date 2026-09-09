<template>
  <div class="map-chart-panel">
    <!-- 概览指标小卡片 -->
    <div class="stats-overview">
      <div class="stat-cell">
        <span class="sc-num">{{ store.filteredItems.length }}</span>
        <span class="sc-label">当前呈现项</span>
      </div>
      <div class="stat-cell">
        <span class="sc-num">{{ activeCategoriesCount }}</span>
        <span class="sc-label">覆盖非遗门类</span>
      </div>
      <div class="stat-cell">
        <span class="sc-num">{{ activeCitiesCount }}</span>
        <span class="sc-label">涉及齐鲁地市</span>
      </div>
    </div>

    <!-- 图表 1：门类分布 -->
    <div class="chart-block">
      <div class="cb-header">
        <span class="cb-title">❖ 十大门类结构分布</span>
        <span class="cb-tip">环形透视</span>
      </div>
      <div ref="pieEl" class="chart-canvas pie-canvas"></div>
    </div>

    <!-- 图表 2：地市排位（支持点击联动） -->
    <div class="chart-block">
      <div class="cb-header">
        <span class="cb-title">❖ 齐鲁 16 地市非遗梯队</span>
        <span class="cb-tip">点击柱条联动筛选</span>
      </div>
      <div ref="cityEl" class="chart-canvas city-canvas"></div>
    </div>

    <!-- 图表 3：国家级公布批次递进趋势 -->
    <div class="chart-block">
      <div class="cb-header">
        <span class="cb-title">❖ 保护批次累计沿革</span>
        <span class="cb-tip">历次公布规模</span>
      </div>
      <div ref="trendEl" class="chart-canvas trend-canvas"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed, nextTick } from 'vue';
import * as echarts from 'echarts';
import { useDataStore } from '@/services/stores/dataStore';
import { CATEGORY_COLORS, BATCHES, BATCH_LABELS } from '@/data/sources/heritage';

const store = useDataStore();

const pieEl = ref<HTMLElement | null>(null);
const cityEl = ref<HTMLElement | null>(null);
const trendEl = ref<HTMLElement | null>(null);

let pieChart: echarts.ECharts | null = null;
let cityChart: echarts.ECharts | null = null;
let trendChart: echarts.ECharts | null = null;

const activeCategoriesCount = computed(() => {
  const s = new Set(store.filteredItems.map((i) => i.category));
  return s.size;
});

const activeCitiesCount = computed(() => {
  const s = new Set(store.filteredItems.map((i) => i.city));
  return s.size;
});

function initCharts() {
  if (pieEl.value && !pieChart) {
    pieChart = echarts.init(pieEl.value);
  }
  if (cityEl.value && !cityChart) {
    cityChart = echarts.init(cityEl.value);
    // 点击地市柱子联动地图筛选
    cityChart.on('click', (params: any) => {
      if (params.name) {
        store.filterCity = params.name;
      }
    });
  }
  if (trendEl.value && !trendChart) {
    trendChart = echarts.init(trendEl.value);
  }

  updateCharts();
}

function updateCharts() {
  const items = store.filteredItems;
  if (!items.length) return;

  // 1. 门类分布饼图
  if (pieChart) {
    const catCounts: Record<string, number> = {};
    items.forEach((i) => {
      catCounts[i.category] = (catCounts[i.category] || 0) + 1;
    });

    const pieData = Object.entries(catCounts).map(([name, value]) => ({
      name,
      value,
      itemStyle: { color: CATEGORY_COLORS[name] || '#999' },
    }));

    pieChart.setOption({
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} 项 ({d}%)',
        backgroundColor: 'rgba(43, 34, 24, 0.9)',
        borderColor: '#b4861f',
        textStyle: { color: '#fbf8ef', fontSize: 12 },
      },
      legend: {
        orient: 'horizontal',
        bottom: 0,
        itemWidth: 8,
        itemHeight: 8,
        textStyle: { fontSize: 10, color: '#6d5b45' },
      },
      series: [
        {
          type: 'pie',
          radius: ['36%', '68%'],
          center: ['50%', '42%'],
          avoidLabelOverlap: false,
          label: { show: false },
          emphasis: {
            label: {
              show: true,
              fontSize: 12,
              fontWeight: 'bold',
              color: '#2b2218',
            },
          },
          data: pieData,
        },
      ],
    }, true);
  }

  // 2. 地市排行横向柱状图
  if (cityChart) {
    const cityCounts: Record<string, number> = {};
    items.forEach((i) => {
      cityCounts[i.city] = (cityCounts[i.city] || 0) + 1;
    });

    const sortedCities = Object.entries(cityCounts)
      .sort((a, b) => a[1] - b[1])
      .slice(-10);

    const names = sortedCities.map((c) => c[0]);
    const values = sortedCities.map((c) => c[1]);

    cityChart.setOption({
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(43, 34, 24, 0.9)',
        borderColor: '#b4861f',
        textStyle: { color: '#fbf8ef', fontSize: 12 },
      },
      grid: { left: '16%', right: '12%', top: '10%', bottom: '10%' },
      xAxis: {
        type: 'value',
        splitLine: { lineStyle: { stroke: 'rgba(180, 134, 31, 0.15)', type: 'dashed' } },
        axisLabel: { fontSize: 10, color: '#8d8266' },
      },
      yAxis: {
        type: 'category',
        data: names,
        axisLine: { lineStyle: { color: 'rgba(180, 134, 31, 0.3)' } },
        axisLabel: { fontSize: 11, color: '#3a3125' },
      },
      series: [
        {
          type: 'bar',
          data: values,
          itemStyle: {
            borderRadius: [0, 4, 4, 0],
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: '#b4861f' },
              { offset: 1, color: '#8f2317' },
            ]),
          },
          label: { show: true, position: 'right', fontSize: 10, color: '#8f2317' },
        },
      ],
    }, true);
  }

  // 3. 批次递增折线柱状图
  if (trendChart) {
    const bCounts = BATCHES.map((b) => items.filter((i) => i.batch === b).length);

    trendChart.setOption({
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(43, 34, 24, 0.9)',
        borderColor: '#b4861f',
        textStyle: { color: '#fbf8ef', fontSize: 12 },
      },
      grid: { left: '14%', right: '8%', top: '15%', bottom: '18%' },
      xAxis: {
        type: 'category',
        data: BATCHES.map((b) => BATCH_LABELS[b]),
        axisLine: { lineStyle: { color: 'rgba(180, 134, 31, 0.3)' } },
        axisLabel: { fontSize: 10, color: '#3a3125' },
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { stroke: 'rgba(180, 134, 31, 0.15)', type: 'dashed' } },
        axisLabel: { fontSize: 10, color: '#8d8266' },
      },
      series: [
        {
          type: 'line',
          smooth: true,
          data: bCounts,
          symbolSize: 6,
          itemStyle: { color: '#8f2317' },
          lineStyle: { width: 3, color: '#8f2317' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(143, 35, 23, 0.35)' },
              { offset: 1, color: 'rgba(143, 35, 23, 0.02)' },
            ]),
          },
        },
      ],
    }, true);
  }
}

function handleResize() {
  pieChart?.resize();
  cityChart?.resize();
  trendChart?.resize();
}

defineExpose({
  resize: handleResize,
});

watch(
  () => store.filteredItems,
  () => {
    nextTick(updateCharts);
  },
  { deep: true }
);

onMounted(() => {
  nextTick(() => {
    initCharts();
    window.addEventListener('resize', handleResize);
  });
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  pieChart?.dispose();
  cityChart?.dispose();
  trendChart?.dispose();
});
</script>

<style scoped>
.map-chart-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* 概览指标卡片 */
.stats-overview {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(180, 134, 31, 0.22);
  border-radius: 10px;
  padding: 12px 8px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(43, 34, 24, 0.04);
}
.stat-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.sc-num {
  font-size: 22px;
  font-weight: 700;
  color: var(--zi-red, #8f2317);
  font-family: var(--zi-font-serif, "STSong", serif);
  line-height: 1.1;
}
.sc-label {
  font-size: 11px;
  color: #6d5b45;
  margin-top: 4px;
  font-family: var(--zi-font-serif, "STSong", serif);
}

/* 图表区块 */
.chart-block {
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(180, 134, 31, 0.16);
  border-radius: 10px;
  padding: 12px 14px;
  box-shadow: 0 2px 10px rgba(43, 34, 24, 0.04);
}
.cb-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  border-bottom: 1px solid rgba(180, 134, 31, 0.14);
  padding-bottom: 6px;
}
.cb-title {
  font-family: var(--zi-font-serif, "STSong", serif);
  font-weight: 700;
  font-size: 13px;
  color: #4a3b2b;
}
.cb-tip {
  font-size: 10.5px;
  color: #8d8266;
}

.chart-canvas {
  width: 100%;
}
.pie-canvas {
  height: 200px;
}
.city-canvas {
  height: 220px;
}
.trend-canvas {
  height: 160px;
}
</style>
