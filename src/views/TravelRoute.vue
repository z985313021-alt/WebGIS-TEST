<template>
  <div class="travel-page">
    <div class="tp-header">
      <div class="tp-title">🚄 旅游路线规划</div>
      <div class="tp-sub">接铁路 12306 实时数据 · 查车次 / 票价 / 经停站非遗点 · 景点间最优路线</div>
    </div>
    <div class="tp-body">
      <!-- 左侧：表单 + 结果 -->
      <div class="tp-left">
        <el-tabs v-model="tab" class="tp-tabs">
          <el-tab-pane label="城市间火车查询" name="train">
            <div class="query-bar">
              <el-select v-model="fromStation" filterable remote clearable placeholder="出发站（如 济南）" :remote-method="searchFrom" :loading="stLoading" class="st-select" @change="onFromChange">
                <el-option v-for="s in fromOptions" :key="s.code" :label="s.name + (s.city && s.city !== s.name ? '（' + s.city + '）' : '')" :value="s.name" />
              </el-select>
              <span class="arrow">→</span>
              <el-select v-model="toStation" filterable remote clearable placeholder="到达站（如 北京）" :remote-method="searchTo" :loading="stLoading" class="st-select" @change="onToChange">
                <el-option v-for="s in toOptions" :key="s.code" :label="s.name + (s.city && s.city !== s.name ? '（' + s.city + '）' : '')" :value="s.name" />
              </el-select>
              <el-date-picker v-model="trainDate" type="date" value-format="YYYY-MM-DD" placeholder="出发日期" :disabled-date="disablePast" class="date-picker" />
              <el-button type="primary" :loading="loading" @click="searchTickets">查询车次</el-button>
            </div>
            <el-alert v-if="ticketMsg" :title="ticketMsg" :type="ticketOk ? 'success' : 'warning'" :closable="false" class="mb8" />
            <div v-if="trains.length" class="train-count">共 {{ trains.length }} 趟车 · 点击行展开查看经停站与沿途非遗</div>
            <el-table :data="trains" size="small" class="train-table" @expand-change="onExpand" :row-class-name="rowClass">
              <el-table-column type="expand">
                <template #default="{ row }">
                  <div class="detail-box">
                    <div class="detail-title">💴 票价（{{ row.trainCode }}）</div>
                    <div class="price-chips">
                      <template v-if="priceMap[row.trainCode]">
                        <el-tag v-for="(v, k) in priceMap[row.trainCode]" :key="k" size="small" class="price-tag">{{ k }} ¥{{ v }}</el-tag>
                      </template>
                      <el-button v-else size="small" text type="primary" @click="loadPrices(row)">加载票价</el-button>
                    </div>
                    <div v-if="row.stops && row.stops.length" class="detail-title">🛤️ 经停站（黄色=该城市有非遗）</div>
                    <div v-if="row.stops && row.stops.length" class="stops-flow">
                      <div v-for="(s, i) in row.stops" :key="i" class="stop-node" @click="focusStation(s)">
                        <div class="stop-dot" :class="{ highlight: s.heritageCount > 0 }"></div>
                        <div class="stop-info">
                          <div class="stop-name">{{ s.stationName }} <span v-if="s.arriveTime && s.arriveTime !== '----'" class="stop-time">到 {{ s.arriveTime }}</span></div>
                          <div class="stop-extra">{{ s.city || '未知' }} · 🏛️ 非遗 {{ s.heritageCount }} 项</div>
                        </div>
                      </div>
                    </div>
                    <div v-if="row.stops && !row.stops.length" class="detail-empty">该车次经停站数据暂未加载到坐标</div>
                  </div>
                </template>
              </el-table-column>
              <el-table-column prop="trainCode" label="车次" width="76" />
              <el-table-column prop="startTime" label="出发" width="66" />
              <el-table-column prop="arriveTime" label="到达" width="66" />
              <el-table-column prop="duration" label="历时" width="76" />
              <el-table-column label="座位余票" min-width="150">
                <template #default="{ row }">
                  <span v-if="row.seats && Object.keys(row.seats).length">{{ seatText(row.seats) }}</span>
                  <span v-else class="no-seat">—</span>
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>

          <el-tab-pane label="景点间最优路线" name="route">
            <div class="query-bar">
              <el-select v-model="routeA" filterable placeholder="景点 A" class="st-select" @change="onRouteChange">
                <el-option v-for="i in store.items" :key="i.id" :label="i.name + '（' + i.city + '）'" :value="i.id" />
              </el-select>
              <span class="arrow">→</span>
              <el-select v-model="routeB" filterable placeholder="景点 B" class="st-select" @change="onRouteChange">
                <el-option v-for="i in store.items" :key="i.id" :label="i.name + '（' + i.city + '）'" :value="i.id" />
              </el-select>
              <el-button type="primary" :loading="routeLoading" @click="planRoute">规划路线</el-button>
            </div>
            <p class="tip">自动查找两个景点所在城市的高铁站，对比「时间最短 / 花费最低」两种出行方案，路线会画在地图上。</p>
            <el-alert v-if="routeMsg" :title="routeMsg" :type="routeOk ? 'success' : 'warning'" :closable="false" class="mb8" />
            <div v-if="routeResult" class="route-result">
              <div class="route-card time">
                <div class="rc-title">⏱️ 时间最短（蓝色）</div>
                <div class="rc-body">
                  <div class="rc-line"><b>{{ routeResult.bestTime.trainCode }}</b> {{ routeResult.bestTime.startTime }} → {{ routeResult.bestTime.arriveTime }}（历时 {{ routeResult.bestTime.duration }}）</div>
                  <div class="rc-line">💴 {{ routeResult.bestTime.priceText || '——' }}</div>
                  <div class="rc-line stops-text">🛤️ 途经：{{ routeResult.bestTime.stopsText || '——' }}</div>
                </div>
              </div>
              <div class="route-card cost">
                <div class="rc-title">💰 花费最低（橙色）</div>
                <div class="rc-body">
                  <div class="rc-line"><b>{{ routeResult.bestCost.trainCode }}</b> {{ routeResult.bestCost.startTime }} → {{ routeResult.bestCost.arriveTime }}（历时 {{ routeResult.bestCost.duration }}）</div>
                  <div class="rc-line">💴 {{ routeResult.bestCost.priceText || '——' }}</div>
                  <div class="rc-line stops-text">🛤️ 途经：{{ routeResult.bestCost.stopsText || '——' }}</div>
                </div>
              </div>
              <div class="route-note">📍 {{ routeResult.note }}</div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
      <!-- 右侧：地图 -->
      <div class="tp-right">
        <div ref="mapEl" class="travel-map"></div>
        <div class="map-legend">
          <span class="lg"><i class="lg-dot heritage"></i>非遗点</span>
          <span class="lg"><i class="lg-dot stop"></i>经停站</span>
          <span class="lg"><i class="lg-line blue"></i>时间最短</span>
          <span class="lg"><i class="lg-line orange"></i>花费最低</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import OMap from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Style, Circle as CircleStyle, Fill, Stroke, Text } from 'ol/style';
