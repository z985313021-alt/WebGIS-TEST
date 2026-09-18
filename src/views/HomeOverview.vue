<template>
  <div class="portal-page" :class="{ 'panel-open': !!activeCat, 'chart-open': chartOpen }">
    <!-- 地图主体（圆角卡片，随左侧栏让位） -->
    <MapContainer ref="mapRef" />
    <MapControls />
    <ClusterPopup />

    <!-- 左侧：非遗门类印章墙 -->
    <aside class="cat-rail">
      <div class="rail-title">非遗门类</div>
      <button
        v-for="c in cats"
        :key="c.name"
        class="cat-btn"
        :class="{ active: activeCat === c.name }"
        :title="`${c.name} · ${c.count} 项`"
        @click="openCategory(c.name)"
      >
        <span class="seal" :style="{ background: colorOf(c.name) }">{{ glyphOf(c.name) }}</span>
        <span class="cnt">{{ c.count }}</span>
      </button>
      <button v-if="panelMode !== 'hot'" class="cat-btn reset" title="返回热度榜" @click="backToHot">
        <span class="seal seal-reset">✕</span>
        <span class="cnt">返回</span>
      </button>
    </aside>

    <!-- 侧栏面板：常态是热度榜，选中门类 / 下钻地市后换成对应清单 -->
    <aside class="cat-panel">
      <div class="panel-head">
        <button v-if="panelMode !== 'hot'" class="back-btn" @click="backToHot">← 返回热度榜</button>
        <span v-else class="panel-label">❖ 非遗热度榜</span>
        <span class="panel-tag">
          <i
            class="dot"
            :style="{ background: panelMode === 'category' ? colorOf(panelValue) : '#8a6b45' }"
          ></i>
          {{ panelMode === 'hot' ? `Top ${hotItems.length}` : panelTitle }}
        </span>
      </div>

      <!-- 常态：非遗热度榜 -->
      <template v-if="panelMode === 'hot'">
        <div class="panel-hint">综合热度 = 点赞×1 + 评论×3 + 关联订单×5</div>
        <div v-loading="hotLoading" class="panel-list">
          <div v-for="(it, idx) in hotItems" :key="it.id" class="pl-item" @click="focusItem(it)">
            <span class="rk" :class="idx < 3 ? 'medal medal-' + (idx + 1) : ''">{{ idx + 1 }}</span>
            <span class="seal seal-sm" :style="{ background: colorOf(it.category) }">{{ glyphOf(it.category) }}</span>
            <div class="pl-body">
              <div class="pl-name">{{ it.name }}</div>
              <div class="pl-meta">{{ it.city }} · 赞 {{ it.likes }} / 评 {{ it.comments }}</div>
            </div>
            <span class="pl-val">{{ it.heat }}</span>
          </div>
        </div>
      </template>

      <!-- 门类 / 地市清单 -->
      <template v-else>
        <div class="panel-hint">
          {{ panelMode === 'city' ? '已放大到该市，点击条目可定位并查看详情' : '点击条目可在地图上定位并查看详情' }}
        </div>
        <div class="panel-list">
          <div v-for="it in panelItems" :key="it.id + '-' + it.batch" class="pl-item" @click="focusItem(it)">
            <span class="seal seal-sm" :style="{ background: colorOf(it.category) }">{{ glyphOf(it.category) }}</span>
            <div class="pl-body">
              <div class="pl-name">{{ it.name }}</div>
              <div class="pl-meta">{{ it.city }} · {{ batchLabel(it.batch) }}</div>
            </div>
          </div>
        </div>
      </template>
    </aside>

    <!-- 右上：图表开关（点击展开 / 再点收起） -->
    <div class="chart-toggle">
      <button class="ct-btn" :class="{ active: chartOpen }" @click="chartOpen = !chartOpen">
        <el-icon><TrendCharts /></el-icon>
        <span>{{ chartOpen ? '收起图表' : '统计图表' }}</span>
      </button>
    </div>
    <transition name="chart-fade">
      <aside v-if="chartOpen" class="chart-drawer">
        <div class="cd-head">
          <span class="cd-title">❖ 非遗统计透视</span>
          <button class="cd-close" @click="chartOpen = false">✕</button>
        </div>
        <div class="cd-body">
          <MapChartPanel ref="chartPanelRef" :charts="['category', 'city']" />
        </div>
      </aside>
    </transition>

    <!-- 右侧：非遗详情卡 -->
    <CollapsiblePanel title="非遗详情" position="right" :visible="detailVisible" @close="detailVisible = false">
      <HeritageDetailCard />
    </CollapsiblePanel>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { TrendCharts } from '@element-plus/icons-vue';
