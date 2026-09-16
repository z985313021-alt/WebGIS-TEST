<template>
  <div ref="mapEl" class="map-container" :class="{ 'guest-mode': !userStore.isLoggedIn }"></div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch, nextTick } from 'vue';
import { OLMapAdapter } from '@/services/map/OLMapAdapter';
import { useMapStore } from '@/services/stores/mapStore';
import { useDataStore } from '@/services/stores/dataStore';
import { useUserStore } from '@/services/stores/userStore';
import { CATEGORY_COLORS } from '@/data/sources/heritage';
import { loadShandongBoundary } from '@/data/sources/shandongBoundary';
import { loadShandongCityBoundary } from '@/data/sources/shandongCityBoundary';

const mapEl = ref<HTMLElement | null>(null);
const mapStore = useMapStore();
const dataStore = useDataStore();
const userStore = useUserStore();
let adapter: OLMapAdapter | null = null;

/** 坐标分格 key：0.005° ≈ 550m 网格，用于把同格内重叠的多个非遗点环形散开 */
function coordKey(lng: number, lat: number): string {
  return `${Math.round(lng / 0.005)},${Math.round(lat / 0.005)}`;
}

/**
 * 重叠点环形散开：同一格(≈550m)内多个非遗点绕中心排成小环，
 * 半径随组内数量增大（≈130m × n，最多约 900m），避免 pin 完全重叠。
 * 偏移完全由数据顺序决定（确定性），刷新/筛选后位置不变。
 */
function spreadCoord(item: (typeof dataStore.items)[number]): [number, number] {
  const key = coordKey(item.lng, item.lat);
  const same = dataStore.items.filter((o) => coordKey(o.lng, o.lat) === key);
  if (same.length <= 1) return [item.lng, item.lat];
  const idx = same.findIndex((o) => o.id === item.id);
  const r = 0.0012 * same.length;
  const angle = -Math.PI / 2 + (idx * 2 * Math.PI) / same.length;
  const latRad = (item.lat * Math.PI) / 180;
  return [
    item.lng + (r * Math.cos(angle)) / Math.cos(latRad),
    item.lat + r * Math.sin(angle),
  ];
}

// 把 store 数据转成带颜色的 GeoJSON（分类样式由显示层注入，adapter 保持通用）
function heritageGeojson(): object {
  return {
    type: 'FeatureCollection',
    features: dataStore.items.map((i) => {
      const [lng, lat] = spreadCoord(i);
      return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [lng, lat] },
        properties: { ...i, color: CATEGORY_COLORS[i.category] ?? '#999999' },
      };
    }),
  };
}