import { Feature } from 'ol';
import { Point, LineString } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import { useDataStore } from '@/services/stores/dataStore';

interface Station { name: string; code: string; pinyin: string; py_short: string; city?: string }
interface TrainRow { trainNo: string; trainCode: string; fromStation: string; toStation: string; startTime: string; arriveTime: string; duration: string; seats: Record<string, string>; stops?: any[]; canBuy?: boolean }

const store = useDataStore();
store.init();

const tab = ref('train');
const fromStation = ref('');
const toStation = ref('');
const trainDate = ref('');
const fromOptions = ref<Station[]>([]);
const toOptions = ref<Station[]>([]);
const stLoading = ref(false);
const loading = ref(false);
const trains = ref<TrainRow[]>([]);
const priceMap = ref<Record<string, Record<string, string>>>({});
const ticketMsg = ref('');
const ticketOk = ref(false);

const routeA = ref<number | null>(null);
const routeB = ref<number | null>(null);
const routeLoading = ref(false);
const routeMsg = ref('');
const routeOk = ref(false);
const routeResult = ref<any>(null);

const SEAT_NAMES: Record<string, string> = { business: '商务座', firstClass: '一等座', secondClass: '二等座', hardSleeper: '硬卧', hardSeat: '硬座', noSeat: '无座' };

