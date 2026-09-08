<template>
  <div class="travel-page">
    <div class="tp-header">
      <div class="header-left">
        <div class="tp-title">
          <span class="symbol">❖</span> 齐鲁非遗研学路线与智能出行规划
        </div>
        <div class="tp-sub">
          融合高德商业级驾车路径规划与铁路客运数据 · 支持同城与跨城非遗自驾研学、真实公路网络导航轨迹、沿途实况气象感知
        </div>
      </div>
      <div class="header-right">
        <el-radio-group v-model="mapBasemapType" size="small" @change="onBasemapChange">
          <el-radio-button label="amap-vec">高德矢量</el-radio-button>
          <el-radio-button label="amap-img">高德卫星</el-radio-button>
          <el-radio-button label="tianditu">天地图</el-radio-button>
        </el-radio-group>
      </div>
    </div>

    <div class="tp-body">
      <!-- 左侧：表单 + 规划面板 -->
      <div class="tp-left">
        <el-tabs v-model="activeTab" class="tp-tabs">
          <!-- 标签页 1：高德自驾研学路线规划 (主打核心) -->
          <el-tab-pane label="❖ 非遗自驾研学导航 (高德规划)" name="driving">
            <!-- 经典路线一键体验 -->
            <div class="preset-section">
              <div class="section-label">❖ 经典齐鲁非遗自驾研学预设：</div>
              <div class="preset-chips">
                <button
                  v-for="(p, idx) in presetRoutes"
                  :key="idx"
                  class="preset-btn"
                  @click="applyPresetRoute(p)"
                >
                  {{ p.name }}
                </button>
              </div>
            </div>

            <!-- 自定义规划表单 -->
            <div class="query-panel">
              <div class="form-row">
                <span class="row-tag origin">起点</span>
                <el-select
                  v-model="driveOriginId"
                  filterable
                  placeholder="选择起点非遗项目"
                  class="route-select"
                  @change="onDrivePointChange"
                >
                  <el-option
                    v-for="item in store.items"
                    :key="item.id"
                    :label="item.name + ' (' + item.city + (item.district ? '·' + item.district : '') + ')'"
                    :value="item.id"
                  />
                </el-select>
              </div>

              <div class="form-row">
                <span class="row-tag waypoint">途经</span>
                <el-select
                  v-model="driveWaypointId"
                  filterable
                  clearable
                  placeholder="可选途经非遗打卡点"
                  class="route-select"
                  @change="onDrivePointChange"
                >
                  <el-option
                    v-for="item in store.items"
                    :key="item.id"
                    :label="item.name + ' (' + item.city + ')'"
                    :value="item.id"
                  />
                </el-select>
              </div>

              <div class="form-row">
                <span class="row-tag dest">终点</span>
                <el-select
                  v-model="driveDestId"
                  filterable
                  placeholder="选择终点非遗项目"
                  class="route-select"
                  @change="onDrivePointChange"
                >
                  <el-option
                    v-for="item in store.items"
                    :key="item.id"
                    :label="item.name + ' (' + item.city + (item.district ? '·' + item.district : '') + ')'"
                    :value="item.id"
                  />
                </el-select>
              </div>

              <div class="form-actions">
                <el-button type="primary" :loading="drivingLoading" class="btn-plan" @click="planDrivingRoute">
                  <el-icon><Promotion /></el-icon> 规划高德自驾公路路线
                </el-button>
                <el-button size="small" @click="resetDrivingForm">重置</el-button>
              </div>
            </div>

            <!-- 路线规划结果 -->
            <div v-if="drivingResult" class="drive-result-container">
              <!-- 行程指标摘要卡片 -->
              <div class="trip-summary-card">
                <div class="trip-metric">
                  <div class="tm-lbl">全程里程</div>
                  <div class="tm-val highlight">{{ drivingResult.distanceKm }} <span class="unit">公里</span></div>
                </div>
                <div class="trip-metric">
                  <div class="tm-lbl">预计车程</div>
                  <div class="tm-val">{{ drivingResult.durationText }}</div>
                </div>
                <div class="trip-metric">
                  <div class="tm-lbl">过路费预估</div>
                  <div class="tm-val">¥{{ drivingResult.tolls }} <span class="unit">元</span></div>
                </div>
                <div class="trip-metric">
                  <div class="tm-lbl">红绿灯数</div>
                  <div class="tm-val">{{ drivingResult.trafficLights }} <span class="unit">个</span></div>
                </div>
              </div>

              <!-- 目的地天气实况（高德 Weather API 赋能） -->
              <div v-if="destWeather" class="weather-card">
                <div class="wc-left">
                  <span class="wc-tag">目的地实况天气</span>
                  <div class="wc-city">{{ destWeather.city }}</div>
                </div>
                <div class="wc-mid">
                  <div class="wc-temp">{{ destWeather.temperature }}℃</div>
                  <div class="wc-condition">{{ destWeather.weather }} · {{ destWeather.winddirection }}风 {{ destWeather.windpower }}级</div>
                </div>
                <div class="wc-right">
                  <div class="wc-hum">相对湿度：{{ destWeather.humidity }}%</div>
                  <div class="wc-tip">适合开展非遗田野实地走访</div>
                </div>
              </div>

              <!-- 途经重点路段指示折叠 -->
              <div class="route-steps-box">
                <div class="steps-title">
                  <span>❖ 主要道路指引（共 {{ drivingResult.steps.length }} 段）</span>
                  <span class="steps-sub">由高德路径规划引擎实时计算</span>
                </div>
                <div class="steps-list">
                  <div v-for="(step, idx) in drivingResult.steps" :key="idx" class="step-item">
                    <span class="step-idx">{{ idx + 1 }}</span>
                    <div class="step-text" v-html="sanitizeInstruction(step.instruction)"></div>
                    <span class="step-dist">{{ (Number(step.distance) / 1000).toFixed(1) }} km</span>
                  </div>
                </div>
              </div>
            </div>
          </el-tab-pane>

          <!-- 标签页 2：城市间火车时刻与票价 (12306 铁路客运) -->
          <el-tab-pane label="❖ 城际铁路与火车 (12306)" name="train">
            <div class="query-bar">
              <el-select
                v-model="fromStation"
                filterable
                remote
                clearable
                placeholder="出发站（如 济南）"
                :remote-method="searchFrom"
                :loading="stLoading"
                class="st-select"
                @change="onFromChange"
              >
                <el-option
                  v-for="s in fromOptions"
                  :key="s.code"
                  :label="s.name + (s.city && s.city !== s.name ? '（' + s.city + '）' : '')"
                  :value="s.name"
                />
              </el-select>
              <span class="arrow">→</span>
              <el-select
                v-model="toStation"
                filterable
                remote
                clearable
                placeholder="到达站（如 青岛）"
                :remote-method="searchTo"
                :loading="stLoading"
                class="st-select"
                @change="onToChange"
              >
                <el-option
                  v-for="s in toOptions"
                  :key="s.code"
                  :label="s.name + (s.city && s.city !== s.name ? '（' + s.city + '）' : '')"
                  :value="s.name"
                />
              </el-select>
              <el-date-picker
                v-model="trainDate"
                type="date"
                value-format="YYYY-MM-DD"
                placeholder="出发日期"
                :disabled-date="disablePast"
                class="date-picker"
              />
              <el-button type="primary" :loading="loading" @click="searchTickets">查询车次</el-button>
            </div>
            <el-alert v-if="ticketMsg" :title="ticketMsg" :type="ticketOk ? 'success' : 'warning'" :closable="false" class="mb8" />
            <div v-if="trains.length" class="train-count">共 {{ trains.length }} 趟车 · 点击行展开查看经停站与票价</div>
            <el-table :data="trains" size="small" class="train-table" @expand-change="onExpand" :row-class-name="rowClass">
              <el-table-column type="expand">
                <template #default="{ row }">
                  <div class="detail-box">
                    <div class="detail-title">❖ 票价参考（{{ row.trainCode }}）</div>
                    <div class="price-chips">
                      <template v-if="priceMap[row.trainCode]">
                        <el-tag v-for="(v, k) in priceMap[row.trainCode]" :key="k" size="small" class="price-tag">{{ k }} ¥{{ v }}</el-tag>
                      </template>
                      <el-button v-else size="small" text type="primary" @click="loadPrices(row)">加载票价</el-button>
                    </div>
                    <div v-if="row.stops && row.stops.length" class="detail-title">❖ 沿途经停站（高亮=该城市有非遗）</div>
                    <div v-if="row.stops && row.stops.length" class="stops-flow">
                      <div v-for="(s, i) in row.stops" :key="i" class="stop-node" @click="focusStation(s)">
                        <div class="stop-dot" :class="{ highlight: s.heritageCount > 0 }"></div>
                        <div class="stop-info">
                          <div class="stop-name">{{ s.stationName }} <span v-if="s.arriveTime && s.arriveTime !== '----'" class="stop-time">到 {{ s.arriveTime }}</span></div>
                          <div class="stop-extra">{{ s.city || '未知' }} · 非遗 {{ s.heritageCount }} 项</div>
                        </div>
                      </div>
                    </div>
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
        </el-tabs>
      </div>

      <!-- 右侧：地图 -->
      <div class="tp-right">
        <div ref="mapEl" class="travel-map"></div>
        <div class="map-legend">
          <span class="lg"><i class="lg-dot heritage"></i>非遗点</span>
          <span class="lg"><i class="lg-line drive"></i>高德自驾轨迹</span>
          <span class="lg"><i class="lg-line train"></i>铁路路线</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Promotion } from '@element-plus/icons-vue';
