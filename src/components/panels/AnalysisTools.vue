<template>
  <div class="analysis-tools">
    <el-tabs v-model="tab" class="tool-tabs">
      <!-- 量算 -->
      <el-tab-pane label="量算" name="measure">
        <div class="tool-row">
          <el-button size="small" :type="measureMode === 'distance' ? 'primary' : ''" @click="startMeasure('distance')">
            测距
          </el-button>
          <el-button size="small" :type="measureMode === 'area' ? 'primary' : ''" @click="startMeasure('area')">
            测面
          </el-button>
          <el-button size="small" @click="stopMeasure">清除</el-button>
        </div>
        <p class="tip">{{ measureMode ? '在地图上点击绘制，双击结束' : '点击「测距/测面」后在地图上绘制' }}</p>
        <el-alert v-if="measureResult" :title="`结果：${measureResult}`" type="success" :closable="false" class="result" />
      </el-tab-pane>

      <!-- 缓冲区 -->
      <el-tab-pane label="缓冲区" name="buffer">
        <el-form label-width="70px" size="small">
          <el-form-item label="中心点">
            <el-select v-model="bufferItemId" filterable placeholder="选择非遗点位" style="width: 100%">
              <el-option v-for="i in store.items" :key="i.id" :label="`${i.name}（${i.city}）`" :value="i.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="半径(km)">
            <el-input-number v-model="bufferRadius" :min="1" :max="500" :step="5" style="width: 100%" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" size="small" @click="runBuffer">生成缓冲区</el-button>
            <el-button v-if="bufferGeo" size="small" text type="danger" @click="clearBuffer">清除</el-button>
          </el-form-item>
        </el-form>
        <el-alert v-if="bufferResult" :title="bufferResult" type="success" :closable="false" class="result" />
      </el-tab-pane>

      <!-- 叠加统计 -->
      <el-tab-pane label="叠加统计" name="overlay">
        <div class="tool-row">
          <el-button size="small" type="primary" @click="startOverlay">画多边形统计</el-button>
          <el-button size="small" @click="clearOverlay">清除</el-button>
        </div>
        <p class="tip">{{ overlayDrawing ? '画范围多边形，双击完成' : '绘制范围，统计范围内的非遗点位' }}</p>
        <el-alert v-if="overlayResult" :title="overlayResult" type="success" :closable="false" class="result" />
        <div v-if="overlayItems.length" class="overlay-list">
          <div v-for="i in overlayItems.slice(0, 20)" :key="i.id" class="overlay-item">{{ i.name }} · {{ i.city }}</div>
          <div v-if="overlayItems.length > 20" class="overlay-more">… 还有 {{ overlayItems.length - 20 }} 项</div>
        </div>
      </el-tab-pane>

      <!-- 寻访路线（T10） -->
      <el-tab-pane label="寻访路线" name="route">
        <el-form label-width="70px" size="small">
          <el-form-item label="寻访点">
            <el-select
              v-model="routeItemIds"
              multiple
              filterable
              collapse-tags
              collapse-tags-tooltip
              placeholder="选择 2 个以上非遗点位"
              style="width: 100%"
            >
              <el-option v-for="i in store.items" :key="i.id" :label="`${i.name}（${i.city}）`" :value="i.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="沿途半径">
            <el-input-number v-model="routeCorridor" :min="5" :max="100" :step="5" style="width: 100%" />
            <span class="unit">km</span>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" size="small" @click="runRoute">生成路线</el-button>
            <el-button size="small" text type="danger" @click="clearRoute">清除</el-button>
          </el-form-item>
        </el-form>
        <el-alert v-if="routeResult" :title="routeResult" type="success" :closable="false" class="result" />
        <div v-if="routeStops.length" class="route-section">
          <div class="route-title">🗺️ 行程单（{{ routeStops.length }} 站）</div>
          <div v-for="(s, idx) in routeStops" :key="s.id" class="route-stop">
            <span class="stop-no">{{ idx + 1 }}</span>
            <span class="stop-name">{{ s.name }}（{{ s.city }}）</span>
          </div>
        </div>
        <div v-if="routeAlong.length" class="route-section">
          <div class="route-title">📍 沿途推荐（{{ routeAlong.length }} 项）</div>
          <div v-for="i in routeAlong.slice(0, 15)" :key="i.id" class="overlay-item">{{ i.name }} · {{ i.city }}</div>
          <div v-if="routeAlong.length > 15" class="overlay-more">… 还有 {{ routeAlong.length - 15 }} 项</div>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue';
import { ElMessage } from 'element-plus';
import { useDataStore } from '@/services/stores/dataStore';
import type { MapAdapter } from '@/services/map/MapAdapter';
import {
  createBuffer,
  countPointsInPolygon,
  countPointsInRadius,
  measureDistance,
  measureArea,
  buildRoute,
  type RouteResult,
} from '@/services/analysis/analysis';

const props = defineProps<{ getAdapter: () => MapAdapter | null }>();
const store = useDataStore();
store.init();

const tab = ref('measure');

