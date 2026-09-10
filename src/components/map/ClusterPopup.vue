<template>
  <transition name="popup-fade">
    <div v-if="mapStore.clusterPopupVisible" class="cluster-popup">
      <div class="popup-header">
        <div class="popup-title">
          <span class="popup-icon">◎</span>
          <span>聚合点位列表</span>
          <el-tag size="small" type="danger" class="popup-count">{{ mapStore.clusterItems.length }} 项</el-tag>
        </div>
        <button class="popup-close" @click="closePopup" title="关闭">
          <el-icon><Close /></el-icon>
        </button>
      </div>

      <div class="popup-body">
        <div v-if="mapStore.clusterItems.length === 0" class="popup-empty">
          暂无点位数据
        </div>
        <div
          v-for="(item, idx) in mapStore.clusterItems"
          :key="String(item.id ?? idx)"
          class="cluster-item"
          @click="flyToItem(item)"
        >
          <span class="item-dot" :style="{ background: String(item.color || '#999') }"></span>
          <div class="item-body">
            <div class="item-name">{{ item.name }}</div>
            <div class="item-meta">
              <span class="item-category" :style="{ color: String(item.color || '#999') }">{{ item.category }}</span>
              <span class="item-sep">·</span>
              <span class="item-city">{{ item.city }}</span>
            </div>
          </div>
          <el-icon class="item-arrow"><ArrowRight /></el-icon>
        </div>
      </div>

      <div class="popup-footer">
        <span class="footer-hint">点击点位可飞行定位</span>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { Close, ArrowRight } from '@element-plus/icons-vue';
import { useMapStore } from '@/services/stores/mapStore';
import { useDataStore } from '@/services/stores/dataStore';

const mapStore = useMapStore();
const dataStore = useDataStore();

function closePopup() {
  mapStore.hideClusterPopup();
}

function flyToItem(item: Record<string, unknown>) {
  const id = item.id as number;
  if (id != null) {
    dataStore.select(id);
  }
  const lng = item.lng as number;
  const lat = item.lat as number;
  if (lng != null && lat != null) {
    mapStore.mapAdapter?.zoomTo([lng, lat], 13);
  }
  closePopup();
}
</script>

<style scoped>
.cluster-popup {
  position: absolute;
  top: 80px;
  right: 16px;
  width: 320px;
  max-height: calc(100vh - 200px);
  background: rgba(255, 253, 248, 0.98);
  border: 1px solid #e2d6be;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(43, 34, 24, 0.18);
  backdrop-filter: blur(8px);
  z-index: 100;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid #e2d6be;
  background: linear-gradient(135deg, rgba(143, 35, 23, 0.04), transparent);
}

.popup-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 700;
  color: #2b2218;
}

.popup-icon {
  color: #8f2317;
  font-size: 16px;
}

.popup-count {
  margin-left: 4px;
}

.popup-close {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: #8a7862;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
}
.popup-close:hover {
  background: rgba(143, 35, 23, 0.08);
  color: #8f2317;
}

.popup-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.popup-empty {
  text-align: center;
  color: #b0a08a;
  padding: 40px 0;
  font-size: 13px;
}

.cluster-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
  margin-bottom: 4px;
}
.cluster-item:hover {
  background: rgba(143, 35, 23, 0.06);
}

.item-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.8);
}

.item-body {
  flex: 1;
  min-width: 0;
}

.item-name {
  font-size: 13px;
  font-weight: 600;
  color: #2b2218;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-meta {
  font-size: 11px;
  color: #8a7862;
  margin-top: 2px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.item-category {
  font-weight: 500;
}

.item-sep {
  color: #c9b896;
}

.item-arrow {
  color: #c9b896;
  font-size: 14px;
  flex-shrink: 0;
  transition: transform 0.15s;
}
.cluster-item:hover .item-arrow {
  color: #8f2317;
  transform: translateX(2px);
}

.popup-footer {
  padding: 8px 14px;
  border-top: 1px solid #e2d6be;
  background: rgba(43, 34, 24, 0.02);
}

.footer-hint {
  font-size: 11px;
  color: #a09080;
  font-style: italic;
}

/* 弹窗动画 */
.popup-fade-enter-active,
.popup-fade-leave-active {
  transition: all 0.25s ease;
}
.popup-fade-enter-from,
.popup-fade-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>
