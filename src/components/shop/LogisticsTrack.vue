<template>
  <div class="logi">
    <div class="logi-head">
      <div class="lh-row">
        <span class="lh-label">订单号</span><span class="lh-val">{{ order.orderNo }}</span>
      </div>
      <div class="lh-row" v-if="order.trackingNo">
        <span class="lh-label">物流单号</span><span class="lh-val">{{ order.trackingNo }}</span>
      </div>
      <div class="lh-row">
        <span class="lh-label">承运</span><span class="lh-val">遗蕴速运（模拟）</span>
      </div>
      <div class="lh-eta">
        <el-tag :type="stageTag" effect="dark" size="large">{{ state.stageCn }}</el-tag>
        <span v-if="state.stage !== 'signed'" class="eta-text">
          预计 <b>{{ etaText }}</b> 到达（还剩 {{ state.remainDays }} 天）
        </span>
        <span v-else class="eta-text">已于 {{ etaText }} 送达</span>
      </div>
      <div class="lh-progress">
        <el-progress :percentage="Math.round(state.progress * 100)" :stroke-width="12" :show-text="false" :color="progressColor" />
        <span class="lp-text">已行驶 {{ state.passedKm }} / {{ Math.round(route.totalKm) }} km</span>
      </div>
    </div>

    <div ref="mapEl" class="logi-map"></div>

    <div class="logi-route">
      <span v-for="(s, i) in route.stops" :key="i" class="rs-node">
        <i class="rs-dot" :class="{ passed: state.progress >= s.t }"></i>{{ s.name }}
        <i v-if="i < route.stops.length - 1" class="rs-arrow">→</i>
      </span>
    </div>

    <div class="logi-timeline">
      <div class="lt-title">物流轨迹</div>
      <div v-for="(t, i) in state.timeline" :key="i" class="lt-item" :class="{ done: t.done, current: isCurrent(i) }">
        <i class="lt-dot"></i>
        <div class="lt-body">
          <div class="lt-text">{{ t.text }}</div>
          <div class="lt-time">{{ fmt(t.time) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
import type { Order } from '@/data/api/shop';
import OMap from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Style, Circle as CircleStyle, Fill, Stroke, Text } from 'ol/style';
import { Feature } from 'ol';
import { Point, LineString } from 'ol/geom';
import { fromLonLat, transformExtent } from 'ol/proj';
import { WAREHOUSES, planRoute, parseCityFromAddress, simulateShipment, fetchRouteDrivingPath, pointAtKm } from '@/services/logistics/logistics';
import type { DrivingPath } from '@/services/logistics/logistics';

const props = defineProps<{ order: Order }>();

// 发货仓：默认济南总仓（可按订单号稳定地在两个仓之间分配，体现多仓发货）
const warehouse = (() => {
  const n = props.order.orderNo.split('').reduce((s, ch) => s + ch.charCodeAt(0), 0);
  return WAREHOUSES[n % WAREHOUSES.length];
})();

const toCity = computed(() => parseCityFromAddress(props.order.address));
const route = computed(() => planRoute(warehouse, toCity.value ?? ''));
const startAt = computed(() => {
  const o = props.order;
  const raw = o.shippedAt || o.paidAt || o.createdAt;
  const d = raw ? new Date(raw) : new Date();
  return isNaN(d.getTime()) ? new Date() : d;
});
const signed = computed(() => props.order.status === 'done');
const state = computed(() => simulateShipment(route.value, startAt.value, signed.value));

const stageTag = computed(() => ({
  collected: 'warning', in_transit: 'primary', delivering: 'success', signed: 'info',
} as Record<string, string>)[state.value.stage] as any || 'info');
const progressColor = computed(() => state.value.stage === 'signed' ? '#67c23a' : '#409eff');
const etaText = computed(() => fmt(state.value.etaAt));

function fmt(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
}
/** 当前时间轴上第一个未完成节点，用于高亮 */
function isCurrent(i: number): boolean {
  const tl = state.value.timeline;
  const firstUndone = tl.findIndex(x => !x.done);
  return firstUndone >= 0 && i === firstUndone;
}

// ===== 地图 =====
const mapEl = ref<HTMLElement | null>(null);
let map: OMap | null = null;
/** 高德驾车真实路径（未取到时回退站点直线） */
const drivingPath = ref<DrivingPath | null>(null);
/** 真实路径画线用的点 */
const linePoints = computed<[number, number][]>(() =>
  drivingPath.value?.points ?? route.value.stops.map(s => [s.lng, s.lat] as [number, number]));
/** 当前位置：有真实路径时按里程比例落在道路上 */
const currentPos = computed<[number, number]>(() => {
  const st = state.value;
  const dp = drivingPath.value;
  if (!dp || route.value.totalKm <= 0) return [st.lng, st.lat];
  const ratio = st.progress <= 0 ? 0 : st.passedKm / route.value.totalKm;
  return pointAtKm(dp.points, dp.distanceKm * Math.min(1, ratio));
});

function initMap() {
  if (!mapEl.value || map) return;
  map = new OMap({
    target: mapEl.value,
    layers: [new TileLayer({
      source: new XYZ({ url: '/api/tianditu/xyz/vec_w/{z}/{x}/{y}', maxZoom: 18, attributions: '天地图' }),
    })],
    view: new View({ projection: 'EPSG:3857', center: fromLonLat([117.12, 36.65]), zoom: 6 }),
    controls: [],
  });
  const src = new VectorSource();
  const r = route.value;
  // 路线：优先高德真实驾车道路，未取到时回退站点连线
  const pts = linePoints.value;
  src.addFeature(new Feature({
    geometry: new LineString(pts.map(p => fromLonLat(p))),
    style: new Style({
      stroke: drivingPath.value
        ? new Stroke({ color: '#409eff', width: 5 })
        : new Stroke({ color: '#409eff', width: 3, lineDash: [8, 6] }),
    }),
  }));
  // 站点
  r.stops.forEach((s, i) => {
    const isFirst = i === 0; const isLast = i === r.stops.length - 1;
    const color = isFirst ? '#909399' : isLast ? '#67c23a' : '#e6a23c';
    src.addFeature(new Feature({
      geometry: new Point(fromLonLat([s.lng, s.lat])),
      style: new Style({
        image: new CircleStyle({ radius: 7, fill: new Fill({ color }), stroke: new Stroke({ color: '#fff', width: 2 }) }),
        text: new Text({
          text: s.name,
          offsetY: -16,
          font: 'bold 12px "Microsoft YaHei", sans-serif',
          fill: new Fill({ color: '#303133' }),
          stroke: new Stroke({ color: '#fff', width: 3 }),
        }),
      }),
    }));
  });
  // 当前位置（红点）
  const cur = currentPos.value;
  src.addFeature(new Feature({
    geometry: new Point(fromLonLat([cur[0], cur[1]])),
    style: new Style({
      image: new CircleStyle({
        radius: 9, fill: new Fill({ color: '#f56c6c' }),
        stroke: new Stroke({ color: '#fff', width: 3 }),
      }),
      text: new Text({
        text: '📦 当前位置',
        offsetY: 24,
        font: 'bold 12px "Microsoft YaHei", sans-serif',
        fill: new Fill({ color: '#f56c6c' }),
        stroke: new Stroke({ color: '#fff', width: 3 }),
      }),
    }),
  }));
  map.addLayer(new VectorLayer({ source: src }));
  // 缩放到路线范围
  const lngs = r.stops.map(s => s.lng); const lats = r.stops.map(s => s.lat);
  const pad = 1.5;
  // 用 transformExtent 而非 fromLonLat 四参数（后者在此环境产出无效 extent）
  const extent = transformExtent(
    [Math.min(...lngs) - pad, Math.min(...lats) - pad, Math.max(...lngs) + pad, Math.max(...lats) + pad],
    'EPSG:4326',
    'EPSG:3857',
  );
  map.getView().fit(extent, { padding: [40, 40, 40, 40] });
}

onMounted(async () => {
  await nextTick();
  initMap();
  // 取高德真实驾车路径后重绘（失败则保留站点连线）
  try {
    drivingPath.value = await fetchRouteDrivingPath(route.value);
    if (drivingPath.value && map) {
      map.setTarget(undefined);
      map = null;
      initMap();
    }
  } catch { /* 保持直线回退 */ }
});
onBeforeUnmount(() => { map?.setTarget(undefined); map = null; });
</script>

<style scoped>
.logi { display: flex; flex-direction: column; gap: 12px; }
.logi-head { background: #f7f9fc; border-radius: 10px; padding: 12px 14px; }
.lh-row { display: flex; gap: 10px; font-size: 13px; line-height: 1.9; }
.lh-label { color: #909399; width: 60px; flex: none; }
.lh-val { color: #303133; }
.lh-eta { display: flex; align-items: center; gap: 10px; margin-top: 8px; }
.eta-text { font-size: 13px; color: #606266; }
.eta-text b { color: #f56c6c; }
.lh-progress { margin-top: 10px; }
.lp-text { font-size: 12px; color: #909399; }
.logi-map { width: 100%; height: 300px; border-radius: 10px; overflow: hidden; border: 1px solid #e4e7ed; }
.logi-route { font-size: 12.5px; color: #606266; line-height: 2; background: #fafbfd; border-radius: 8px; padding: 8px 10px; }
.rs-node { white-space: nowrap; }
.rs-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #dcdfe6; margin-right: 4px; }
.rs-dot.passed { background: #409eff; }
.rs-arrow { color: #c0c4cc; margin: 0 6px; font-style: normal; }
.logi-timeline { padding-left: 4px; }
.lt-title { font-size: 13px; font-weight: 700; color: #303133; margin-bottom: 8px; }
.lt-item { display: flex; gap: 10px; padding: 6px 0; position: relative; }
.lt-item::before { content: ''; position: absolute; left: 5px; top: 18px; bottom: -6px; width: 1px; background: #e4e7ed; }
.lt-item:last-child::before { display: none; }
.lt-dot { width: 11px; height: 11px; border-radius: 50%; background: #dcdfe6; flex: none; margin-top: 3px; z-index: 1; }
.lt-item.done .lt-dot { background: #409eff; }
.lt-item.current .lt-dot { background: #f56c6c; box-shadow: 0 0 0 4px rgba(245,108,108,0.15); }
.lt-text { font-size: 13px; color: #909399; }
.lt-item.done .lt-text, .lt-item.current .lt-text { color: #303133; }
.lt-time { font-size: 11.5px; color: #c0c4cc; }
</style>