// ===== 地图 =====
const mapEl = ref<HTMLElement | null>(null);
let map: OMap | null = null;
let heritageLayer: VectorLayer<VectorSource> | null = null;
let routeLayer: VectorLayer<VectorSource> | null = null;
const CAT_COLORS: Record<string, string> = {
  '民间文学': '#8e44ad', '传统音乐': '#2980b9', '传统舞蹈': '#e67e22', '传统戏剧': '#c0392b', '曲艺': '#16a085',
  '传统体育、游艺与杂技': '#27ae60', '传统美术': '#f39c12', '传统技艺': '#d35400', '传统医药': '#2c3e50', '民俗': '#1abc9c',
};

function initMap() {
  if (!mapEl.value || map) return;
  map = new OMap({
    target: mapEl.value,
    layers: [new TileLayer({
      source: new XYZ({
        url: '/api/tianditu/xyz/vec_w/{z}/{x}/{y}',
        maxZoom: 18,
        attributions: '天地图',
      }),
    })],
    view: new View({
      projection: 'EPSG:3857',
      center: fromLonLat([118.2, 36.3]),
      zoom: 6,
      minZoom: 5,
      // 中国范围平滑约束（手算 3857：73E~135E, 3N~54N）
      extent: [8126323, 334111, 15028131, 7170156],
      constrainOnlyCenter: true,
      smoothExtentConstraint: true,
    }),
    controls: [],
  });
  // 非遗点图层（所有项目，小圆点）
  const hsrc = new VectorSource();
  store.items.forEach((i: any) => {
    const f = new Feature({ geometry: new Point(fromLonLat([i.lng, i.lat])) });
    f.setStyle(new Style({
      image: new CircleStyle({ radius: 4, fill: new Fill({ color: CAT_COLORS[i.category] || '#999' }), stroke: new Stroke({ color: '#fff', width: 1 }) }),
    }));
    hsrc.addFeature(f);
  });
  heritageLayer = new VectorLayer({ source: hsrc });
  map.addLayer(heritageLayer);
  // 路线图层（经停/规划）
  routeLayer = new VectorLayer({ source: new VectorSource() });
  map.addLayer(routeLayer);
}

function clearRoute() {
  if (routeLayer) routeLayer.getSource()?.clear();
}

/** 球面弧线插值：两点间生成带弧度的曲线点（模拟大圆航线/铁路走向，比直线自然） */
function arcLine(lng1: number, lat1: number, lng2: number, lat2: number, segments = 24): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    // 经度线性插值，纬度用正弦平滑（产生弧线隆起）
    const lng = lng1 + (lng2 - lng1) * t;
    const lat = lat1 + (lat2 - lat1) * t + Math.sin(t * Math.PI) * (Math.abs(lng2 - lng1) * 0.18);
    pts.push([lng, lat]);
  }
  return pts;
}

/** 多点连线转弧线路径：相邻点之间用 arcLine 插值拼接（模拟大圆航线，视觉自然） */
function multiArcLine(pts: [number, number][]): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const seg = arcLine(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
    if (i > 0) seg.shift();
    out.push(...seg);
  }
  return out;
}

/** 画经停站连线 + 站点标注 */
function drawStops(stops: any[]) {
  clearRoute();
  const src = routeLayer!.getSource()!;
  const pts = stops.filter((s: any) => s.lng != null && s.lat != null);
  if (pts.length >= 2) {
    // 相邻经停站之间用弧线连接（更接近真实铁路走向）
    const arcPts = multiArcLine(pts.map((s: any) => [s.lng, s.lat] as [number, number]));
    const line = new Feature({ geometry: new LineString(arcPts.map((p) => fromLonLat(p))) });
    line.setStyle(new Style({ stroke: new Stroke({ color: '#1a56db', width: 3, lineDash: [6, 4] }) }));
    src.addFeature(line);
  }
  pts.forEach((s: any) => {
    const f = new Feature({ geometry: new Point(fromLonLat([s.lng, s.lat])) });
    f.setStyle(new Style({
      image: new CircleStyle({ radius: s.heritageCount > 0 ? 9 : 6, fill: new Fill({ color: s.heritageCount > 0 ? '#f6a623' : '#1a56db' }), stroke: new Stroke({ color: '#fff', width: 2 }) }),
      text: new Text({ text: s.stationName, offsetY: -14, font: 'bold 11px sans-serif', fill: new Fill({ color: '#333' }), stroke: new Stroke({ color: '#fff', width: 3 }) }),
    }));
    f.set('stopData', s);
    src.addFeature(f);
  });
  if (pts.length) {
    const first = pts[0], last = pts[pts.length - 1];
    map?.getView().animate({ center: fromLonLat([(first.lng + last.lng) / 2, (first.lat + last.lat) / 2]), zoom: 7, duration: 600 });
  }
}

