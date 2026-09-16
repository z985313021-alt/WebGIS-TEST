<template>
  <div ref="controlsEl" class="map-controls" :class="{ narrow }">
    <!-- 指北针 -->
    <div class="control-item compass" @click="resetRotation" title="点击重置为正北朝上">
      <div class="compass-ring" :style="{ transform: `rotate(${-rotationDeg}deg)` }">
        <span class="compass-n">N</span>
        <span class="compass-arrow"></span>
      </div>
    </div>

    <!-- 缩放级别 + 重置视图 -->
    <div class="control-group">
      <div class="control-item zoom-level" title="当前缩放级别">
        <span class="zoom-value">{{ zoom.toFixed(1) }}</span>
        <span class="zoom-label">zoom</span>
      </div>
      <button class="control-item reset-btn" @click="resetView" title="重置视图（山东全景）">
        <el-icon><Refresh /></el-icon>
      </button>
    </div>

    <!-- 温度：未落到具体城市时显示全省，落到某市显示该市 -->
    <div v-if="weather" class="control-item weather" :title="weather.tip">
      <span class="w-temp">{{ weather.temp }}℃</span>
      <span class="w-city">{{ weather.city }}</span>
      <span class="w-cond">{{ weather.cond }}</span>
    </div>

    <!-- 鼠标坐标 -->
    <div class="control-item coord-display" :class="{ 'no-coord': !mouseCoord }">
      <template v-if="mouseCoord">
        <span class="coord-label">经度</span>
        <span class="coord-value">{{ mouseCoord[0].toFixed(4) }}°E</span>
        <span class="coord-sep">|</span>
        <span class="coord-label">纬度</span>
        <span class="coord-value">{{ mouseCoord[1].toFixed(4) }}°N</span>
      </template>
      <template v-else>
        <span class="coord-placeholder">移动鼠标查看坐标</span>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue';
import { Refresh } from '@element-plus/icons-vue';
import * as turf from '@turf/turf';
import { useMapStore } from '@/services/stores/mapStore';
import { loadShandongCityBoundary } from '@/data/sources/shandongCityBoundary';

const mapStore = useMapStore();

const zoom = ref(7.5);
const rotation = ref(0);
const mouseCoord = ref<[number, number] | null>(null);

const rotationDeg = computed(() => (rotation.value * 180) / Math.PI);

function resetView() {
  mapStore.mapAdapter?.resetView();
}

function resetRotation() {
  mapStore.mapAdapter?.resetRotation();
}

// 地图被面板挤压变窄时收起坐标条，避免控件互相压叠
const narrow = ref(false);
let widthObserver: ResizeObserver | null = null;

/**
 * 控件组自身高度会随内容变化（温度、坐标条显隐、窄屏收起等），
 * 这里实时写入 --controls-h，让鹰眼图按实际高度避让，彻底避免压叠。
 */
const controlsEl = ref<HTMLElement | null>(null);
let heightObserver: ResizeObserver | null = null;
function syncControlsHeight() {
  const h = controlsEl.value?.getBoundingClientRect().height ?? 0;
  const mapEl = document.querySelector('.map-container') as HTMLElement | null;
  if (mapEl && h > 0) mapEl.style.setProperty('--controls-h', `${Math.ceil(h)}px`);
}

/**
 * 实况温度：默认显示山东省，地图中心落到某个地市时切换为该市。
 * 高德天气接口有 QPS 限制（实测连续查询会 CUQPS_HAS_EXCEEDED_THE_LIMIT），
 * 所以城市判定走本地市界数据（零外呼），查询结果按城市缓存 10 分钟。
 */
interface WeatherInfo { city: string; temp: string; cond: string; tip: string }
const weather = ref<WeatherInfo | null>(null);
const weatherCache = new Map<string, { data: WeatherInfo; ts: number }>();
const WEATHER_TTL = 10 * 60 * 1000;
let lastCityKey = '';
let weatherLoading = false;

/** 依据经纬度判断所属地市（命中市界则返回市名，否则视为全省） */
function cityKeyOf(lnglat: [number, number] | null): string {
  if (!lnglat) return '山东';
  try {
    const boundary = loadShandongCityBoundary() as { features?: Array<{ properties?: Record<string, unknown> }> };
    const pt = turf.point(lnglat);
    for (const f of boundary.features ?? []) {
      if (turf.booleanPointInPolygon(pt as never, f as never)) {
        const name = String(f.properties?.name ?? '').replace(/市$/, '');
        if (name) return name;
      }
    }
  } catch {
    // 市界数据异常时退回全省
  }
  return '山东';
}

async function loadWeather(city: string) {
  const cached = weatherCache.get(city);
  if (cached && Date.now() - cached.ts < WEATHER_TTL) {
    weather.value = cached.data;
    return;
  }
  if (weatherLoading) return;
  weatherLoading = true;
  try {
    const res = await fetch(`/api/amap/weather?city=${encodeURIComponent(city)}`);
    const d = await res.json();
    const live = d?.lives?.[0];
    if (live) {
      const info: WeatherInfo = {
        city,
        temp: String(live.temperature),
        cond: String(live.weather),
        tip: `${live.province ?? ''}${live.city ?? ''} 实况：${live.weather} ${live.temperature}℃ 湿度 ${live.humidity}%`,
      };
      weatherCache.set(city, { data: info, ts: Date.now() });
      weather.value = info;
    }
  } catch {
    // 天气获取失败不影响地图使用
  } finally {
    weatherLoading = false;
  }
}