onMounted(async () => {
  dataStore.init();
  if (!mapEl.value) return;
  // 先查后端 tk 是否配置（逻辑层 action），供底图切换 UI 判断天地图是否可用
  await mapStore.checkTianditu();
  // 默认 OSM 底图（无需密钥，始终可加载）；天地图由侧边栏手动切换
  adapter = new OLMapAdapter();
  // 未登录不加载任何在线瓦片（改用离线底图），避免游客白白消耗服务器出口流量
  adapter.setOnlineTilesAllowed(userStore.isLoggedIn);
  // 默认使用 store 中配置的底图（osm / tianditu / none）
  adapter.mount(mapEl.value, mapStore.provider);
  // 山东省边界高亮（合并地市界 → 单一省界，加粗描边）
  adapter.addBoundaryLayer(loadShandongBoundary(), 'shandong-boundary');
  adapter.addCityBoundaryLayer(loadShandongCityBoundary(), 'shandong-city');
  // 成员2：设置行政热力图的市界数据
  adapter.setChoroplethBoundary(loadShandongCityBoundary());
  adapter.addGeoJsonLayer(heritageGeojson(), 'heritage');
  syncHeritageFilter();
  adapter.onFeatureClick((props) => {
    dataStore.select(props ? (props.id as number) : null);
  });
  // 成员2增强：聚合圆点击 → 显示点位列表弹窗
  adapter.onClusterClick((items, center) => {
    mapStore.showClusterPopup(items, center);
  });
  // 监听容器尺寸：面板展开/收起挤压地图时保持瓦片与坐标正确
  if (typeof ResizeObserver !== 'undefined') {
    // 容器尺寸变化即重算视口（鹰眼图由 OL 自身跟随主地图尺寸更新）
    sizeObserver = new ResizeObserver(() => adapter?.updateSize());
    sizeObserver.observe(mapEl.value);
  }
  mapStore.setMapAdapter(adapter);
  // 登录/退出后立即切换在线瓦片策略：登录即恢复天地图底图，退出改用离线底图
  watch(
    () => userStore.isLoggedIn,
    (logged) => adapter?.setOnlineTilesAllowed(logged),
  );
  // 挂载后同步一次已存在的数据集（从数据管理页跳转过来的场景）
  syncUserDatasets();
  // 关键：详情页跳转回来时 pendingFlyTo 可能早已设好（watch 不会对旧值触发），
  // 这里主动消费一次，让"在地图上查看"真正执行飞行定位动画。
  consumePendingFlyTo();
  // 关键：数据管理页加载图层后跳转过来时 pendingZoomToDatasetId 可能早已设好，
  // 这里主动消费一次，让地图自动缩放到新图层范围。
  consumePendingZoomToDataset();
  // 成员2：首次统计行政热力图数据（按城市统计非遗数量）
  updateChoroplethData();
  // 首次挂载全图"生长"一遍：所有点按确定性延迟逐个弹出，一进页面即有代入感。
  // 若非时空演变打点(first-load)则整层重播；因 batch 未设，等价于全部可见点生长。
  await nextTick();
  adapter?.playBirthAnimation();
});

// 筛选条件变化 → 地图图层筛选 + 行政热力图数据更新
/**
 * 可见要素 id 集合：样式函数对每个要素都会被调用一次，
 * 用 Set 把筛选判断从「逐个遍历可见列表」降到 O(1)，
 * 在脉冲动效/平移这类高频重绘下差异明显。
 */
let heritageIdSet = new Set<number>();
function syncHeritageFilter() {
  heritageIdSet = new Set(dataStore.filteredItems.map((i) => i.id));
  adapter?.setLayerFilter('heritage', (p) => heritageIdSet.has(p.id as number));
}

watch(
  () => dataStore.filteredItems,
  () => {
    syncHeritageFilter();
    updateChoroplethData();
  },
);

// 成员2：按城市统计当前筛选后的非遗数量，更新行政热力图
function updateChoroplethData() {
  if (!adapter) return;
  const counts: Record<string, number> = {};
  for (const item of dataStore.filteredItems) {
    // city 字段可能是"济南市"或"济南"，市界数据用的是简称"济南"
    const city = (item.city || '').replace(/市$/, '');
    if (city) counts[city] = (counts[city] || 0) + 1;
  }
  adapter.setChoroplethData(counts);
}

// 时空演变（批次上限变化）→ 仅新出现的点触发"出生"生长动画
// 记录上次可见 id 集合，diff 出本次新增的点（第一批出现/批次上调才弹；回退/清空不弹）
let lastVisibleIds = new Set<number>();
function visibleIdSet(): Set<number> {
  return new Set(dataStore.filteredItems.map((i) => i.id));
}
watch(
  () => dataStore.filterBatchMax,
  () => {
    const next = visibleIdSet();
    const added: number[] = [];
    next.forEach((id) => {
      if (!lastVisibleIds.has(id)) added.push(id);
    });
    // 首载（filterBatchMax 从未设置过且 lastVisible 为空时）交给首载全图生长，不在此弹
    if (adapter && added.length > 0) {
      adapter.playBirthAnimation(added);
    }
    lastVisibleIds = next;
  },
);

// 选中变化 → 高亮
watch(
  () => dataStore.selectedId,
  (id) => adapter?.setHighlightId(id),
);