/** 画景点间规划路线：A 城→车站→车站→B 城，时间/花费两条 */
/** 用某车次的经停站序列画轨迹线（真实走向：高铁/普速经停站不同，轨迹天然不同） */
function drawRouteTrajectory(src: any, stops: any[], color: string, width: number, dash?: number[]) {
  const pts = (stops || []).filter((s: any) => s.lng != null && s.lat != null);
  if (pts.length >= 2) {
    // 相邻经停站之间沿铁路线或弧线连接
    const arcPts = multiArcLine(pts.map((s: any) => [s.lng, s.lat] as [number, number]));
    const f = new Feature({ geometry: new LineString(arcPts.map((p) => fromLonLat(p))) });
    f.setStyle(new Style({ stroke: new Stroke({ color, width, ...(dash ? { lineDash: dash } : {}) }) }));
    src.addFeature(f);
  }
  // 经停站标记
  pts.forEach((s: any) => {
    const f = new Feature({ geometry: new Point(fromLonLat([s.lng, s.lat])) });
    f.setStyle(new Style({
      image: new CircleStyle({ radius: 4.5, fill: new Fill({ color }), stroke: new Stroke({ color: '#fff', width: 1.5 }) }),
      text: new Text({ text: s.stationName, offsetY: -13, font: '10px sans-serif', fill: new Fill({ color: '#333' }), stroke: new Stroke({ color: '#fff', width: 2.5 }) }),
    }));
    src.addFeature(f);
  });
}

function drawPlan(plan: any) {
  clearRoute();
  const src = routeLayer!.getSource()!;
  const a: any = plan.aItem, b: any = plan.bItem;
  const sa: any = plan.fromSt, sb: any = plan.toSt;
  // 时间最短线（蓝）：沿该车次真实经停站
  if (plan.bestTime && plan.bestTime.stops) {
    drawRouteTrajectory(src, plan.bestTime.stops, '#1a56db', 4);
  }
  // 花费最低线（橙）：沿该车次真实经停站（与蓝色轨迹不同）
  if (plan.bestCost && plan.bestCost.stops) {
    drawRouteTrajectory(src, plan.bestCost.stops, '#f39c12', 3, [8, 5]);
  }
  // A/B 景点
  [a, b].forEach((it, i) => {
    const f = new Feature({ geometry: new Point(fromLonLat([it.lng, it.lat])) });
    f.setStyle(new Style({
      image: new CircleStyle({ radius: 10, fill: new Fill({ color: i === 0 ? '#e74c3c' : '#9b59b6' }), stroke: new Stroke({ color: '#fff', width: 2 }) }),
      text: new Text({ text: (i === 0 ? 'A ' : 'B ') + it.name, offsetY: -16, font: 'bold 12px sans-serif', fill: new Fill({ color: '#333' }), stroke: new Stroke({ color: '#fff', width: 3 }) }),
    }));
    src.addFeature(f);
  });
  // 车站
  [sa, sb].forEach((st: any) => {
    if (!st || st.lng == null) return;
    const f = new Feature({ geometry: new Point(fromLonLat([st.lng, st.lat])) });
    f.setStyle(new Style({
      image: new CircleStyle({ radius: 6, fill: new Fill({ color: '#16a085' }), stroke: new Stroke({ color: '#fff', width: 2 }) }),
      text: new Text({ text: st.name, offsetY: -14, font: 'bold 11px sans-serif', fill: new Fill({ color: '#333' }), stroke: new Stroke({ color: '#fff', width: 3 }) }),
    }));
    src.addFeature(f);
  });
  const lons = [a.lng, b.lng, sa?.lng, sb?.lng].filter((x: any) => x != null);
  const lats = [a.lat, b.lat, sa?.lat, sb?.lat].filter((x: any) => x != null);
  if (lons.length) {
    map?.getView().animate({ center: fromLonLat([(Math.min(...lons) + Math.max(...lons)) / 2, (Math.min(...lats) + Math.max(...lats)) / 2]), zoom: 6.5, duration: 600 });
  }
}

