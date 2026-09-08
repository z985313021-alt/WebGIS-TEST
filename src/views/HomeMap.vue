<template>
  <div class="home-wrap">
    <!-- 底层地图视口 -->
    <MapContainer ref="mapRef" />

    <!-- Google Earth 风格：左侧垂直极简工具条 (Dock) -->
    <aside class="ge-dock">
      <div class="ge-dock-group">
        <!-- 1. 检索与筛选 -->
        <el-tooltip content="非遗检索与空间名录" placement="right" :show-after="150">
          <button
            class="ge-dock-btn"
            :class="{ active: activeDrawer === 'filter' }"
            @click="toggleDrawer('filter')"
          >
            <el-icon><Search /></el-icon>
            <span class="ge-btn-label">名录</span>
          </button>
        </el-tooltip>

        <!-- 2. 空间分析工作台 -->
        <el-tooltip content="空间分析与测绘工作台" placement="right" :show-after="150">
          <button
            class="ge-dock-btn"
            :class="{ active: activeDrawer === 'analysis' }"
            @click="toggleDrawer('analysis')"
          >
            <el-icon><DataAnalysis /></el-icon>
            <span class="ge-btn-label">分析</span>
          </button>
        </el-tooltip>

        <!-- 3. 图层态势与聚类 -->
        <el-tooltip content="图层态势与聚类控制" placement="right" :show-after="150">
          <button
            class="ge-dock-btn"
            :class="{ active: activeDrawer === 'layers' }"
            @click="toggleDrawer('layers')"
          >
            <el-icon><Operation /></el-icon>
            <span class="ge-btn-label">态势</span>
          </button>
        </el-tooltip>

        <!-- 4. 时空演变 -->
        <el-tooltip content="时空演变溯源" placement="right" :show-after="150">
          <button
            class="ge-dock-btn"
            :class="{ active: activeDrawer === 'time' }"
            @click="toggleDrawer('time')"
          >
            <el-icon><Timer /></el-icon>
            <span class="ge-btn-label">时空</span>
          </button>
        </el-tooltip>
      </div>

      <div class="ge-dock-divider"></div>

      <div class="ge-dock-group">
        <!-- 5. 齐鲁全景 -->
        <el-tooltip content="聚焦至山东全域全景" placement="right" :show-after="150">
          <button class="ge-dock-btn action" @click="zoomShandong">
            <el-icon><Aim /></el-icon>
            <span class="ge-btn-label">全景</span>
          </button>
        </el-tooltip>

        <!-- 6. 重置筛选 -->
        <el-tooltip content="重置全部筛选条件" placement="right" :show-after="150">
          <button class="ge-dock-btn action" @click="store.resetFilters()">
            <el-icon><RefreshRight /></el-icon>
            <span class="ge-btn-label">重置</span>
          </button>
        </el-tooltip>
      </div>
    </aside>

    <!-- Google Earth 风格：滑出抽屉侧边栏 (Flyout Drawer) -->
    <transition name="drawer-fade">
      <aside v-if="activeDrawer" class="ge-drawer">
        <!-- 抽屉标头 -->
        <div class="ge-drawer-header">
          <div class="ge-dh-title">
            <span class="symbol">❖</span>
            <span class="title-text">{{ drawerTitle }}</span>
          </div>
          <button class="ge-close-btn" @click="activeDrawer = null" title="收起面板">
            <el-icon><Close /></el-icon>
          </button>
        </div>

        <!-- 抽屉主体 -->
        <div class="ge-drawer-body">
          <!-- A. 检索与筛选名录 -->
          <div v-show="activeDrawer === 'filter'" class="ge-pane">
            <FilterPanel />
            <div class="list-section">
              <div class="list-header">
                <span class="list-title">非遗要素名录（{{ store.filteredItems.length }}）</span>
              </div>
              <div class="list-items" v-if="store.filteredItems.length" @scroll.passive="onListScroll">
                <div
                  v-for="(i, idx) in displayedItems"
                  :key="i.id"
                  class="heritage-card"
                  :class="{ active: store.selectedId === i.id }"
                  :style="{ '--i': idx % 20 }"
                  @click="selectItem(i.id)"
                >
                  <span class="hc-dot" :style="{ background: CATEGORY_COLORS[i.category] }"></span>
                  <div class="hc-body">
                    <div class="hc-head">
                      <span class="hc-name">{{ i.name }}</span>
                      <span
                        class="hc-pill"
                        :style="{ color: CATEGORY_COLORS[i.category], borderColor: CATEGORY_COLORS[i.category] + '40', background: CATEGORY_COLORS[i.category] + '14' }"
                      >
                        {{ i.category }}
                      </span>
                    </div>
                    <div class="hc-sub">
                      <span>{{ i.city }}{{ i.district ? ' · ' + i.district : '' }}</span>
                      <span class="hc-divider">/</span>
                      <span>{{ batchLabel(i.batch) }}</span>
                    </div>
                  </div>
                  <span class="hc-arrow">›</span>
                </div>
                <div v-if="displayLimit < store.filteredItems.length" class="list-loading-more">
                  向下滚动载入更多（已呈现 {{ displayedItems.length }} / {{ store.filteredItems.length }} 项）
                </div>
                <div v-else-if="store.filteredItems.length > PAGE_CHUNK" class="list-end">
                  已显示全部 {{ store.filteredItems.length }} 项非遗
                </div>
              </div>
              <div v-else class="list-empty">无匹配要素</div>
            </div>
          </div>

          <!-- B. 空间分析工作台 -->
          <div v-show="activeDrawer === 'analysis'" class="ge-pane">
            <AnalysisTools :get-adapter="getMapAdapter" />
          </div>

          <!-- C. 图层态势与聚类 -->
          <div v-show="activeDrawer === 'layers'" class="ge-pane">
            <div class="layer-settings">
              <div class="ls-section">
                <div class="ls-title">❖ 空间要素呈现形态</div>
                <div class="mode-cards">
                  <div
                    class="mode-card"
                    :class="{ active: mapStore.displayMode === 'normal' }"
                    @click="mapStore.setDisplayMode('normal')"
                  >
                    <div class="mc-head">
                      <span class="mc-title">❖ 标准单点分布</span>
                      <span class="mc-tag" v-if="mapStore.displayMode === 'normal'">生效中</span>
                    </div>
                    <div class="mc-desc">全量呈现 185+ 非遗空间坐标点位与十门类色标，适合精准识别与逐项查阅。</div>
                  </div>

                  <div
                    class="mode-card"
                    :class="{ active: mapStore.displayMode === 'cluster' }"
                    @click="mapStore.setDisplayMode('cluster')"
                  >
                    <div class="mc-head">
                      <span class="mc-title">❖ 点位动态聚类 (Cluster)</span>
                      <span class="mc-tag" v-if="mapStore.displayMode === 'cluster'">生效中</span>
                    </div>
                    <div class="mc-desc">小比例尺下合并邻近要素，防止点位重叠视觉阻挡，随地图放大自动分散。</div>
                    <div v-if="mapStore.displayMode === 'cluster'" class="mc-slider-wrap" @click.stop>
                      <div class="mc-slider-label">聚类聚合阈值：{{ mapStore.clusterDistance }}px</div>
                      <el-slider v-model="mapStore.clusterDistance" :min="20" :max="120" :step="5" />
                    </div>
                  </div>

                  <div
                    class="mode-card"
                    :class="{ active: mapStore.displayMode === 'heatmap' }"
                    @click="mapStore.setDisplayMode('heatmap')"
                  >
                    <div class="mc-head">
                      <span class="mc-title">❖ 空间密度热力 (Heatmap)</span>
                      <span class="mc-tag" v-if="mapStore.displayMode === 'heatmap'">生效中</span>
                    </div>
                    <div class="mc-desc">基于高斯核密度算法，可视化全鲁非遗要素在沿黄、沿运河及胶东的集聚态势。</div>
                  </div>
                </div>
              </div>

              <!-- 专题底图快速切换 -->
              <div class="ls-section">
                <div class="ls-title">❖ 多源高精度空间底图</div>
                <el-radio-group v-model="mapStore.provider" size="small" style="width: 100%">
                  <el-radio-button value="amap">高德矢量</el-radio-button>
                  <el-radio-button value="tianditu" :disabled="!mapStore.tiandituConfigured">天地图</el-radio-button>
                  <el-radio-button value="osm">OSM</el-radio-button>
                  <el-radio-button value="none">白模</el-radio-button>
                </el-radio-group>
                <div class="basemap-desc-tip">
                  当前底图：{{ basemapLabel }}
                </div>
              </div>
            </div>
          </div>

          <!-- D. 时空演变溯源 -->
          <div v-show="activeDrawer === 'time'" class="ge-pane">
            <div class="time-pane-content">
              <p class="time-desc">
                齐鲁非遗自 2006 年首批公布至今，历经五批次持续扩充与保护。展开下方时空演变控制器，可直观查看历次公布的项目空间扩张与文脉延续。
              </p>
              <div class="time-stats">
                <div v-for="b in 5" :key="b" class="time-stat-row">
                  <span class="tsr-batch">第 {{ ['一','二','三','四','五'][b-1] }} 批</span>
                  <div class="tsr-bar-wrap">
                    <div
                      class="tsr-bar"
                      :style="{ width: ((store.batchCounts[b] || 0) / (store.items.length || 1) * 100) + '%' }"
                    ></div>
                  </div>
                  <span class="tsr-num">{{ store.batchCounts[b] || 0 }} 项</span>
                </div>
              </div>
              <el-button
                type="primary"
                style="width: 100%; margin-top: 16px"
                @click="showTimeSlider = !showTimeSlider"
              >
                {{ showTimeSlider ? '收起时间轴底栏' : '展开时间轴底栏播放器' }}
              </el-button>
            </div>
          </div>
        </div>
      </aside>
    </transition>

    <!-- 右侧：非遗详情卡片 -->
    <CollapsiblePanel title="非遗详情" position="right" :visible="detailVisible" @close="detailVisible = false">
      <HeritageDetailCard />
    </CollapsiblePanel>

    <!-- 右侧悬浮快捷开关：展开/收起统计图表 -->
    <div class="ge-right-dock">
      <button
        class="ge-right-dock-btn"
        :class="{ active: chartDrawerVisible }"
        @click="toggleChartDrawer"
      >
        <el-icon><Histogram /></el-icon>
        <span>{{ chartDrawerVisible ? '收起图表' : '统计图表' }}</span>
      </button>
    </div>

    <!-- 右侧：可折叠/隐藏的数据统计图表抽屉 -->
    <transition name="drawer-right-fade">
      <aside v-if="chartDrawerVisible" class="ge-drawer-right">
        <div class="ge-drawer-header">
          <div class="ge-dh-title">
            <span class="symbol">❖</span>
            <span class="title-text">齐鲁非遗空间统计透视</span>
          </div>
          <button class="ge-close-btn" @click="chartDrawerVisible = false" title="隐藏图表">
            <el-icon><Close /></el-icon>
          </button>
        </div>
        <div class="ge-drawer-body">
          <MapChartPanel ref="chartPanelRef" />
        </div>
      </aside>
    </transition>

    <!-- 时空演变：流光批次时间轴控制器（可自由展开/收起） -->
    <TimeSlider v-if="showTimeSlider" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import {
  Search,
  DataAnalysis,
  Operation,
  Timer,
  Aim,
  RefreshRight,
  Close,
  Histogram,
} from '@element-plus/icons-vue';
import MapContainer from '@/components/map/MapContainer.vue';
import CollapsiblePanel from '@/components/panels/CollapsiblePanel.vue';
import FilterPanel from '@/components/panels/FilterPanel.vue';
import HeritageDetailCard from '@/components/panels/HeritageDetailCard.vue';
import AnalysisTools from '@/components/panels/AnalysisTools.vue';
import MapChartPanel from '@/components/panels/MapChartPanel.vue';
import TimeSlider from '@/components/map/TimeSlider.vue';
import { useMapStore } from '@/services/stores/mapStore';
import { useDataStore } from '@/services/stores/dataStore';
import { CATEGORY_COLORS, batchLabel } from '@/data/sources/heritage';

