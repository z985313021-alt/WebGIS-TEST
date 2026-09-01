<template>
  <div ref="mapEl" class="map-container"></div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { OLMapAdapter } from '@/services/map/OLMapAdapter';
import { useMapStore } from '@/services/stores/mapStore';
import { useDataStore } from '@/services/stores/dataStore';
import { CATEGORY_COLORS } from '@/data/sources/heritage';

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
  // 先查后端 tk 是否配置（逻辑层 action），决定底图用天地图还是 OSM 兜底
  await mapStore.checkTianditu();
  adapter = new OLMapAdapter();
  adapter.mount(mapEl.value, mapStore.tiandituConfigured);
  adapter.addGeoJsonLayer(heritageGeojson(), 'heritage');
  adapter.setLayerFilter('heritage', (p) => dataStore.filteredItems.some((i) => i.id === p.id));
  adapter.onFeatureClick((props) => {
    dataStore.select(props ? (props.id as number) : null);
  });
  (window as any).__mapAdapter = adapter;
  (window as any).__dataStore = dataStore;
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

// 底图切换
watch(() => mapStore.baseMap, (t) => adapter?.setBaseMap(t));

onBeforeUnmount(() => {
  adapter?.destroy();
  (window as any).__mapAdapter = null;
  (window as any).__dataStore = null;
});

// 供父组件调用：定位到某要素（列表点击）
function zoomToItem(id: number) {
  const item = dataStore.items.find((i) => i.id === id);
  if (item && adapter) adapter.zoomTo([item.lng, item.lat], 10);
}
defineExpose({ zoomToItem });
</script>

<style scoped>
.map-container { width: 100%; height: 100%; background: #f0f0f0; }
</style>