function focusStation(s: any) {
  if (s.lng != null && s.lat != null) {
    map?.getView().animate({ center: fromLonLat([s.lng, s.lat]), zoom: 9, duration: 500 });
  }
}

// ===== 查询逻辑 =====
function disablePast(date: Date) { return date.getTime() < Date.now() - 86400000; }

async function searchStationsApi(q: string): Promise<Station[]> {
  if (!q) return [];
  try {
    const r = await fetch('/api/train/stations?q=' + encodeURIComponent(q) + '&limit=10');
    const j = await r.json();
    return j.success ? j.stations : [];
  } catch { return []; }
}

async function searchFrom(q: string) { stLoading.value = true; fromOptions.value = await searchStationsApi(q); stLoading.value = false; }
async function searchTo(q: string) { stLoading.value = true; toOptions.value = await searchStationsApi(q); stLoading.value = false; }
function onFromChange(v: string) { if (!v) { trains.value = []; priceMap.value = {}; } }
function onToChange(v: string) { if (!v) { trains.value = []; priceMap.value = {}; } }

function seatText(seats: Record<string, string>): string {
  return Object.entries(seats).map(([k, v]) => (SEAT_NAMES[k] || k) + ' ' + v).join(' · ');
}

function rowClass({ row }: { row: TrainRow }) {
  return row.stops && row.stops.length ? 'train-row-mapped' : '';
}

async function searchTickets() {
  if (!fromStation.value || !toStation.value) { ElMessage.warning('请选择出发站和到达站'); return; }
  const date = trainDate.value || new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  trainDate.value = date;
  loading.value = true; ticketMsg.value = '';
  try {
    const r = await fetch('/api/train/tickets?from=' + encodeURIComponent(fromStation.value) + '&to=' + encodeURIComponent(toStation.value) + '&date=' + date);
    const j = await r.json();
    if (!j.success) { ticketOk.value = false; ticketMsg.value = j.error || '查询失败'; trains.value = []; return; }
    ticketOk.value = true;
    ticketMsg.value = '查询成功：' + j.fromName + ' → ' + j.toName + '，共 ' + j.count + ' 趟车';
    trains.value = j.trains.map((t: any) => ({ ...t, stops: undefined }));
    priceMap.value = {};
  } catch { ticketOk.value = false; ticketMsg.value = '网络错误'; } finally { loading.value = false; }
}

async function loadPrices(_row: TrainRow) {
  if (!trainDate.value) return;
  try {
    const r = await fetch('/api/train/prices?from=' + encodeURIComponent(fromStation.value) + '&to=' + encodeURIComponent(toStation.value) + '&date=' + trainDate.value);
    const j = await r.json();
    if (j.success) {
      const m: Record<string, Record<string, string>> = {};
      j.data.forEach((d: any) => { m[d.trainCode] = d.prices; });
      priceMap.value = m;
    }
  } catch {}
}

async function loadStops(row: TrainRow) {
  if (!row.trainNo || !trainDate.value) return;
  try {
    const r = await fetch('/api/train/route?trainNo=' + row.trainNo + '&from=' + encodeURIComponent(fromStation.value) + '&to=' + encodeURIComponent(toStation.value) + '&date=' + trainDate.value);
    const j = await r.json();
    if (j.success) {
      row.stops = j.stops;
      // 有坐标就画图
      if (j.stops.some((s: any) => s.lng != null)) drawStops(j.stops);
    }
  } catch {}
}

async function onExpand(row: TrainRow, expanded: any[]) {
  if (expanded.length && row.trainNo && !row.stops) {
    await loadStops(row);
    if (!priceMap.value[row.trainCode]) await loadPrices(row);
  }
}

function onRouteChange() { routeResult.value = null; routeMsg.value = ''; }