import MapContainer from '@/components/map/MapContainer.vue';
import MapControls from '@/components/map/MapControls.vue';
import ClusterPopup from '@/components/map/ClusterPopup.vue';
import CollapsiblePanel from '@/components/panels/CollapsiblePanel.vue';
import HeritageDetailCard from '@/components/panels/HeritageDetailCard.vue';
import MapChartPanel from '@/components/panels/MapChartPanel.vue';
import { useDataStore } from '@/services/stores/dataStore';
import { useMapStore } from '@/services/stores/mapStore';
import { fetchHeritageRank, type HeritageRankItem } from '@/data/api/rank';
import { CATEGORIES, CATEGORY_COLORS, categoryGlyph, batchLabel } from '@/data/sources/heritage';

/**
 * 新地图主页（门户型）：
 * 左侧是十门类印章墙，点门类筛选地图并滑出该门类的项目清单；
 * 点地图上的地市可下钻到该市；统计图表收到右上角小按钮里按需展开。
 */
const store = useDataStore();
const mapStore = useMapStore();
store.init();

const mapRef = ref<InstanceType<typeof MapContainer> | null>(null);
const chartPanelRef = ref<InstanceType<typeof MapChartPanel> | null>(null);

/**
 * 侧栏面板三态：
 * - hot（常态）：非遗热度榜；页面一进来就展示
 * - category：选中某个门类后，换成该门类的非遗清单
 * - city：点地图下钻到某个地市后，换成该市的非遗清单
 */
type PanelMode = 'hot' | 'category' | 'city';
const panelMode = ref<PanelMode>('hot');
const panelValue = ref('');
const chartOpen = ref(false);
const detailVisible = ref(false);

const hotItems = ref<HeritageRankItem[]>([]);
const hotLoading = ref(false);

const cats = computed(() => CATEGORIES.map((name) => ({ name, count: store.categoryCounts[name] ?? 0 })));
const activeCat = computed(() => (panelMode.value === 'category' ? panelValue.value : null));

const panelItems = computed(() => {
  if (panelMode.value === 'category') return store.items.filter((i) => i.category === panelValue.value);
  if (panelMode.value === 'city') return store.items.filter((i) => i.city === panelValue.value);
  return [];
});
const panelTitle = computed(() => {
  if (panelMode.value === 'hot') return '非遗热度榜';
  const label = panelMode.value === 'category' ? panelValue.value : panelValue.value.replace(/市$/, '');
  return `${label} · ${panelItems.value.length} 项`;
});

async function loadHot() {
  hotLoading.value = true;
  try {
    hotItems.value = await fetchHeritageRank('heat', 20);
  } finally {
    hotLoading.value = false;
  }
}
loadHot();

const colorOf = (c: string) => CATEGORY_COLORS[c] ?? '#8a6b45';
const glyphOf = (c: string) => categoryGlyph(c);

/** 点门类：再点一次同一个则回到热度榜 */
function openCategory(name: string) {
  if (activeCat.value === name) {
    backToHot();
    return;
  }
  panelMode.value = 'category';
  panelValue.value = name;
  store.filterCity = null;
  store.filterCategories = [name];
  nextTick(() => mapRef.value?.getAdapter()?.fitToLayer('heritage', 80));
}

/** 点地图上的地市：适配器已缩放到该市，这里只负责筛选与面板（传进来的是"淄博市"这类全名） */
function openCity(cityFullName: string) {
  panelMode.value = 'city';
  panelValue.value = cityFullName;
  store.resetFilters();
  // dataStore 按 item.city 精确匹配，数据里带"市"后缀，故直接用全名
  store.filterCity = cityFullName;
}

/** 回到常态：展示热度榜并清除筛选 */
function backToHot() {
  panelMode.value = 'hot';
  panelValue.value = '';
  store.resetFilters();
}