/** 视图变化后按城市刷新温度（同城不重复请求） */
function refreshWeather() {
  const adapter = mapStore.mapAdapter;
  if (!adapter) return;
  const key = cityKeyOf(adapter.getCenter());
  if (key === lastCityKey) return;
  lastCityKey = key;
  void loadWeather(key);
}

/**
 * 绑定地图适配器：MapContainer 的挂载是异步的（内部先探底图配置），
 * 本组件 onMounted 早于它完成，所以必须等适配器就绪后再绑定，
 * 否则 zoom 数值、鼠标坐标、温度都不会更新。
 */
let bound = false;
function bindAdapter() {
  const adapter = mapStore.mapAdapter;
  if (!adapter || bound) return;
  bound = true;

  zoom.value = adapter.getZoom();
  rotation.value = adapter.getRotation();

  adapter.onViewChange((state) => {
    zoom.value = state.zoom;
    rotation.value = state.rotation;
    // 视图变化后刷新温度（内部按城市去重，不会频繁外呼）
    refreshWeather();
  });

  adapter.onPointerMove((coord) => {
    mouseCoord.value = coord;
  });

  lastCityKey = '';
  refreshWeather();
}

onMounted(() => {
  const mapEl = document.querySelector('.map-container');
  if (mapEl && typeof ResizeObserver !== 'undefined') {
    widthObserver = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      narrow.value = w > 0 && w < 460;
    });
    widthObserver.observe(mapEl);
  }

  // 温度先按全省渲染，不依赖适配器是否就绪
  void loadWeather('山东');
  bindAdapter();

  // 控件高度变化 → 同步给鹰眼图避让
  if (controlsEl.value && typeof ResizeObserver !== 'undefined') {
    heightObserver = new ResizeObserver(() => syncControlsHeight());
    heightObserver.observe(controlsEl.value);
    syncControlsHeight();
  }
});

// 适配器晚于本组件就绪时补绑
watch(
  () => mapStore.mapAdapter,
  (adapter) => {
    if (adapter) bindAdapter();
  },
);

onBeforeUnmount(() => {
  widthObserver?.disconnect();
  widthObserver = null;
  heightObserver?.disconnect();
  heightObserver = null;
  // OL 的事件监听器会随 map 销毁自动清理，无需手动 off
});
</script>

<style scoped>
.map-controls.narrow .coord-display {
  display: none;
}

/* 实况温度 */
.control-item.weather {
  display: flex;
  align-items: baseline;
  gap: 5px;
  padding: 5px 10px;
  background: rgba(255, 253, 248, 0.94);
  border: 1px solid #d4c8af;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(43, 34, 24, 0.10);
  font-size: 12px;
  color: #4a3a2f;
  white-space: nowrap;
}
.w-temp {
  font-size: 14px;
  font-weight: 700;
  color: #b8352b;
  font-family: ui-monospace, Consolas, monospace;
}
.w-city {
  font-weight: 600;
}
.w-cond {
  color: #a08c72;
}

.map-controls {
  position: absolute;
  /* 跟随地图容器的让位：右侧面板展开时整体左移，避免压到抽屉上 */
  right: calc(16px + var(--drawer-r, 0px));
  bottom: 16px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  z-index: 50;
  pointer-events: none;
}

.control-item {
  pointer-events: auto;
  background: rgba(255, 253, 248, 0.95);
  border: 1px solid #e2d6be;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(43, 34, 24, 0.12);
  backdrop-filter: blur(4px);
}

/* 指北针 */
.compass {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}
.compass:hover {
  border-color: #8f2317;
  box-shadow: 0 2px 12px rgba(143, 35, 23, 0.2);
}
.compass-ring {
  position: relative;
  width: 32px;
  height: 32px;
  transition: transform 0.3s ease-out;
}
.compass-n {
  position: absolute;
  top: -2px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 10px;
  font-weight: 700;
  color: #8f2317;
}
.compass-arrow {
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-bottom: 14px solid #8f2317;
}

/* 缩放 + 重置按钮组 */
.control-group {
  display: flex;
  gap: 6px;
}

.zoom-level {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4px 10px;
  min-width: 48px;
}
.zoom-value {
  font-size: 14px;
  font-weight: 700;
  color: #2b2218;
  line-height: 1.2;
}
.zoom-label {
  font-size: 9px;
  color: #8a7862;
  text-transform: uppercase;
}

.reset-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #5a4b3c;
  transition: all 0.2s;
  border: none;
  background: rgba(255, 253, 248, 0.95);
}
.reset-btn:hover {
  color: #8f2317;
  border-color: #8f2317;
  background: rgba(143, 35, 23, 0.05);
}
.reset-btn :deep(.el-icon) {
  font-size: 16px;
}

/* 鼠标坐标 */
.coord-display {
  padding: 6px 12px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 11px;
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 28px;
}
.coord-label {
  color: #8a7862;
  font-size: 10px;
}
.coord-value {
  color: #2b2218;
  font-weight: 600;
}
.coord-sep {
  color: #c9b896;
  margin: 0 2px;
}
.coord-placeholder {
  color: #b0a08a;
  font-style: italic;
}
.coord-display.no-coord {
  opacity: 0.7;
}
</style>