async function planRoute() {
  const a = store.items.find((i: any) => i.id === routeA.value);
  const b = store.items.find((i: any) => i.id === routeB.value);
  if (!a || !b) { ElMessage.warning('请选择两个景点'); return; }
  if (a.city === b.city) { routeOk.value = false; routeMsg.value = '两个景点在同一城市，市内出行无需火车'; routeResult.value = null; return; }
  routeLoading.value = true; routeMsg.value = ''; routeResult.value = null;
  try {
    const date = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const ca = a.city.replace(/市$/, '');
    const cb = b.city.replace(/市$/, '');
    const [sa, sb] = await Promise.all([searchStationsApi(ca), searchStationsApi(cb)]);
    const fromSt = sa[0]?.name, toSt = sb[0]?.name;
    if (!fromSt || !toSt) { routeOk.value = false; routeMsg.value = '找不到对应城市的高铁站'; return; }
    const r = await fetch('/api/train/tickets?from=' + encodeURIComponent(fromSt) + '&to=' + encodeURIComponent(toSt) + '&date=' + date);
    const j = await r.json();
    if (!j.success || !j.trains.length) { routeOk.value = false; routeMsg.value = j.error || '该线路无直达车次'; return; }
    const p = await fetch('/api/train/prices?from=' + encodeURIComponent(fromSt) + '&to=' + encodeURIComponent(toSt) + '&date=' + date);
    const pj = await p.json();
    const pm: Record<string, Record<string, string>> = {};
    if (pj.success) pj.data.forEach((d: any) => { pm[d.trainCode] = d.prices; });
    const rows = j.trains.map((t: any) => ({ ...t, prices: pm[t.trainCode] || {} }));
    const bestTime = [...rows].sort((x, y) => durMin(x.duration) - durMin(y.duration))[0];
    const bestCost = [...rows].sort((x, y) => minPrice(x.prices) - minPrice(y.prices))[0];
    routeOk.value = true;
    // 分别查两个车次的真实经停站 → 各自轨迹
    async function loadStopsOf(train: any) {
      if (!train?.trainNo) return null;
      try {
        const rr = await fetch('/api/train/route?trainNo=' + train.trainNo + '&from=' + encodeURIComponent(fromSt) + '&to=' + encodeURIComponent(toSt) + '&date=' + date);
        const rj = await rr.json();
        return rj.success ? rj.stops : null;
      } catch { return null; }
    }
    const [stopsTime, stopsCost] = await Promise.all([loadStopsOf(bestTime), loadStopsOf(bestCost)]);
    routeResult.value = {
      bestTime: { trainCode: bestTime.trainCode, startTime: bestTime.startTime, arriveTime: bestTime.arriveTime, duration: bestTime.duration, fromName: j.fromName, toName: j.toName, priceText: priceText(bestTime.prices), stops: stopsTime, stopsText: stopsText(stopsTime) },
      bestCost: { trainCode: bestCost.trainCode, startTime: bestCost.startTime, arriveTime: bestCost.arriveTime, duration: bestCost.duration, fromName: j.fromName, toName: j.toName, priceText: priceText(bestCost.prices), stops: stopsCost, stopsText: stopsText(stopsCost) },
      note: '出发站 ' + fromSt + '（' + a.city + '）→ 到达站 ' + toSt + '（' + b.city + '），日期 ' + date + '，共 ' + j.trains.length + ' 趟直达车',
      aItem: a, bItem: b, fromSt: { name: fromSt }, toSt: { name: toSt },
    };
    drawPlan(routeResult.value);
  } catch { routeOk.value = false; routeMsg.value = '查询失败'; } finally { routeLoading.value = false; }
}