import OMap from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Style, Circle as CircleStyle, Fill, Stroke, Text } from 'ol/style';
import { Feature } from 'ol';
import { Point, LineString } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import { useDataStore } from '@/services/stores/dataStore';
import { createBaseMapLayer, createTiandituLabelLayer, type BaseMapProvider, type BaseMapType } from '@/data/sources/tianditu';

interface Station { name: string; code: string; pinyin: string; py_short: string; city?: string }
interface TrainRow { trainNo: string; trainCode: string; fromStation: string; toStation: string; startTime: string; arriveTime: string; duration: string; seats: Record<string, string>; stops?: any[]; canBuy?: boolean }

const route = useRoute();
const store = useDataStore();
store.init();

const activeTab = ref('driving');
const mapBasemapType = ref<'amap-vec' | 'amap-img' | 'tianditu'>('amap-vec');

// ===== 高德自驾研学状态 =====
const driveOriginId = ref<number | null>(null);
const driveWaypointId = ref<number | null>(null);
const driveDestId = ref<number | null>(null);
const drivingLoading = ref(false);
const drivingResult = ref<{
  distanceKm: string;
  durationText: string;
  tolls: string;
  trafficLights: number;
  steps: { instruction: string; distance: string }[];
} | null>(null);
const destWeather = ref<{
  city: string;
  weather: string;
  temperature: string;
  winddirection: string;
  windpower: string;
  humidity: string;
} | null>(null);