const route = useRoute();
const mapStore = useMapStore();
const store = useDataStore();
const mapRef = ref<InstanceType<typeof MapContainer> | null>(null);

const detailVisible = ref(false);
const showTimeSlider = ref(false);

// 右侧统计图表抽屉状态
const chartDrawerVisible = ref(route.query.chart === '1');
const chartPanelRef = ref<InstanceType<typeof MapChartPanel> | null>(null);

watch(
  () => route.query.chart,
  (c) => {
    if (c === '1') {
      chartDrawerVisible.value = true;
      nextTick(() => {
        chartPanelRef.value?.resize();
      });
    }
  }
);

function toggleChartDrawer() {
  chartDrawerVisible.value = !chartDrawerVisible.value;
  if (chartDrawerVisible.value) {
    nextTick(() => {
      chartPanelRef.value?.resize();
    });
  }
}

// Google Earth 风格抽屉状态：'filter' | 'analysis' | 'layers' | 'time' | null
const activeDrawer = ref<'filter' | 'analysis' | 'layers' | 'time' | null>(
  route.query.tool === 'analysis' ? 'analysis' : 'filter'
);

function toggleDrawer(name: 'filter' | 'analysis' | 'layers' | 'time') {
  if (activeDrawer.value === name) {
    activeDrawer.value = null;
  } else {
    activeDrawer.value = name;
  }
}

