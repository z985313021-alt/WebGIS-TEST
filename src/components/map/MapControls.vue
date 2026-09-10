<template>
  <div class="map-controls">
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
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import { Refresh } from '@element-plus/icons-vue';
import { useMapStore } from '@/services/stores/mapStore';

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

onMounted(() => {
  const adapter = mapStore.mapAdapter;
  if (!adapter) return;

  // 初始化当前状态
  zoom.value = adapter.getZoom();
  rotation.value = adapter.getRotation();

  // 监听视图变化
  adapter.onViewChange((state) => {
    zoom.value = state.zoom;
    rotation.value = state.rotation;
  });

  // 监听鼠标移动
  adapter.onPointerMove((coord) => {
    mouseCoord.value = coord;
  });
});

onBeforeUnmount(() => {
  // OL 的事件监听器会随 map 销毁自动清理，无需手动 off
});
</script>

<style scoped>
.map-controls {
  position: absolute;
  right: 16px;
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