// 经典齐鲁自驾研学路线预设
const presetRoutes = [
  {
    name: '❖ 山水圣人 · 齐鲁文脉自驾线',
    originName: '皮影戏',
    waypointName: '泰山石敢当习俗',
    destName: '楷雕',
  },
  {
    name: '❖ 运河商埠 · 匠心手造自驾线',
    originName: '德州黑陶烧制技艺',
    waypointName: '东昌葫芦雕刻',
    destName: '运河大鼓',
  },
  {
    name: '❖ 齐风韶乐 · 琉璃陶瓷探秘线',
    originName: '博山琉璃烧制技艺',
    waypointName: '青州挫琴',
    destName: '潍坊风筝制作技艺',
  },
];

function applyPresetRoute(p: typeof presetRoutes[0]) {
  const org = store.items.find((i) => i.name.includes(p.originName)) || store.items[0];
  const wp = store.items.find((i) => i.name.includes(p.waypointName));
  const dst = store.items.find((i) => i.name.includes(p.destName)) || store.items[1];
  if (org) driveOriginId.value = org.id;
  if (wp) driveWaypointId.value = wp.id;
  if (dst) driveDestId.value = dst.id;
  planDrivingRoute();
}

function onDrivePointChange() {
  drivingResult.value = null;
  destWeather.value = null;
}

function resetDrivingForm() {
  driveOriginId.value = null;
  driveWaypointId.value = null;
  driveDestId.value = null;
  drivingResult.value = null;
  destWeather.value = null;
  clearRoute();
}

function sanitizeInstruction(ins: string) {
  // 移除高德返回中的方括号和特殊 HTML 标记
  return ins.replace(/<[^>]+>/g, '');
}