watch(
  () => route.query.tool,
  (tool) => {
    if (tool === 'analysis') {
      activeDrawer.value = 'analysis';
    }
  }
);

const drawerTitle = computed(() => {
  switch (activeDrawer.value) {
    case 'filter':
      return '非遗检索与空间名录';
    case 'analysis':
      return '空间分析与测绘工作台';
    case 'layers':
      return '图层呈现态势与聚类';
    case 'time':
      return '齐鲁非遗时空演变溯源';
    default:
      return '工作台';
  }
});

const basemapLabel = computed(() => {
  if (mapStore.provider === 'amap') return '高德地图（商业高精路网）';
  if (mapStore.provider === 'tianditu') return mapStore.tiandituConfigured ? '天地图' : '天地图（未配置密钥，回退高德）';
  if (mapStore.provider === 'osm') return 'OpenStreetMap';
  return '白模无底图';
});

// 大列表性能防护：采用渐进式滚动加载，避免硬截断与大量 DOM 节点卡顿
const PAGE_CHUNK = 50;
const displayLimit = ref(PAGE_CHUNK);

// 筛选条件变化时自动重置显示切片
watch(() => store.filteredItems, () => {
  displayLimit.value = PAGE_CHUNK;
});

const displayedItems = computed(() => store.filteredItems.slice(0, displayLimit.value));

