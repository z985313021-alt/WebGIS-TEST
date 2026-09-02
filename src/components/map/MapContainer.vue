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

// 把 store 数据转成带颜色的 GeoJSON（分类样式由显示层注入，adapter 保持通用）
function heritageGeojson(): object {
  return {
    type: 'FeatureCollection',
    features: dataStore.items.map((i) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [i.lng, i.lat] },
      properties: { ...i, color: CATEGORY_COLORS[i.category] ?? '#999999' },
    })),
  };
}

onMounted(async () => {
  dataStore.init();
  if (!mapEl.value) return;
  // 先查后端 tk 是否配置（逻辑层 action），决定初始底图提供商（天地图/OSM 可手动切换）
  await mapStore.checkTianditu();
  mapStore.provider = mapStore.tiandituConfigured ? 'tianditu' : 'osm';
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
});

// 筛选条件变化 → 地图图层筛选
watch(
  () => dataStore.filteredItems,
  () => {
    adapter?.setLayerFilter('heritage', (p) => dataStore.filteredItems.some((i) => i.id === p.id));
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
  if (item && adapter) adapter.zoomTo([item.lng, item.lat], zoom);
}
function getAdapter() {
  return adapter;
}
defineExpose({ zoomToItem, getAdapter });
</script>

<style scoped>
.map-container { width: 100%; height: 100%; background: #f0f0f0; }
</style>