// 执行高德自驾路线规划
async function planDrivingRoute() {
  const originItem = store.items.find((i) => i.id === driveOriginId.value);
  const destItem = store.items.find((i) => i.id === driveDestId.value);
  const wayItem = driveWaypointId.value ? store.items.find((i) => i.id === driveWaypointId.value) : null;

  if (!originItem || !destItem) {
    ElMessage.warning('请选择起点和终点非遗项目');
    return;
  }
  if (originItem.id === destItem.id) {
    ElMessage.warning('起点和终点不能为同一非遗项目');
    return;
  }

  drivingLoading.value = true;
  drivingResult.value = null;
  destWeather.value = null;

  try {
    const originStr = `${originItem.lng},${originItem.lat}`;
    const destStr = `${destItem.lng},${destItem.lat}`;
    let url = `/api/amap/direction/driving?origin=${originStr}&destination=${destStr}`;
    if (wayItem) {
      url += `&waypoints=${wayItem.lng},${wayItem.lat}`;
    }

    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== '1' || !data.route || !data.route.paths || !data.route.paths.length) {
      throw new Error(data.info || '路径规划失败');
    }

    const path = data.route.paths[0];
    const distanceMeters = Number(path.distance || 0);
    const durationSeconds = Number(path.duration || 0);
    const tolls = path.tolls || '0';
    const trafficLights = Number(path.traffic_lights || 0);

    const hours = Math.floor(durationSeconds / 3600);
    const mins = Math.floor((durationSeconds % 3600) / 60);
    const durationText = hours > 0 ? `${hours} 小时 ${mins} 分钟` : `${mins} 分钟`;

    drivingResult.value = {
      distanceKm: (distanceMeters / 1000).toFixed(1),
      durationText,
      tolls,
      trafficLights,
      steps: path.steps || [],
    };

    // 在地图上绘制高德真实公路航迹
    drawAmapDrivingRoute(path.steps, originItem, destItem, wayItem);

    // 同步获取终点城市的实况天气
    fetchDestWeather(destItem.city);

    ElMessage.success('高德公路自驾研学路线规划成功！');
  } catch (err: any) {
    ElMessage.error(err.message || '规划失败');
  } finally {
    drivingLoading.value = false;
  }
}

// 绘制高德公路轨迹折线
function drawAmapDrivingRoute(steps: any[], origin: any, dest: any, waypoint?: any) {
  clearRoute();
  const src = routeLayer!.getSource()!;
  const allCoords: [number, number][] = [];

  steps.forEach((st: any) => {
    if (st.polyline) {
      const pts = st.polyline.split(';').map((p: string) => {
        const [x, y] = p.split(',').map(Number);
        return [x, y] as [number, number];
      });
      allCoords.push(...pts);
    }
  });

  if (allCoords.length >= 2) {
    // 轨迹发光外描边
    const glowLine = new Feature({
      geometry: new LineString(allCoords.map((c) => fromLonLat(c))),
    });
    glowLine.setStyle(
      new Style({
        stroke: new Stroke({
          color: 'rgba(212, 168, 78, 0.45)',
          width: 8,
        }),
      })
    );
    src.addFeature(glowLine);

    // 核心公路红线
    const coreLine = new Feature({
      geometry: new LineString(allCoords.map((c) => fromLonLat(c))),
    });
    coreLine.setStyle(
      new Style({
        stroke: new Stroke({
          color: '#8f2317',
          width: 4,
        }),
      })
    );
    src.addFeature(coreLine);
  }

  // 起点 Pin
  const orgFeature = new Feature({ geometry: new Point(fromLonLat([origin.lng, origin.lat])) });
  orgFeature.setStyle(
    new Style({
      image: new CircleStyle({
        radius: 9,
        fill: new Fill({ color: '#8f2317' }),
        stroke: new Stroke({ color: '#fff', width: 2.5 }),
      }),
      text: new Text({
        text: `❖ 起: ${origin.name}`,
        offsetY: -16,
        font: 'bold 12px "STSong", serif',
        fill: new Fill({ color: '#2b2218' }),
        stroke: new Stroke({ color: '#fff', width: 3 }),
      }),
    })
  );
  src.addFeature(orgFeature);

  // 终点 Pin
  const dstFeature = new Feature({ geometry: new Point(fromLonLat([dest.lng, dest.lat])) });
  dstFeature.setStyle(
    new Style({
      image: new CircleStyle({
        radius: 9,
        fill: new Fill({ color: '#b4861f' }),
        stroke: new Stroke({ color: '#fff', width: 2.5 }),
      }),
      text: new Text({
        text: `❖ 终: ${dest.name}`,
        offsetY: -16,
        font: 'bold 12px "STSong", serif',
        fill: new Fill({ color: '#2b2218' }),
        stroke: new Stroke({ color: '#fff', width: 3 }),
      }),
    })
  );
  src.addFeature(dstFeature);

  // 途经点 Pin
  if (waypoint) {
    const wpFeature = new Feature({ geometry: new Point(fromLonLat([waypoint.lng, waypoint.lat])) });
    wpFeature.setStyle(
      new Style({
        image: new CircleStyle({
          radius: 8,
          fill: new Fill({ color: '#3c6a50' }),
          stroke: new Stroke({ color: '#fff', width: 2 }),
        }),
        text: new Text({
          text: `❖ 经: ${waypoint.name}`,
          offsetY: -15,
          font: 'bold 11px "STSong", serif',
          fill: new Fill({ color: '#2b2218' }),
          stroke: new Stroke({ color: '#fff', width: 3 }),
        }),
      })
    );
    src.addFeature(wpFeature);
  }

  // 视口缩放自适应整个自驾轨迹
  const lons = allCoords.map((c) => c[0]);
  const lats = allCoords.map((c) => c[1]);
  if (lons.length) {
    const minLng = Math.min(...lons), maxLng = Math.max(...lons);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    map?.getView().animate({
      center: fromLonLat([(minLng + maxLng) / 2, (minLat + maxLat) / 2]),
      zoom: 8,
      duration: 600,
    });
  }
}