// 详情页点击"在地图上查看" → 自动飞行定位+局部放大
// 注意：pendingFlyTo 在跳转前就设好了值，组件挂载后 watch 不会对"已存在的旧值"触发，
// 因此 onMounted 里会主动消费一次（见 mount 末尾），此处 watch 负责挂载后再次变化的场景。
async function consumePendingFlyTo() {
  const target = dataStore.pendingFlyTo;
  if (!target || !adapter) return;
  // 自动切换到普通模式，确保聚合/热力图模式下也能看到单个点位
  if (mapStore.displayMode !== 'normal') {
    mapStore.setDisplayMode('normal');
  }
  await nextTick();
  if (target.id != null) {
    dataStore.select(target.id);
    zoomToItem(target.id, target.zoom);
  } else if (target.coord) {
    adapter.zoomTo(target.coord, target.zoom);
  }
  dataStore.pendingFlyTo = null;
}
watch(
  () => dataStore.pendingFlyTo,
  () => consumePendingFlyTo(),
);

// 数据管理页加载图层后 → 自动缩放到该图层完整范围
async function consumePendingZoomToDataset() {
  const id = dataStore.pendingZoomToDatasetId;
  if (id == null || !adapter) return;
  // 等两帧确保图层已渲染完成
  await nextTick();
  await nextTick();
  adapter.fitToLayer(`user-${id}`, 100);
  dataStore.pendingZoomToDatasetId = null;
}

// 用户上传数据集 → 叠加图层（按 id 增量渲染）
const renderedDatasets = new Set<number>();
function syncUserDatasets() {
  if (!adapter) return;
  const ids = dataStore.userDatasets.map((d) => d.id);
  for (const d of dataStore.userDatasets) {
    if (!renderedDatasets.has(d.id)) {
      adapter.addGeoJsonLayer(d.geojson, `user-${d.id}`);
      renderedDatasets.add(d.id);
    }
  }
  for (const rid of renderedDatasets) {
    if (!ids.includes(rid)) {
      adapter.removeLayer(`user-${rid}`);
      renderedDatasets.delete(rid);
    }
  }
}
watch(
  () => dataStore.userDatasets.map((d) => d.id),
  () => syncUserDatasets(),
);

// 数据管理页加载图层后 → 自动缩放到该图层完整范围
watch(
  () => dataStore.pendingZoomToDatasetId,
  () => consumePendingZoomToDataset(),
);

// 底图类型切换（vec/img，仅天地图生效）
watch(() => mapStore.baseMap, (t) => adapter?.setBaseMap(t));
// 底图提供商切换（天地图 / OSM）
watch(() => mapStore.provider, (p) => adapter?.setProvider(p));

// 成员2：地图显示模式切换（普通/点位聚合/密度热力图/行政区域热力图，四种互斥）
watch(
  () => mapStore.displayMode,
  (mode) => {
    if (!adapter) return;
    // 先关闭所有特殊模式
    adapter.setClusterMode(false);
    adapter.setHeatmapMode(false);
    adapter.setChoroplethMode(false);
    // 再开启目标模式
    if (mode === 'cluster') {
      adapter.setClusterMode(true);
    } else if (mode === 'heatmap') {
      adapter.setHeatmapMode(true);
    } else if (mode === 'choropleth') {
      // 开启前确保数据最新
      updateChoroplethData();
      adapter.setChoroplethMode(true);
    }
  },
);
// 成员2：聚合距离变化
watch(() => mapStore.clusterDistance, (d) => adapter?.setClusterDistance(d));

// 容器尺寸自适应：左右面板展开会挤压地图容器，OL 不会自动重算视口。
// 这里在 ResizeObserver 回调里同步 updateSize：该回调发生在布局之后、绘制之前，
// 同步执行可保证当帧就按新尺寸渲染；若经 requestAnimationFrame 转发会晚一帧，
// 表现为展开过程中地图内容逐帧错位（观感即抖动）。
let sizeObserver: ResizeObserver | null = null;

