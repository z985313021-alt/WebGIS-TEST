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

      <!-- 缓冲区：支持非遗点位 / 地图选点 / 地址检索（高德地理编码）三种中心点来源 -->
      <el-tab-pane label="缓冲区" name="buffer">
        <el-form label-width="62px" size="small">
          <el-form-item label="中心点">
            <el-radio-group v-model="bufferSource" size="small" class="src-switch">
              <el-radio-button value="item">非遗点位</el-radio-button>
              <el-radio-button value="map">地图选点</el-radio-button>
              <el-radio-button value="addr">地址检索</el-radio-button>
            </el-radio-group>
          </el-form-item>

          <!-- 来源一：非遗名录点位 -->
          <el-form-item v-if="bufferSource === 'item'" label="点位">
            <el-select v-model="bufferItemId" filterable placeholder="选择非遗点位" style="width: 100%">
              <el-option v-for="i in store.items" :key="i.id" :label="`${i.name}（${i.city}）`" :value="i.id" />
            </el-select>
          </el-form-item>

          <!-- 来源二：地图拾取任意点 -->
          <template v-else-if="bufferSource === 'map'">
            <el-form-item label="选取">
              <el-button size="small" :type="picking ? 'warning' : 'primary'" @click="togglePick">
                {{ picking ? '请在地图上点击…（再次点击取消）' : '在地图上拾取中心点' }}
              </el-button>
            </el-form-item>
            <el-form-item v-if="bufferCenter" label="已选">
              <span class="picked">{{ bufferCenter.addr || '自定义坐标' }}<em>{{ fmtCoord(bufferCenter) }}</em></span>
            </el-form-item>
          </template>

          <!-- 来源三：地址 → 高德地理编码 -->
          <template v-else>
            <el-form-item label="地址">
              <el-input
                v-model="addrInput"
                size="small"
                placeholder="如：济南市历下区经十路"
                clearable
                @keyup.enter="geocodeAddress"
              />
            </el-form-item>
            <el-form-item label="解析">
              <el-button size="small" type="primary" :loading="geocoding" @click="geocodeAddress">高德解析并定位</el-button>
            </el-form-item>
            <el-form-item v-if="bufferCenter" label="已定位">
              <span class="picked">{{ bufferCenter.addr || bufferCenter.name }}<em>{{ fmtCoord(bufferCenter) }}</em></span>
            </el-form-item>
          </template>

          <el-form-item label="半径(km)">
            <el-input-number v-model="bufferRadius" :min="1" :max="500" :step="5" style="width: 100%" />
          </el-form-item>
          <el-form-item label=" ">
            <el-button type="primary" size="small" @click="runBuffer">生成缓冲区</el-button>
            <el-button v-if="bufferGeo" size="small" text type="danger" @click="clearBuffer">清除</el-button>
          </el-form-item>
        </el-form>

        <el-alert v-if="bufferResult" :title="bufferResult" type="success" :closable="false" class="result" />

        <!-- 范围内非遗清单：可二次检索、点击定位并高亮 -->
        <div v-if="bufferItems.length" class="buffer-list-wrap">
          <el-input
            v-model="bufferKeyword"
            size="small"
            placeholder="在结果中检索名称 / 地市 / 门类"
            clearable
            class="buffer-search"
          />
          <div class="buffer-list">
            <div v-for="i in filteredBufferItems" :key="i.id" class="buffer-item" @click="focusItem(i)">
              <span class="bi-seal" :style="{ background: colorOf(i.category) }">{{ glyphOf(i.category) }}</span>
              <span class="bi-name">{{ i.name }}</span>
              <span class="bi-meta">{{ i.city }}</span>
            </div>
            <div v-if="!filteredBufferItems.length" class="overlay-more">无匹配结果</div>
          </div>
          <div class="buffer-foot">
            范围内 {{ bufferItems.length }} 项，当前命中 {{ filteredBufferItems.length }} 项 · 点击条目定位并高亮
          </div>
        </div>
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
          <div class="route-title">❖ 行程单（{{ routeStops.length }} 站）</div>
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
import { computed, ref, onBeforeUnmount } from 'vue';
import { ElMessage } from 'element-plus';
import { useDataStore } from '@/services/stores/dataStore';
import { CATEGORY_COLORS, categoryGlyph, type HeritageItem } from '@/data/sources/heritage';
import { gcj02ToWgs84, wgs84ToGcj02 } from '@/services/geo/coord';
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
/** 中心点来源：非遗名录点位 / 地图拾取任意点 / 地址检索（高德地理编码） */
const bufferSource = ref<'item' | 'map' | 'addr'>('item');
const bufferItemId = ref<number | null>(null);
const bufferRadius = ref(50);
const bufferResult = ref('');
const bufferGeo = ref<object | null>(null);
/** 缓冲范围内的非遗清单 */
const bufferItems = ref<HeritageItem[]>([]);
/** 清单内二次检索关键字 */
const bufferKeyword = ref('');
/** 地图拾取 / 地址解析得到的中心点（经纬度为底图 WGS84） */
const bufferCenter = ref<{ lng: number; lat: number; name: string; addr?: string } | null>(null);
const picking = ref(false);
const addrInput = ref('');
const geocoding = ref(false);

const filteredBufferItems = computed(() => {
  const kw = bufferKeyword.value.trim();
  if (!kw) return bufferItems.value;
  return bufferItems.value.filter((i) => `${i.name}${i.city}${i.category}`.includes(kw));
});

function fmtCoord(p: { lng: number; lat: number }): string {
  return `${p.lng.toFixed(4)}°E, ${p.lat.toFixed(4)}°N`;
}
function colorOf(category: string): string {
  return CATEGORY_COLORS[category] ?? '#8a6b45';
}
function glyphOf(category: string): string {
  return categoryGlyph(category);
}

