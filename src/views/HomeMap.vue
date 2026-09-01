<template>
  <div class="home-wrap">
    <MapContainer ref="mapRef" />

    <!-- 左侧：筛选 + 列表 -->
    <CollapsiblePanel title="非遗筛选" :visible="mapStore.layerPanelVisible" @close="mapStore.toggleLayerPanel">
      <p class="basemap-tip">
        底图：{{ mapStore.tiandituConfigured ? '天地图 WMTS ✅' : 'OSM（.env 未配置 tk）' }}
      </p>
      <FilterPanel />
      <div class="list-section">
        <div class="list-header">
          <span class="list-title">非遗列表（{{ store.filteredItems.length }}）</span>
        </div>
        <div class="list-items" v-if="store.filteredItems.length">
          <div
            v-for="i in store.filteredItems.slice(0, 100)"
            :key="i.id"
            class="list-item"
            :class="{ active: store.selectedId === i.id }"
            @click="selectItem(i.id)"
          >
            <span class="item-dot" :style="{ background: CATEGORY_COLORS[i.category] }"></span>
            <div class="item-info">
              <div class="item-name">{{ i.name }}</div>
              <div class="item-sub">{{ i.city }} · {{ batchLabel(i.batch) }}</div>
            </div>
          </div>
          <div v-if="store.filteredItems.length > 100" class="list-more">… 还有 {{ store.filteredItems.length - 100 }} 项</div>
        </div>
        <div v-else class="list-empty">无匹配要素</div>
      </div>
    </CollapsiblePanel>

    <!-- 左侧：空间分析工具（T7，与筛选面板叠放，独立开关） -->
    <CollapsiblePanel title="空间分析" :visible="analysisVisible" @close="analysisVisible = false">
      <AnalysisTools :get-adapter="getMapAdapter" />
    </CollapsiblePanel>

    <!-- 右侧：详情卡片 -->
    <CollapsiblePanel title="非遗详情" position="right" :visible="detailVisible" @close="detailVisible = false">
      <HeritageDetailCard />
    </CollapsiblePanel>

    <!-- 时空演变：批次滑块（T6） -->
    <TimeSlider v-if="showTimeSlider" />

    <!-- 地图快捷按钮 -->
    <div class="map-quick-btns">
      <el-button size="small" @click="store.resetFilters()">重置筛选</el-button>
      <el-button size="small" type="primary" @click="zoomShandong()">山东全景</el-button>
      <el-button size="small" :type="analysisVisible ? 'warning' : ''" @click="analysisVisible = !analysisVisible">
        空间分析
      </el-button>
      <el-button size="small" :type="showTimeSlider ? 'warning' : ''" @click="showTimeSlider = !showTimeSlider">
        时空演变
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import MapContainer from '@/components/map/MapContainer.vue';
import CollapsiblePanel from '@/components/panels/CollapsiblePanel.vue';
import FilterPanel from '@/components/panels/FilterPanel.vue';
import HeritageDetailCard from '@/components/panels/HeritageDetailCard.vue';
import AnalysisTools from '@/components/panels/AnalysisTools.vue';
import TimeSlider from '@/components/map/TimeSlider.vue';
import { useMapStore } from '@/services/stores/mapStore';
import { useDataStore } from '@/services/stores/dataStore';
import { CATEGORY_COLORS, batchLabel } from '@/data/sources/heritage';

const route = useRoute();
const mapStore = useMapStore();
const store = useDataStore();
const mapRef = ref<InstanceType<typeof MapContainer> | null>(null);
const detailVisible = ref(false);
// 从 /analysis 跳转过来时自动打开分析面板（旧页面已重定向到主页）
const analysisVisible = ref(route.query.tool === 'analysis');
const showTimeSlider = ref(false);

store.init();

function selectItem(id: number) {
  store.select(id);
  detailVisible.value = true;
  mapRef.value?.zoomToItem(id);
}

function zoomShandong() {
  (window as any).__mapAdapter?.zoomTo([118.2, 36.3], 7);
}

// 供分析面板取地图适配器（MapContainer 挂载后才可用）
function getMapAdapter() {
  return mapRef.value?.getAdapter?.() ?? null;
}

// 点地图点位 → 自动展开详情
watch(
  () => store.selectedId,
  (id) => {
    if (id != null) detailVisible.value = true;
  },
);
</script>

<style scoped>
.home-wrap { position: relative; width: 100%; height: 100%; }
.basemap-tip { font-size: 12px; color: #888; margin-bottom: 8px; }
.list-section { margin-top: 12px; border-top: 1px solid #eee; padding-top: 8px; }
.list-header { font-size: 12px; color: #999; margin-bottom: 6px; }
.list-items { max-height: 340px; overflow: auto; display: flex; flex-direction: column; gap: 4px; }
.list-item {
  display: flex; align-items: center; gap: 8px; padding: 6px 8px;
  border-radius: 6px; cursor: pointer; transition: background 0.15s;
}
.list-item:hover { background: #f5f7fa; }
.list-item.active { background: #ecf5ff; }
.item-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.item-info { min-width: 0; }
.item-name { font-size: 13px; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.item-sub { font-size: 11px; color: #999; }
.list-more { font-size: 12px; color: #aaa; text-align: center; padding: 6px 0; }
.list-empty { font-size: 12px; color: #bbb; text-align: center; padding: 20px 0; }
.map-quick-btns { position: absolute; bottom: 16px; left: 50%; transform: translateX(-50%); z-index: 9; display: flex; gap: 8px; }
</style>
