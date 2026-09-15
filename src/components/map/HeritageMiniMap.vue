<template>
  <el-card shadow="never" class="mini-map-card">
    <div class="mm-head">
      <span class="mm-title">❖ 空间位置 · {{ item.city }}非遗分布</span>
      <span class="mm-coord">{{ item.lng.toFixed(4) }}°E / {{ item.lat.toFixed(4) }}°N</span>
    </div>
    <div ref="mapEl" class="mm-canvas"></div>
    <div class="mm-foot">
      <span class="mm-hint">朱砂印章为当前项目（脉冲标示），点击同城点位可切换查看</span>
      <button class="mm-open" @click="openFullMap">在地图主页查看 →</button>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { OLMapAdapter } from '@/services/map/OLMapAdapter';
import { useMapStore } from '@/services/stores/mapStore';
import { useDataStore } from '@/services/stores/dataStore';
import { CATEGORY_COLORS, type HeritageItem } from '@/data/sources/heritage';
import { loadShandongBoundary } from '@/data/sources/shandongBoundary';
import { loadShandongCityBoundary } from '@/data/sources/shandongCityBoundary';

/**
 * 详情页内嵌小地图：不必跳回主页即可看到该非遗的空间位置。
 * 只渲染同城点位（提供空间语境），当前项目用脉冲高亮标示。
 */
const props = defineProps<{ item: HeritageItem }>();

const router = useRouter();
const mapStore = useMapStore();
const store = useDataStore();

const mapEl = ref<HTMLElement | null>(null);
let adapter: OLMapAdapter | null = null;

/** 同城点位 + 当前项目（若当前项目不在同城列表里则补进来） */
function cityGeojson(): object {
  const sameCity = store.items.filter((i) => i.city === props.item.city);
  const list = sameCity.some((i) => i.id === props.item.id) ? sameCity : [...sameCity, props.item];
  return {
    type: 'FeatureCollection',
    features: list.map((i) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [i.lng, i.lat] },
      properties: { ...i, color: CATEGORY_COLORS[i.category] ?? '#999999' },
    })),
  };
}

function renderItem() {
  if (!adapter) return;
  adapter.removeLayer('mini-heritage');
  adapter.addGeoJsonLayer(cityGeojson(), 'mini-heritage');
  adapter.setHighlightId(props.item.id);
  adapter.zoomTo([props.item.lng, props.item.lat], 12);
}

onMounted(() => {
  if (!mapEl.value) return;
  adapter = new OLMapAdapter();
  adapter.mount(mapEl.value, mapStore.provider);
  adapter.addBoundaryLayer(loadShandongBoundary(), 'shandong-boundary');
  adapter.addCityBoundaryLayer(loadShandongCityBoundary(), 'shandong-city');
  renderItem();
  // 卡片布局（图片/表格高度）可能晚于地图挂载才定型，补一次视口校正
  window.setTimeout(() => {
    adapter?.updateSize();
    adapter?.zoomTo([props.item.lng, props.item.lat], 12);
  }, 180);
  // 点击同城其它点位 → 切换到该项目详情
  adapter.onFeatureClick((p) => {
    const id = p ? Number(p['id']) : NaN;
    if (Number.isFinite(id) && id !== props.item.id) router.push(`/heritage/${id}`);
  });
});

// 同页切换项目（点击同城点位）时复用组件，需要手动刷新图层与视野
watch(() => props.item.id, () => renderItem());

onBeforeUnmount(() => {
  adapter?.destroy();
  adapter = null;
});

function openFullMap() {
  store.select(props.item.id);
  store.pendingFlyTo = { id: props.item.id, zoom: 15 };
  router.push('/');
}
</script>

<style scoped>
.mini-map-card {
  /* 与左侧合并卡等高对齐，不留额外下边距 */
  margin: 0;
  height: 100%;
}
.mini-map-card :deep(.el-card__body) {
  padding: 12px 14px 10px;
  display: flex;
  flex-direction: column;
  height: 100%;
  box-sizing: border-box;
}
.mm-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 8px;
}
.mm-title {
  font-size: 13px;
  font-weight: 700;
  color: #6d4c2a;
  letter-spacing: 0.04em;
  font-family: var(--zi-font-serif, "STSong", "Songti SC", serif);
}
.mm-coord {
  flex-shrink: 0;
  font-size: 11px;
  color: #a08c72;
  font-family: ui-monospace, Consolas, monospace;
}
.mm-canvas {
  width: 100%;
  /* 随卡片高度撑满（卡片与左侧信息卡等高）；窄屏保底 320px */
  flex: 1 1 auto;
  height: clamp(320px, calc(100vh - 220px), 700px);
  min-height: 320px;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid #e0d5bc;
  background: #f7f3e8;
}
/* 内嵌小地图只保留底图与点位，收起鹰眼图/比例尺等主图专用控件。
   注意 ScaleLine 在 bar:true 时类名是 .ol-scale-bar（不是 .ol-scale-line），两者都要写。 */
.mm-canvas :deep(.ol-overviewmap),
.mm-canvas :deep(.ol-scale-bar),
.mm-canvas :deep(.ol-scale-line) {
  display: none;
}
.mm-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
}
.mm-hint {
  font-size: 11px;
  color: #a08c72;
}
.mm-open {
  flex-shrink: 0;
  padding: 0;
  background: none;
  border: none;
  color: #b8352b;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.mm-open:hover {
  text-decoration: underline;
}
</style>