function onListScroll(e: Event) {
  const el = e.target as HTMLElement;
  if (!el) return;
  // 距底部 80px 时无缝加载下一批
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 80) {
    if (displayLimit.value < store.filteredItems.length) {
      displayLimit.value += PAGE_CHUNK;
    }
  }
}

store.init();

function selectItem(id: number) {
  store.select(id);
  detailVisible.value = true;
  mapRef.value?.zoomToItem(id);
}

function zoomShandong() {
  mapStore.zoomTo([118.2, 36.3], 7);
}

// 供分析面板取地图适配器（优先 Pinia store，保证适配器完全收拢）
function getMapAdapter() {
  return mapStore.mapAdapter ?? mapRef.value?.getAdapter?.() ?? null;
}

// 点地图点位 → 自动展开详情
watch(
  () => store.selectedId,
  (id) => {
    if (id != null) detailVisible.value = true;
  }
);
</script>

<style scoped>
.home-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

/* =========================================================
   规范化深色停靠轨 (Docked Left Rail)
   ========================================================= */
.ge-dock {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 48px;
  background: var(--zi-dock-bg, #1c1815);
  border-right: 1px solid #2e261f;
  border-top: none;
  border-bottom: none;
  border-left: none;
  border-radius: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 8px 0;
  z-index: 30;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.2);
  box-sizing: border-box;
}

.ge-dock-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  width: 100%;
}

.ge-dock-btn {
  width: 48px;
  height: 48px;
  background: transparent;
  border: none;
  border-radius: 0;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #a99a86;
  font-size: 17px;
  position: relative;
  transition: background 150ms ease-out, color 150ms ease-out;
  padding: 0;
}

.ge-dock-btn:hover {
  background: #2b241e;
  color: #fffdf5;
  transform: none;
}

.ge-dock-btn.active {
  background: #2b241e;
  color: #d4a84e;
}

.ge-dock-btn.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--zi-gold, #d4a84e);
  border-radius: 0;
  box-shadow: none;
}

.ge-btn-label {
  font-size: 10px;
  transform: scale(0.9);
  margin-top: 2px;
  font-family: var(--zi-font-sans, system-ui, sans-serif);
  letter-spacing: 0.5px;
}

.ge-dock-divider {
  width: 24px;
  height: 1px;
  background: #332a22;
  margin: 6px auto;
}

.ge-dock-btn.action {
  color: #837563;
}
.ge-dock-btn.action:hover {
  color: #fffdf5;
  background: #2b241e;
}