onBeforeUnmount(() => {
  sizeObserver?.disconnect();
  sizeObserver = null;
  mapStore.setMapAdapter(null);
  adapter?.destroy();
  adapter = null;
});

// 供父组件调用：定位到某要素（列表点击）
function zoomToItem(id: number, customZoom?: number) {
  const item = dataStore.items.find((i) => i.id === id);
  const zoom = customZoom ?? 13;
  if (item && adapter) adapter.zoomTo(spreadCoord(item), zoom);
}
function getAdapter() {
  return adapter;
}
defineExpose({ zoomToItem, getAdapter });
</script>

<style scoped>
/* 游客视图水印：纯 CSS 伪元素，不往地图 DOM 里插节点，避免干扰 OpenLayers */
.map-container.guest-mode::after {
  content: "游客视图 · 底图已关闭以节省流量，登录后查看完整地图";
  position: absolute;
  left: 50%;
  top: 10px;
  transform: translateX(-50%);
  z-index: 5;
  padding: 5px 14px;
  border-radius: 999px;
  background: rgba(43, 34, 24, 0.72);
  color: #fdf6e6;
  font-size: 12px;
  letter-spacing: 0.5px;
  pointer-events: none;
  white-space: nowrap;
}

.map-container {
  width: 100%;
  height: 100%;
  background: #f7f3e8;
  /* 圆角卡片容器：地图不再满铺，边界内收，观感更像专业系统 */
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid #e0d5bc;
  box-shadow: 0 3px 16px rgba(109, 76, 42, 0.10);
}

/* ---------- 鹰眼图：中式画框 + 按控件实际高度避让 ---------- */
/* 定位：右下角，底边紧跟控件组上方（--controls-h 由 MapControls 实时写入，
   控件内容变化时自动让位，避免与罗盘/缩放/温度压叠） */
.map-container :deep(.ol-overviewmap) {
  left: auto !important;
  right: 10px !important;
  bottom: calc(var(--controls-h, 150px) + 20px) !important;
  /* 关键：不能加 padding/border —— OL 按容器像素尺寸设置小地图大小，
     额外内边距/边框会让小地图溢出被裁掉（曾导致鹰眼图只剩标签）。
     描边与外发光一律用 box-shadow 实现，不占盒模型。 */
  padding: 0 !important;
  border: none !important;
  border-radius: 10px;
  background: #fffdf8;
  box-shadow:
    0 0 0 2px #c9b89a,
    0 0 0 3px rgba(255, 248, 236, 0.85),
    0 8px 22px rgba(43, 34, 24, 0.22);
  overflow: hidden;
}
/* 左上角印章式标签 */
.map-container :deep(.ol-overviewmap::before) {
  content: '齐鲁全图';
  position: absolute;
  top: 0;
  left: 0;
  z-index: 3;
  /* 标签尽量小，避免遮挡小地图内容 */
  padding: 1px 6px 2px;
  font-size: 9px;
  letter-spacing: 1px;
  color: #fff8ec;
  background: linear-gradient(135deg, #c03a1e, #8f2317);
  border-bottom-right-radius: 9px;
  font-family: KaiTi, STKaiti, SimSun, serif;
  pointer-events: none;
}
/* 内层小地图：留出一条描金细边 */
.map-container :deep(.ol-overviewmap-map) {
  border-radius: 8px;
  box-shadow: inset 0 0 0 1px rgba(226, 211, 182, 0.9);
  overflow: hidden;
}
/* 折叠按钮：与整体风格统一 */
.map-container :deep(.ol-overviewmap-toggle) {
  background: rgba(255, 253, 248, 0.94);
  border: 1px solid #c9b89a;
  border-radius: 4px;
  color: #6d4c2a;
  font-size: 11px;
  line-height: 1;
}
.map-container :deep(.ol-overviewmap-toggle:hover) {
  background: #b8352b;
  border-color: #b8352b;
  color: #fff8ec;
}
</style>