// 查天气
async function fetchDestWeather(city: string) {
  try {
    const res = await fetch(`/api/amap/weather?city=${encodeURIComponent(city)}`);
    const data = await res.json();
    if (data.status === '1' && data.lives && data.lives.length) {
      const live = data.lives[0];
      destWeather.value = {
        city: live.city,
        weather: live.weather,
        temperature: live.temperature,
        winddirection: live.winddirection,
        windpower: live.windpower,
        humidity: live.humidity,
      };
    }
  } catch {}
}

// ===== 火车客运逻辑 =====
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

const SEAT_NAMES: Record<string, string> = {
  business: '商务座', firstClass: '一等座', secondClass: '二等座',
  hardSleeper: '硬卧', hardSeat: '硬座', noSeat: '无座',
};

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

async function loadPrices(_row?: TrainRow) {
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

async function onExpand(row: TrainRow, expanded: any[]) {
  if (expanded.length && row.trainNo && !row.stops) {
    if (!priceMap.value[row.trainCode]) await loadPrices(row);
  }
}

function focusStation(s: any) {
  if (s.lng != null && s.lat != null) {
    map?.getView().animate({ center: fromLonLat([s.lng, s.lat]), zoom: 9, duration: 500 });
  }
}

// ===== 地图渲染 =====
const mapEl = ref<HTMLElement | null>(null);
let map: OMap | null = null;
let baseTileLayer: TileLayer | null = null;
let labelTileLayer: TileLayer | null = null;
let heritageLayer: VectorLayer<VectorSource> | null = null;
let routeLayer: VectorLayer<VectorSource> | null = null;

function onBasemapChange(val: string) {
  if (!map || !baseTileLayer) return;
  map.removeLayer(baseTileLayer);
  if (labelTileLayer) {
    map.removeLayer(labelTileLayer);
    labelTileLayer = null;
  }

  let prov: BaseMapProvider = 'amap';
  let type: BaseMapType = 'vec';

  if (val === 'amap-vec') {
    prov = 'amap';
    type = 'vec';
  } else if (val === 'amap-img') {
    prov = 'amap';
    type = 'img';
  } else {
    prov = 'tianditu';
    type = 'vec';
  }

  baseTileLayer = createBaseMapLayer(type, prov);
  map.getLayers().insertAt(0, baseTileLayer);

  if (prov === 'tianditu') {
    labelTileLayer = createTiandituLabelLayer();
    map.getLayers().insertAt(1, labelTileLayer);
  }
}

function initMap() {
  if (!mapEl.value || map) return;

  baseTileLayer = createBaseMapLayer('vec', 'amap');

  map = new OMap({
    target: mapEl.value,
    layers: [baseTileLayer],
    view: new View({
      projection: 'EPSG:3857',
      center: fromLonLat([118.2, 36.3]),
      zoom: 7,
      minZoom: 5,
    }),
    controls: [],
  });

  // 非遗点图层（金色温润点）
  const hsrc = new VectorSource();
  store.items.forEach((i: any) => {
    const f = new Feature({ geometry: new Point(fromLonLat([i.lng, i.lat])) });
    f.setStyle(
      new Style({
        image: new CircleStyle({
          radius: 4.5,
          fill: new Fill({ color: '#b4861f' }),
          stroke: new Stroke({ color: '#ffffff', width: 1.2 }),
        }),
      })
    );
    hsrc.addFeature(f);
  });
  heritageLayer = new VectorLayer({ source: hsrc });
  map.addLayer(heritageLayer);

  // 路线图层
  routeLayer = new VectorLayer({ source: new VectorSource() });
  map.addLayer(routeLayer);
}

function clearRoute() {
  if (routeLayer) routeLayer.getSource()?.clear();
}

onMounted(() => {
  initMap();
  const qToId = route.query.toId ? Number(route.query.toId) : null;
  if (qToId && store.items.some((h) => h.id === qToId)) {
    activeTab.value = 'driving';
    driveDestId.value = qToId;
    const firstOption = store.items.find((h) => h.id !== qToId);
    if (firstOption) driveOriginId.value = firstOption.id;
    planDrivingRoute();
  } else if (presetRoutes.length) {
    applyPresetRoute(presetRoutes[0]);
  }
});

onBeforeUnmount(() => {
  map?.setTarget(undefined);
  map = null;
});
</script>

<style scoped>
.travel-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--zi-bg, #f4eddc);
  padding: 16px 20px;
  font-family: var(--zi-font-sans);
  color: var(--zi-ink, #2b2218);
  box-sizing: border-box;
}

/* 顶部标题栏 */
.tp-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
  border-bottom: 1px solid rgba(180, 134, 31, 0.25);
  padding-bottom: 10px;
}
.tp-title {
  font-family: var(--zi-font-serif, "STSong", "Songti SC", "SimSun", serif);
  font-size: 20px;
  font-weight: 700;
  color: #2b2218;
}
.symbol {
  color: #8f2317;
}
.tp-sub {
  font-size: 12px;
  color: #715f48;
  margin-top: 3px;
}