function durMin(d: string): number {
  const m = (d || '').match(/(\d+):(\d+)/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : 99999;
}
function minPrice(prices: Record<string, string>): number {
  const keys = ['二等座', '硬座', '硬卧', '一等座'];
  for (const k of keys) { if (prices[k]) { const v = parseFloat(prices[k]); if (!isNaN(v)) return v; } }
  return 99999;
}
function priceText(prices: Record<string, string>): string {
  if (!prices || !Object.keys(prices).length) return '票价未加载';
  return Object.entries(prices).map(([k, v]) => k + ' ¥' + v).join(' / ');
}

/** 经停站序列文字（展示"经过了哪些地方"） */
function stopsText(stops: any[] | null): string {
  if (!stops || !stops.length) return '经停站信息不可用';
  return stops.map((s: any) => s.stationName).join(' → ');
}

onMounted(async () => {
  const d = new Date(Date.now() + 86400000);
  trainDate.value = d.toISOString().slice(0, 10);
  await nextTick();
  initMap();
});
onBeforeUnmount(() => {
  map?.setTarget(undefined);
  map = null;
});
</script>

<style scoped>
.travel-page { height: 100%; display: flex; flex-direction: column; overflow: hidden; background: #f7f5ef; padding: 12px 16px; }
.tp-header { margin-bottom: 8px; flex-shrink: 0; }
.tp-title { font-size: 20px; font-weight: 700; color: #4a3a1f; }
.tp-sub { font-size: 12px; color: #8a7148; margin-top: 2px; }
.tp-body { flex: 1; display: flex; gap: 12px; min-height: 0; }
.tp-left { width: 460px; flex-shrink: 0; overflow-y: auto; background: #fff; border-radius: 10px; border: 1px solid #e5dcc3; padding: 10px 12px; }
.tp-right { flex: 1; position: relative; min-width: 0; }
.travel-map { position: absolute; inset: 0; border-radius: 10px; overflow: hidden; border: 1px solid #e5dcc3; }
.map-legend { position: absolute; bottom: 10px; left: 10px; z-index: 5; background: rgba(255,255,255,0.92); border-radius: 8px; padding: 6px 10px; display: flex; gap: 12px; font-size: 11px; color: #555; }
.lg { display: inline-flex; align-items: center; gap: 4px; }
.lg-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
.lg-dot.heritage { background: #27ae60; }
.lg-dot.stop { background: #1a56db; }
.lg-line { width: 18px; height: 3px; border-radius: 2px; display: inline-block; }
.lg-line.blue { background: #1a56db; }
.lg-line.orange { background: #f39c12; }
.tp-tabs { }
.query-bar { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
.st-select { width: 170px; }
.date-picker { width: 140px; }
.arrow { font-size: 15px; color: #b08d57; font-weight: 700; }
.mb8 { margin-bottom: 8px; }
.train-count { font-size: 12px; color: #666; margin-bottom: 6px; }
.train-table { width: 100%; }
.train-row-mapped { background: #f0f7ff !important; }
.detail-box { padding: 6px 12px 10px; background: #faf8f2; }
.detail-title { font-size: 12px; font-weight: 700; color: #6d4c2a; margin: 6px 0 4px; }
.price-chips { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
.price-tag { margin-right: 0; }
.stops-flow { display: flex; flex-wrap: wrap; }
.stop-node { display: flex; align-items: flex-start; gap: 6px; width: 50%; padding: 2px 2px; cursor: pointer; border-radius: 4px; }
.stop-node:hover { background: #eef3fb; }
.stop-dot { width: 10px; height: 10px; border-radius: 50%; background: #c9b98a; margin-top: 4px; flex-shrink: 0; }
.stop-dot.highlight { background: #f6a623; box-shadow: 0 0 4px rgba(246,166,35,0.8); }
.stop-info { min-width: 0; }
.stop-name { font-size: 12px; color: #333; font-weight: 600; }
.stop-time { color: #999; font-weight: 400; }
.stop-extra { font-size: 11px; color: #8a7148; }
.no-seat { color: #bbb; }
.detail-empty { font-size: 12px; color: #999; padding: 4px 0; }
.tip { font-size: 12px; color: #999; margin: 0 0 8px; }
.route-result { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 6px; }
.route-card { flex: 1; min-width: 200px; border-radius: 8px; padding: 10px 12px; border: 1px solid #e5dcc3; }
.route-card.time { background: #f0f7ff; }
.route-card.cost { background: #fdf6ec; }
.rc-title { font-size: 13px; font-weight: 700; color: #4a3a1f; margin-bottom: 6px; }
.rc-line { font-size: 12px; color: #555; margin: 3px 0; }
.route-note { width: 100%; font-size: 11px; color: #8a7148; }
.stops-text { color: #666; line-height: 1.5; }
</style>