// MapContainer 的挂载是异步的（内部要先探底图配置），所以监听适配器就绪后再绑定地市点击
watch(
  () => mapStore.mapAdapter,
  (adapter) => {
    if (adapter) adapter.onCityClick(openCity);
  },
  { immediate: true },
);

/** 清单/榜单条目 → 地图定位 + 打开详情卡（只用到 id，两类数据都适用） */
function focusItem(it: { id: number }) {
  store.select(it.id);
  store.pendingFlyTo = { id: it.id, zoom: 11 };
  detailVisible.value = true;
}

// 地图上选了要素也把详情卡打开（与地图主交互一致）
watch(
  () => store.selectedId,
  (id) => {
    if (id != null) detailVisible.value = true;
  },
);

// 展开图表时等 DOM 就绪再让 ECharts 重新测量尺寸
watch(chartOpen, (open) => {
  if (!open) return;
  nextTick(() => chartPanelRef.value?.resize());
});
</script>

<style scoped>
.portal-page {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  box-sizing: border-box;
  background: #efe7d6;
  /* 左侧为门类印章墙让位；二级面板展开时再让出一块 */
  --rail-w: 74px;
  --panel-w: 0px;
  padding: 10px 10px 10px calc(var(--rail-w) + 16px);
  transition: padding-left 340ms cubic-bezier(0.65, 0, 0.35, 1);
}
/* 侧栏面板常态展开，地图始终让出侧栏宽度（面板右缘与地图之间留 20px 呼吸） */
.portal-page {
  padding-left: calc(var(--rail-w) + 356px);
}