/** 当前中心点：点位模式取所选名录项，其余取拾取/解析结果 */
function currentCenter(): { lng: number; lat: number; name: string; addr?: string } | null {
  if (bufferSource.value === 'item') {
    const item = store.items.find((i) => i.id === bufferItemId.value);
    return item ? { lng: item.lng, lat: item.lat, name: item.name, addr: `${item.city} · ${item.category}` } : null;
  }
  return bufferCenter.value;
}

/** 地图拾取中心点：进入拾取模式，点选后回填坐标并逆地理编码显示所在地 */
function togglePick() {
  const ad = props.getAdapter();
  if (!ad) return;
  if (picking.value) {
    ad.stopPickPoint();
    picking.value = false;
    return;
  }
  picking.value = true;
  ad.startPickPoint(async (lonlat) => {
    picking.value = false;
    const [lng, lat] = lonlat;
    bufferCenter.value = { lng, lat, name: '地图拾取点' };
    try {
      // 高德逆地理编码需 GCJ-02 入参，底图坐标为 WGS84
      const [gl, gt] = wgs84ToGcj02(lng, lat);
      const res = await fetch(`/api/amap/regeo?location=${gl.toFixed(6)},${gt.toFixed(6)}`);
      const data = await res.json();
      const addr = data?.regeocode?.formatted_address;
      if (addr) bufferCenter.value = { lng, lat, name: String(addr), addr: String(addr) };
    } catch {
      // 逆地理失败不影响选点，沿用自定义坐标
    }
    ElMessage.success('已拾取中心点');
  });
}

/** 地址检索：高德地理编码取坐标，GCJ-02 → WGS84 后落图 */
async function geocodeAddress() {
  const kw = addrInput.value.trim();
  if (!kw) {
    ElMessage.warning('请输入地址');
    return;
  }
  geocoding.value = true;
  try {
    const res = await fetch(`/api/amap/geocode?address=${encodeURIComponent(kw)}`);
    const data = await res.json();
    const geo = data?.geocodes?.[0];
    if (!geo?.location) {
      ElMessage.error(data?.info || '未匹配到该地址');
      return;
    }
    const [gl, gt] = String(geo.location).split(',').map(Number);
    const [lng, lat] = gcj02ToWgs84(gl, gt);
    const label = geo.formatted_address || kw;
    bufferCenter.value = { lng, lat, name: kw, addr: label };
    props.getAdapter()?.zoomTo([lng, lat], 11);
    ElMessage.success('地址已解析并定位');
  } catch (e) {
    ElMessage.error('地址解析失败：' + ((e as Error)?.message ?? e));
  } finally {
    geocoding.value = false;
  }
}

function runBuffer() {
  const ad = props.getAdapter();
  if (!ad) return;
  const c = currentCenter();
  if (!c) {
    ElMessage.warning(bufferSource.value === 'item' ? '请先选择中心点' : '请先拾取或解析中心点');
    return;
  }
  const geo = createBuffer(c.lng, c.lat, bufferRadius.value);
  bufferGeo.value = geo;
  bufferItems.value = countPointsInRadius(store.items, c.lng, c.lat, bufferRadius.value);
  bufferKeyword.value = '';
  ad.removeLayer('buffer');
  // 圆 + 中心点一并落图，中心用朱砂实心点标出
  ad.addGeoJsonLayer({
    type: 'FeatureCollection',
    features: [
      geo as never,
      { type: 'Feature', geometry: { type: 'Point', coordinates: [c.lng, c.lat] }, properties: { name: c.addr || c.name } },
    ],
  } as object, 'buffer');
  bufferResult.value = `中心「${c.addr || c.name}」半径 ${bufferRadius.value}km，范围内非遗 ${bufferItems.value.length} 项`;
  ad.zoomTo([c.lng, c.lat], 9);
}

/** 清单条目 → 地图定位并高亮该非遗 */
function focusItem(i: HeritageItem) {
  store.select(i.id);
  props.getAdapter()?.zoomTo([i.lng, i.lat], 11);
}

function clearBuffer() {
  bufferGeo.value = null;
  bufferResult.value = '';
  bufferItems.value = [];
  bufferKeyword.value = '';
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
  // 离开面板时退出拾取模式，避免残留十字光标与点击拦截
  props.getAdapter()?.stopPickPoint();
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

/* 缓冲区：中心点来源切换 + 范围内清单 */
.src-switch { width: 100%; }
.src-switch :deep(.el-radio-button__inner) { padding: 5px 9px; font-size: 12px; }
.picked { display: block; font-size: 12px; color: #6d4c2a; line-height: 1.5; }
.picked em { display: block; font-style: normal; font-size: 11px; color: #a08c72; }
.buffer-list-wrap { margin-top: 10px; border-top: 1px dashed #e6ddcc; padding-top: 8px; }
.buffer-search { margin-bottom: 6px; }
.buffer-list { max-height: 220px; overflow-y: auto; }
.buffer-item {
  display: flex; align-items: center; gap: 6px; padding: 4px 6px; border-radius: 6px;
  font-size: 12px; color: #4a3a2f; cursor: pointer; transition: background 0.15s;
}
.buffer-item:hover { background: #f6efe0; }
.bi-seal {
  width: 18px; height: 18px; border-radius: 4px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  color: #fff8ec; font-size: 11px; font-weight: 700;
  font-family: KaiTi, STKaiti, SimSun, serif;
}
.bi-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bi-meta { flex-shrink: 0; font-size: 11px; color: #a08c72; }
.buffer-foot { margin-top: 6px; font-size: 11px; color: #a08c72; }
</style>