// ---- 量算 ----
const measureMode = ref<'distance' | 'area' | null>(null);
const measureResult = ref('');
function startMeasure(mode: 'distance' | 'area') {
  const ad = props.getAdapter();
  if (!ad) return;
  measureMode.value = mode;
  measureResult.value = '';
  ad.startMeasure(mode, (geom) => {
    const r = mode === 'distance' ? measureDistance(geom) : measureArea(geom);
    measureResult.value = r.unit;
    measureMode.value = null;
  });
}
function stopMeasure() {
  measureMode.value = null;
  measureResult.value = '';
  props.getAdapter()?.stopMeasure();
}

// ---- 缓冲区 ----
const bufferItemId = ref<number | null>(null);
const bufferRadius = ref(50);
const bufferResult = ref('');
const bufferGeo = ref<object | null>(null);
function runBuffer() {
  const ad = props.getAdapter();
  if (!ad) return;
  const item = store.items.find((i) => i.id === bufferItemId.value);
  if (!item) {
    ElMessage.warning('请先选择中心点');
    return;
  }
  const geo = createBuffer(item.lng, item.lat, bufferRadius.value);
  bufferGeo.value = geo;
  const inside = countPointsInRadius(store.items, item.lng, item.lat, bufferRadius.value);
  ad.removeLayer('buffer');
  ad.addGeoJsonLayer(geo as object, 'buffer');
  bufferResult.value = `半径 ${bufferRadius.value}km，范围内非遗 ${inside.length} 项`;
  ad.zoomTo([item.lng, item.lat], 9);
}
function clearBuffer() {
  bufferGeo.value = null;
  bufferResult.value = '';
  props.getAdapter()?.removeLayer('buffer');
}

// ---- 叠加统计 ----
const overlayDrawing = ref(false);
const overlayResult = ref('');
const overlayItems = ref<any[]>([]);
function startOverlay() {
  const ad = props.getAdapter();
  if (!ad) return;
  overlayDrawing.value = true;
  overlayResult.value = '';
  overlayItems.value = [];
  ad.stopMeasure();
  ad.startMeasure('area', (geom) => {
    overlayDrawing.value = false;
    const polygonFeature = { type: 'Feature', geometry: geom, properties: {} };
    const inside = countPointsInPolygon(store.items, polygonFeature as object);
    const r = measureArea(geom);
    overlayItems.value = inside;
    overlayResult.value = `范围面积 ${r.unit}，区内非遗 ${inside.length} 项`;
    ad.removeLayer('overlay-poly');
    ad.addGeoJsonLayer({ type: 'FeatureCollection', features: [polygonFeature] } as object, 'overlay-poly');
  });
}
function clearOverlay() {
  overlayDrawing.value = false;
  overlayResult.value = '';
  overlayItems.value = [];
  props.getAdapter()?.stopMeasure();
  props.getAdapter()?.removeLayer('overlay-poly');
}

// ---- 寻访路线（T10）----
const routeItemIds = ref<number[]>([]);
const routeCorridor = ref(20);
const routeResult = ref('');
const routeStops = ref<any[]>([]);
const routeAlong = ref<any[]>([]);
function runRoute() {
  const ad = props.getAdapter();
  if (!ad) return;
  if (routeItemIds.value.length < 2) {
    ElMessage.warning('请至少选择 2 个寻访点');
    return;
  }
  const selected = routeItemIds.value
    .map((id) => store.items.find((i) => i.id === id))
    .filter(Boolean) as any[];
  try {
    const r: RouteResult = buildRoute(selected, store.items, routeCorridor.value);
    routeStops.value = r.stops;
    routeAlong.value = r.along;
    ad.removeLayer('route');
    ad.addGeoJsonLayer({ type: 'FeatureCollection', features: [{ type: 'Feature', geometry: r.line, properties: {} }] } as object, 'route');
    routeResult.value = `路线已生成：${r.stops.length} 站，沿途推荐 ${r.along.length} 项（半径 ${routeCorridor.value}km）`;
    const first = r.stops[0];
    ad.zoomTo([first.lng, first.lat], 8);
  } catch (e: any) {
    ElMessage.error(e.message);
  }
}
function clearRoute() {
  routeItemIds.value = [];
  routeResult.value = '';
  routeStops.value = [];
  routeAlong.value = [];
  props.getAdapter()?.removeLayer('route');
}

onBeforeUnmount(() => {
  props.getAdapter()?.stopMeasure();
});
</script>

<style scoped>
.tool-tabs { margin-top: 4px; }
.tool-row { display: flex; gap: 8px; }
.tip { font-size: 12px; color: #999; margin: 8px 0; }
.result { margin-top: 8px; }
.unit { font-size: 12px; color: #999; margin-left: 6px; }
.overlay-list { margin-top: 8px; border-top: 1px dashed #eee; padding-top: 8px; }
.overlay-item { font-size: 12px; color: #555; padding: 2px 0; }
.overlay-more { font-size: 12px; color: #aaa; }
.route-section { margin-top: 10px; border-top: 1px dashed #eee; padding-top: 8px; }
.route-title { font-size: 12px; color: #666; font-weight: 600; margin-bottom: 6px; }
.route-stop { display: flex; align-items: center; gap: 8px; padding: 3px 0; font-size: 12px; color: #444; }
.stop-no {
  width: 18px; height: 18px; border-radius: 50%; background: #409eff; color: #fff;
  display: flex; align-items: center; justify-content: center; font-size: 11px; flex-shrink: 0;
}
.stop-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