/* ---------- 门类印章墙 ---------- */
.cat-rail {
  position: absolute;
  left: 10px;
  top: 10px;
  bottom: 10px;
  width: var(--rail-w);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 10px 0;
  box-sizing: border-box;
  background: linear-gradient(180deg, #2a2320 0%, #1c1815 100%);
  border-radius: 12px;
  box-shadow: 2px 0 14px rgba(43, 34, 24, 0.18);
  overflow-y: auto;
  z-index: 20;
}
.rail-title {
  flex-shrink: 0;
  font-size: 11px;
  letter-spacing: 2px;
  color: #c9b89a;
  writing-mode: horizontal-tb;
  margin-bottom: 2px;
  font-family: var(--zi-font-serif, "STSong", "Songti SC", serif);
}
.cat-btn {
  flex-shrink: 0;
  width: 54px;
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
  background: rgba(184, 53, 43, 0.22);
  border-color: rgba(217, 160, 32, 0.6);
}
.seal {
  width: 30px;
  height: 30px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff8ec;
  font-size: 15px;
  font-weight: 700;
  font-family: KaiTi, STKaiti, SimSun, serif;
  box-shadow: inset 0 0 0 1px rgba(255, 248, 236, 0.5);
}
.seal-reset {
  background: #6b625a;
  font-size: 16px;
}
.cnt {
  font-size: 10px;
  color: #cdbda2;
  font-family: ui-monospace, Consolas, monospace;
}

/* ---------- 二级面板 ---------- */
.cat-panel {
  position: absolute;
  left: calc(var(--rail-w) + 16px);
  top: 10px;
  bottom: 10px;
  width: 320px;
  display: flex;
  flex-direction: column;
  background: #fffdf8;
  border-radius: 12px;
  border: 1px solid #e6ddcc;
  box-shadow: 2px 0 12px rgba(43, 34, 24, 0.07);
  overflow: hidden;
  z-index: 19;
}
.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid #f0e9da;
}
.back-btn {
  padding: 0;
  background: none;
  border: none;
  color: #b8352b;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.back-btn:hover {
  text-decoration: underline;
}
.panel-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: #6d4c2a;
}
.panel-tag .dot {
  width: 8px;
  height: 8px;
  border-radius: 2px;
}
.panel-hint {
  padding: 8px 12px 4px;
  font-size: 11px;
  color: #a08c72;
}
.panel-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px 10px;
}
.pl-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
}
.pl-item:hover {
  background: #f7f2e6;
}
.seal-sm {
  width: 22px;
  height: 22px;
  border-radius: 5px;
  font-size: 12px;
  flex-shrink: 0;
}
.pl-body {
  /* 撑满剩余宽度：否则数值列会随名称长短左右浮动，右边界对不齐 */
  flex: 1;
  min-width: 0;
}
.pl-name {
  font-size: 13px;
  color: #4a3a2f;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pl-meta {
  font-size: 11px;
  color: #a08c72;
}
/* 榜单名次与数值 */
.rk {
  flex: 0 0 20px;
  height: 20px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: #a08c72;
  background: #f2ece0;
  font-family: ui-monospace, Consolas, monospace;
}
.medal { color: #fff; }
.medal-1 { background: linear-gradient(135deg, #d4a03c, #b8802a); }
.medal-2 { background: linear-gradient(135deg, #b9b3a6, #948d80); }
.medal-3 { background: linear-gradient(135deg, #c88a55, #a96a37); }
.pl-val {
  /* 固定宽度 + 右对齐，让各行热度值成一条竖线 */
  flex: 0 0 46px;
  text-align: right;
  font-size: 12px;
  font-weight: 700;
  color: #b8352b;
  font-family: ui-monospace, Consolas, monospace;
}
.panel-label {
  font-size: 12px;
  font-weight: 700;
  color: #6d4c2a;
  font-family: var(--zi-font-serif, "STSong", "Songti SC", serif);
}

/* 面板滑入 */
.panel-slide-enter-active {
  transition: opacity 300ms cubic-bezier(0.65, 0, 0.35, 1), transform 300ms cubic-bezier(0.65, 0, 0.35, 1);
}
.panel-slide-leave-active {
  transition: opacity 220ms cubic-bezier(0.65, 0, 0.35, 1), transform 220ms cubic-bezier(0.65, 0, 0.35, 1);
}
.panel-slide-enter-from,
.panel-slide-leave-to {
  opacity: 0;
  transform: translateX(-24px);
}

/* ---------- 图表开关与抽屉 ---------- */
.chart-toggle {
  position: absolute;
  top: 10px;
  right: calc(12px + var(--chart-r, 0px));
  z-index: 28;
}
.ct-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  background: #fffdf8;
  border: 1px solid #d4c8af;
  border-radius: 8px;
  color: #3a3125;
  font-size: 12px;
  font-weight: 600;
  font-family: var(--zi-font-serif, "STSong", "Songti SC", serif);
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(43, 34, 24, 0.10);
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}
.ct-btn:hover,
.ct-btn.active {
  background: #b8352b;
  border-color: #b8352b;
  color: #fff8ec;
}
/* 图表展开时隐藏地图控件，避免遮挡 */
.portal-page.chart-open .map-controls { opacity: 0; pointer-events: none; transition: opacity .2s; }
.portal-page.chart-open :deep(.ol-overviewmap),
.portal-page.chart-open :deep(.ol-zoom),
.portal-page.chart-open :deep(.ol-rotate) { opacity: 0; pointer-events: none; }

.chart-drawer {
  position: absolute;
  top: 0;
  bottom: 0;
  right: 0;
  /* 宽度自适应：窄屏时收窄，保证不压住左侧的门类墙与热度榜面板 */
  width: min(380px, calc(100vw - 430px));
  min-width: 260px;
  display: flex;
  flex-direction: column;
  background: #fffdf8;
  border-left: 1px solid #e6ddcc;
  box-shadow: -4px 0 20px rgba(43, 34, 24, 0.10);
  overflow: hidden;
  z-index: 27;
}
.cd-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  border-bottom: 1px solid #f0e9da;
}
.cd-title {
  font-size: 13px;
  font-weight: 700;
  color: #6d4c2a;
  font-family: var(--zi-font-serif, "STSong", "Songti SC", serif);
}
.cd-close {
  background: none;
  border: none;
  color: #a08c72;
  font-size: 14px;
  cursor: pointer;
}
.cd-body {
  flex: 1;
  overflow-y: auto;
  padding: 10px 12px 16px;
}
.chart-fade-enter-active,
.chart-fade-leave-active {
  transition: opacity 260ms ease, transform 260ms cubic-bezier(0.65, 0, 0.35, 1);
}
.chart-fade-enter-from,
.chart-fade-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>
