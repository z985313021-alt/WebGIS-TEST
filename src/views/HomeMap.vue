<template>
  <div class="home-wrap">
    <MapContainer />
    <!-- 可调出/折叠的控制面板 -->
    <CollapsiblePanel title="图层与底图" :visible="mapStore.layerPanelVisible" @close="mapStore.toggleLayerPanel">
      <el-form label-width="64px">
        <el-form-item label="底图">
          <el-radio-group :model-value="mapStore.baseMap" @update:model-value="(v:any)=>mapStore.setBaseMap(v)">
            <el-radio value="vec">矢量</el-radio>
            <el-radio value="img">影像</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="操作">
          <el-button size="small" @click="mapStore.toggleDrawPanel">绘制面板</el-button>
          <el-button size="small" @click="mapStore.toggleChartPanel">图表面板</el-button>
        </el-form-item>
        <p class="tip">当前底图：{{ mapStore.tiandituConfigured ? '天地图 WMTS' : 'OSM（.env 未配置 tk）' }}</p>
      </el-form>
    </CollapsiblePanel>

    <CollapsiblePanel title="绘制工具" :visible="mapStore.drawPanelVisible" @close="mapStore.toggleDrawPanel">
      <el-button size="small" @click="addSample">加载示例 GeoJSON</el-button>
      <p class="tip">勾画/测量功能后续接入（见 spatial-analysis 技能）。</p>
    </CollapsiblePanel>
  </div>
</template>

<script setup lang="ts">
import MapContainer from '@/components/map/MapContainer.vue';
import CollapsiblePanel from '@/components/panels/CollapsiblePanel.vue';
import { useMapStore } from '@/services/stores/mapStore';

const mapStore = useMapStore();

function addSample() {
  const adapter = (window as any).__mapAdapter;
  const sample = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [104.06, 30.67] },
        properties: { name: '成都' },
      },
    ],
  };
  adapter?.addVectorLayer(sample, 'sample');
  mapStore.addLoadedLayer('sample');
}
</script>

<style scoped>
.home-wrap { position: relative; width: 100%; height: 100%; }
.tip { color: #999; font-size: 12px; }
</style>