/* =========================================================
   规范化停靠侧边栏抽屉 (Docked Left Drawer)
   ========================================================= */
.ge-drawer {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 48px;
  width: 380px;
  max-width: calc(100vw - 48px);
  background: var(--zi-surface-light, #fffdf8);
  border-right: 1px solid #dcd1ba;
  border-top: none;
  border-bottom: none;
  border-left: none;
  border-radius: 0;
  box-shadow: 2px 0 12px rgba(43, 34, 24, 0.08);
  z-index: 29;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.ge-drawer-header {
  height: 44px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 14px;
  background: #f7f2e7;
  border-bottom: 1px solid #e5dbcb;
  flex-shrink: 0;
}

.ge-dh-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: var(--zi-font-serif, "STSong", "Songti SC", serif);
  font-weight: 700;
  font-size: 14px;
  color: #3a2a1a;
  letter-spacing: 0.04em;
}

.ge-dh-title .symbol {
  color: var(--zi-red, #8f2317);
  font-size: 13px;
}

.ge-close-btn {
  width: 24px;
  height: 24px;
  border-radius: 3px;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8a7862;
  transition: all 0.15s;
}

.ge-close-btn:hover {
  background: rgba(143, 35, 23, 0.08);
  color: #8f2317;
}

.ge-drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 14px;
}

.ge-pane {
  display: flex;
  flex-direction: column;
}

/* 抽屉过渡：平滑淡入平移 */
.drawer-fade-enter-active {
  transition: opacity 220ms ease-out, transform 220ms ease-out;
}
.drawer-fade-leave-active {
  transition: opacity 160ms ease-in, transform 160ms ease-in;
}
.drawer-fade-enter-from,
.drawer-fade-leave-to {
  opacity: 0;
  transform: translateX(-12px);
}

/* =========================================================
   抽屉内容样式：筛选列表与 ihchina 展陈卡片
   ========================================================= */
.list-section {
  margin-top: 14px;
  border-top: 1px solid rgba(180, 134, 31, 0.18);
  padding-top: 12px;
}
.list-header {
  font-size: 12px;
  color: #7a6946;
  margin-bottom: 8px;
  font-weight: 600;
  font-family: var(--zi-font-serif, "STSong", serif);
}
.list-items {
  max-height: calc(100vh - 430px);
  min-height: 200px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

@keyframes cardSlideIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.heritage-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 4px;
  cursor: pointer;
  transition: border-color 150ms ease-out, background-color 150ms ease-out;
  background: #ffffff;
  border: 1px solid #e5dbcb;
  animation: cardSlideIn 200ms ease-out backwards;
  animation-delay: calc(var(--i, 0) * 14ms);
  user-select: none;
}
.heritage-card:hover {
  background: #fffdf8;
  border-color: #c9b794;
  transform: none;
  box-shadow: 0 2px 6px rgba(43, 34, 24, 0.05);
}
.heritage-card.active {
  background: #fcf4f3;
  border-color: #8f2317;
  box-shadow: none;
}
.hc-dot {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  flex-shrink: 0;
}
.hc-body {
  flex: 1;
  min-width: 0;
}
.hc-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
}
.hc-name {
  font-family: var(--zi-font-serif, "STSong", "Songti SC", serif);
  font-size: 13px;
  font-weight: 700;
  color: #2b2218;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.hc-pill {
  font-size: 10px;
  padding: 1px 4px;
  border-radius: 2px;
  border: 1px solid;
  white-space: nowrap;
  line-height: 1.2;
  flex-shrink: 0;
}
.hc-sub {
  font-size: 11px;
  color: #7a6946;
  margin-top: 3px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.hc-divider {
  color: #cbb898;
}
.hc-arrow {
  color: #cbb898;
  font-size: 13px;
  transition: transform 0.15s;
  flex-shrink: 0;
}
.heritage-card:hover .hc-arrow {
  transform: translateX(2px);
  color: #8f2317;
}

.list-loading-more {
  font-size: 11px;
  color: #8a7a58;
  text-align: center;
  padding: 8px 4px;
  background: rgba(240, 230, 210, 0.4);
  border-radius: 3px;
}
.list-end {
  font-size: 11px;
  color: #aaa;
  text-align: center;
  padding: 6px 0;
}
.list-empty {
  font-size: 12px;
  color: #bbb;
  text-align: center;
  padding: 30px 0;
}

/* =========================================================
   抽屉内容样式：图层与态势设置
   ========================================================= */
.layer-settings {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.ls-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ls-title {
  font-family: var(--zi-font-serif, "STSong", "Songti SC", serif);
  font-weight: 700;
  font-size: 13px;
  color: #3a2a1a;
}
.mode-cards {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.mode-card {
  padding: 10px 12px;
  background: #ffffff;
  border: 1px solid #e5dbcb;
  border-radius: 4px;
  cursor: pointer;
  transition: border-color 150ms ease-out, background-color 150ms ease-out;
}
.mode-card:hover {
  background: #fffdf8;
  border-color: #c9b794;
  transform: none;
}
.mode-card.active {
  background: #fcf4f3;
  border-color: #8f2317;
  box-shadow: none;
}
.mc-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}
.mc-title {
  font-weight: 600;
  font-size: 13px;
  color: var(--zi-ink, #2b2218);
}
.mc-tag {
  font-size: 10px;
  color: #fff;
  background: var(--zi-red, #8f2317);
  padding: 1px 5px;
  border-radius: 2px;
}
.mc-desc {
  font-size: 11px;
  color: #6d5b45;
  line-height: 1.5;
}
.mc-slider-wrap {
  margin-top: 8px;
  padding-top: 6px;
  border-top: 1px dashed rgba(180, 134, 31, 0.25);
}
.mc-slider-label {
  font-size: 11px;
  color: #4a3b2b;
  font-weight: 500;
}
.basemap-desc-tip {
  font-size: 11px;
  color: #7a6946;
  margin-top: 4px;
}

/* =========================================================
   抽屉内容样式：时空演变
   ========================================================= */
.time-pane-content {
  display: flex;
  flex-direction: column;
}
.time-desc {
  font-size: 12px;
  color: #6d5b45;
  line-height: 1.6;
  margin-bottom: 14px;
}
.time-stats {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.time-stat-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}
.tsr-batch {
  width: 50px;
  color: #4a3b2b;
  font-weight: 500;
}
.tsr-bar-wrap {
  flex: 1;
  height: 8px;
  background: rgba(180, 134, 31, 0.15);
  border-radius: 4px;
  overflow: hidden;
}
.tsr-bar {
  height: 100%;
  background: linear-gradient(90deg, #d4a84e, #8f2317);
  border-radius: 4px;
  transition: width 0.3s;
}
.tsr-num {
  width: 44px;
  text-align: right;
  color: #7a6946;
  font-size: 11px;
}

/* =========================================================
   规范化右侧图表开关按钮与停靠抽屉样式
   ========================================================= */
.ge-right-dock {
  position: absolute;
  top: 10px;
  right: 12px;
  z-index: 28;
}

.ge-right-dock-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  background: #fffdf8;
  border: 1px solid #d4c8af;
  border-radius: 4px;
  color: #3a3125;
  font-size: 12px;
  font-family: var(--zi-font-serif, "STSong", "Songti SC", serif);
  font-weight: 600;
  letter-spacing: 0.04em;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(43, 34, 24, 0.08);
  transition: all 0.15s ease-out;
}

.ge-right-dock-btn:hover {
  background: #f7f2e7;
  border-color: #8f2317;
  color: #8f2317;
  transform: none;
  box-shadow: 0 2px 8px rgba(43, 34, 24, 0.12);
}

.ge-right-dock-btn.active {
  background: #8f2317;
  border-color: #8f2317;
  color: #ffffff;
  box-shadow: none;
}

/* 右侧停靠抽屉 */
.ge-drawer-right {
  position: absolute;
  top: 0;
  bottom: 0;
  right: 0;
  width: 420px;
  max-width: 100vw;
  background: var(--zi-surface-light, #fffdf8);
  border-left: 1px solid #dcd1ba;
  border-top: none;
  border-bottom: none;
  border-right: none;
  border-radius: 0;
  box-shadow: -2px 0 12px rgba(43, 34, 24, 0.08);
  z-index: 29;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 右侧抽屉平滑淡入平移过渡 */
.drawer-right-fade-enter-active {
  transition: opacity 220ms ease-out, transform 220ms ease-out;
}
.drawer-right-fade-leave-active {
  transition: opacity 160ms ease-in, transform 160ms ease-in;
}
.drawer-right-fade-enter-from,
.drawer-right-fade-leave-to {
  opacity: 0;
  transform: translateX(12px);
}
</style>
