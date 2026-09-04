<template>
  <div ref="mapEl" class="map-container"></div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch, nextTick } from 'vue';
import { OLMapAdapter } from '@/services/map/OLMapAdapter';
import { useMapStore } from '@/services/stores/mapStore';
import { useDataStore } from '@/services/stores/dataStore';
import { CATEGORY_COLORS } from '@/data/sources/heritage';
import { loadShandongBoundary } from '@/data/sources/shandongBoundary';

const mapEl = ref<HTMLElement | null>(null);
const mapStore = useMapStore();
const dataStore = useDataStore();
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
  adapter.mount(mapEl.value, mapStore.provider);
  // 山东省边界高亮（合并地市界 → 单一省界，加粗描边）
  adapter.addBoundaryLayer(loadShandongBoundary(), 'shandong-boundary');
  adapter.addGeoJsonLayer(heritageGeojson(), 'heritage');
  adapter.setLayerFilter('heritage', (p) => dataStore.filteredItems.some((i) => i.id === p.id));
  adapter.onFeatureClick((props) => {
    dataStore.select(props ? (props.id as number) : null);
  });
  (window as any).__mapAdapter = adapter;
  (window as any).__dataStore = dataStore;
  // 挂载后同步一次已存在的数据集（从数据管理页跳转过来的场景）
  syncUserDatasets();
  // 关键：详情页跳转回来时 pendingFlyTo 可能早已设好（watch 不会对旧值触发），
  // 这里主动消费一次，让"在地图上查看"真正执行飞行定位动画。
  consumePendingFlyTo();
  // 首次挂载全图"生长"一遍：所有点按确定性延迟逐个弹出，一进页面即有代入感。
  // 若非时空演变打点(first-load)则整层重播；因 batch 未设，等价于全部可见点生长。
  await nextTick();
  adapter?.playBirthAnimation();
});

// 筛选条件变化 → 地图图层筛选
watch(
  () => dataStore.filteredItems,
  () => {
    adapter?.setLayerFilter('heritage', (p) => dataStore.filteredItems.some((i) => i.id === p.id));
  },
);

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
  await nextTick();
  dataStore.select(target.id);
  zoomToItem(target.id, target.zoom);
  dataStore.pendingFlyTo = null;
}
watch(
  () => dataStore.pendingFlyTo,
  () => consumePendingFlyTo(),
);

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

// 底图类型切换（vec/img，仅天地图生效）
watch(() => mapStore.baseMap, (t) => adapter?.setBaseMap(t));
// 底图提供商切换（天地图 / OSM）
watch(() => mapStore.provider, (p) => adapter?.setProvider(p));

onBeforeUnmount(() => {
  adapter?.destroy();
  (window as any).__mapAdapter = null;
  (window as any).__dataStore = null;
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
.map-container { width: 100%; height: 100%; background: #f0f0f0; }
</style>