/* 主体左右分栏 */
.tp-body {
  flex: 1;
  display: flex;
  gap: 16px;
  min-height: 0;
}
.tp-left {
  width: 480px;
  background: #fffdf9;
  border: 1px solid #e7ded0;
  border-radius: 8px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 2px 10px rgba(74, 58, 31, 0.05);
  overflow-y: auto;
}
@media (max-width: 1080px) {
  .tp-left {
    width: 400px;
  }
}
@media (max-width: 860px) {
  .tp-body {
    flex-direction: column;
  }
  .tp-left {
    width: 100%;
    height: 50%;
  }
}

.preset-section {
  background: #fbf7ee;
  border: 1px solid #e8dfcb;
  border-radius: 6px;
  padding: 10px 12px;
  margin-bottom: 14px;
}
.section-label {
  font-size: 12px;
  font-weight: 700;
  color: #8f2317;
  margin-bottom: 8px;
}
.preset-chips {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.preset-btn {
  background: #ffffff;
  border: 1px solid #d9ccb6;
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 12px;
  text-align: left;
  color: #3b2e1e;
  cursor: pointer;
  transition: all 150ms ease-out;
}
.preset-btn:hover {
  background: #8f2317;
  color: #ffffff;
  border-color: #8f2317;
}

/* 路线表单 */
.query-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 14px;
}
.form-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.row-tag {
  font-size: 11px;
  font-weight: 700;
  padding: 3px 6px;
  border-radius: 3px;
  width: 32px;
  text-align: center;
  flex-shrink: 0;
}
.row-tag.origin { background: #faecea; color: #8f2317; }
.row-tag.waypoint { background: #eaf3ee; color: #3c6a50; }
.row-tag.dest { background: #fbf4ea; color: #b4861f; }
.route-select {
  flex: 1;
}
.form-actions {
  display: flex;
  gap: 10px;
  margin-top: 4px;
}
.btn-plan {
  flex: 1;
}

/* 自驾指标卡片 */
.trip-summary-card {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  background: #fbf8f0;
  border: 1px solid #e7ded0;
  border-radius: 6px;
  padding: 12px 8px;
  margin-bottom: 12px;
  text-align: center;
}
.tm-lbl {
  font-size: 11px;
  color: #887458;
}
.tm-val {
  font-size: 15px;
  font-weight: 800;
  color: #2b2218;
  margin-top: 2px;
}
.tm-val.highlight {
  color: #8f2317;
}
.unit {
  font-size: 10px;
  font-weight: normal;
}

/* 天气卡片 */
.weather-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #f4ede0;
  border: 1px solid #ded3bf;
  border-radius: 6px;
  padding: 10px 14px;
  margin-bottom: 12px;
}
.wc-tag {
  font-size: 10px;
  background: #b4861f;
  color: #fff;
  padding: 1px 4px;
  border-radius: 2px;
}
.wc-city {
  font-size: 13px;
  font-weight: 700;
  color: #2b2218;
  margin-top: 2px;
}
.wc-temp {
  font-size: 18px;
  font-weight: 800;
  color: #8f2317;
}
.wc-condition {
  font-size: 11px;
  color: #6a563f;
}
.wc-right {
  font-size: 11px;
  color: #7b6851;
  text-align: right;
}
.wc-tip {
  color: #3c6a50;
  font-weight: 600;
  margin-top: 2px;
}

/* 导航步骤折叠 */
.route-steps-box {
  border: 1px solid #e7dfd2;
  border-radius: 6px;
  background: #ffffff;
  overflow: hidden;
}
.steps-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fbf7ef;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 700;
  border-bottom: 1px solid #eee4d4;
  color: #3b2d1c;
}
.steps-sub {
  font-size: 11px;
  font-weight: normal;
  color: #8f795e;
}
.steps-list {
  max-height: 220px;
  overflow-y: auto;
  padding: 6px 10px;
}
.step-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px dashed #f0e7d8;
  font-size: 12px;
}
.step-item:last-child {
  border-bottom: none;
}
.step-idx {
  font-size: 11px;
  background: #f1e9dc;
  color: #7a6347;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.step-text {
  flex: 1;
  color: #4a3c2c;
  line-height: 1.4;
}
.step-dist {
  font-size: 11px;
  color: #9c8973;
  flex-shrink: 0;
}

/* 右侧地图 */
.tp-right {
  flex: 1;
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e5dcc7;
  box-shadow: 0 2px 10px rgba(74, 58, 31, 0.05);
}
.travel-map {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.map-legend {
  position: absolute;
  bottom: 14px;
  right: 14px;
  background: rgba(255, 253, 248, 0.94);
  border: 1px solid #dfd4bf;
  border-radius: 4px;
  padding: 6px 12px;
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: #4a3b27;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}
.lg {
  display: flex;
  align-items: center;
  gap: 5px;
}
.lg-dot.heritage {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #b4861f;
}
.lg-line.drive {
  width: 16px;
  height: 3px;
  background: #8f2317;
  border-radius: 1px;
}
.lg-line.train {
  width: 16px;
  height: 3px;
  background: #1a56db;
  border-radius: 1px;
}

/* 火车查询样式保留 */
.query-bar {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 10px;
}
.st-select { width: 140px; }
.date-picker { width: 130px; }
.train-table { margin-top: 8px; }
.detail-box { padding: 8px 12px; background: #faf6ed; border-radius: 4px; }
.detail-title { font-size: 12px; font-weight: 700; color: #8f2317; margin: 6px 0 4px; }
.price-chips { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 6px; }
.stops-flow { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px; }
.stop-node { display: flex; align-items: center; gap: 4px; background: #fff; border: 1px solid #e0d6c4; padding: 2px 6px; border-radius: 4px; cursor: pointer; }
.stop-dot { width: 6px; height: 6px; border-radius: 50%; background: #999; }
.stop-dot.highlight { background: #e67e22; }
.stop-name { font-size: 11px; font-weight: 600; }
.stop-time { color: #888; font-size: 10px; }
.stop-extra { font-size: 10px; color: #777; }
</style>