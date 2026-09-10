<template>
  <div class="data-manage-page">
    <!-- 头部横幅 -->
    <header class="page-header">
      <div class="header-badge">❖ 空间数据资产与工作台</div>
      <h1 class="page-title">齐鲁非遗空间档案库与田野调查工作台</h1>
      <p class="page-desc">
        汇聚齐鲁大地 185+ 项国家级与省级非物质文化遗产空间要素。提供重点空间文化廊道专题图层一键挂载、多源高精度底图切换测试、开放科研数据多格式导出及田野调查空间体检规范。
      </p>
    </header>

    <!-- 一、齐鲁非遗重点专题空间图层仓储 -->
    <section class="section-block">
      <div class="section-title-bar">
        <div class="title-left">
          <span class="symbol">❖</span>
          <span class="title-text">齐鲁非遗重点专题空间图层仓储</span>
        </div>
        <span class="section-hint">预置国家级重点文化战略走廊图层，可一键挂载至 WebGIS 地图叠加分析</span>
      </div>

      <div class="thematic-grid">
        <div v-for="t in thematicLayers" :key="t.key" class="thematic-card" :class="{ 'is-loaded': isLayerLoaded(t.title) }">
          <div class="thematic-header">
            <div class="thematic-icon-wrap" :style="{ backgroundColor: t.accentBg, color: t.accentColor }">
              <el-icon :size="20"><component :is="t.icon" /></el-icon>
            </div>
            <div class="thematic-info">
              <h3 class="thematic-title">{{ t.title }}</h3>
              <div class="thematic-scope">涵盖区域：{{ t.cities }}</div>
            </div>
            <div class="thematic-badge" :style="{ color: t.accentColor, borderColor: t.accentColor }">
              {{ t.itemCount }} 项要素
            </div>
          </div>
          <p class="thematic-desc">{{ t.desc }}</p>
          <div class="thematic-tags">
            <span v-for="tag in t.tags" :key="tag" class="thematic-tag"># {{ tag }}</span>
          </div>
          <div class="thematic-footer">
            <el-button
              v-if="!isLayerLoaded(t.title)"
              type="primary"
              size="small"
              class="btn-thematic"
              @click="loadThematic(t.key, t.title)"
            >
              <el-icon><FolderAdd /></el-icon> 一键载入至地图
            </el-button>
            <el-button
              v-else
              type="success"
              size="small"
              plain
              class="btn-thematic"
              @click="router.push('/')"
            >
              <el-icon><Check /></el-icon> 已载入 · 前往地图查看
            </el-button>
          </div>
        </div>
      </div>
    </section>

    <!-- 二、开放科研数据下载中心 -->
    <section class="section-block">
      <div class="section-title-bar">
        <div class="title-left">
          <span class="symbol">❖</span>
          <span class="title-text">开放科研数据下载中心（Open Heritage Data Hub）</span>
        </div>
        <span class="section-hint">面向高校科研、文旅规划与 GIS 空间分析，提供高现势性非遗空间要素全量导出</span>
      </div>

      <div class="export-grid">
        <!-- GeoJSON 空间矢量 -->
        <div class="export-card">
          <div class="export-top">
            <div class="format-badge json">GeoJSON</div>
            <h4>空间矢量数据集</h4>
          </div>
          <p class="export-desc">标准 WGS-84 坐标系，包含完整点位、类别编码、保护批次与区县属性。完美兼容 QGIS、ArcGIS Pro 与 Mapbox。</p>
          <div class="export-stat">当前收录：185 项有效地理要素</div>
          <el-button class="export-btn" type="primary" plain @click="dataStore.exportHeritageGeoJSON()">
            <el-icon><Download /></el-icon> 导出 GeoJSON 矢量 (.geojson)
          </el-button>
        </div>

        <!-- Excel 电子表格 -->
        <div class="export-card">
          <div class="export-top">
            <div class="format-badge excel">Excel</div>
            <h4>空间名录结构化总表</h4>
          </div>
          <p class="export-desc">规范的 .xlsx 格式电子表格，包含十门类归类、行政区划、经纬度坐标及历史沿革说明。适合统计报表与学术查阅。</p>
          <div class="export-stat">格式：Microsoft Excel 工作簿 (.xlsx)</div>
          <el-button class="export-btn" type="success" plain @click="dataStore.exportHeritageExcel()">
            <el-icon><Document /></el-icon> 导出全量名录表 (.xlsx)
          </el-button>
        </div>

        <!-- CSV 文本 -->
        <div class="export-card">
          <div class="export-top">
            <div class="format-badge csv">CSV</div>
            <h4>科研纯文本数据表</h4>
          </div>
          <p class="export-desc">标准 UTF-8 带 BOM 编码逗号分隔文本，无缝对接 Python Pandas、R 语言空间分析包或 MySQL/PostgreSQL 快速入库。</p>
          <div class="export-stat">编码：UTF-8-BOM 通用兼容格式</div>
          <el-button class="export-btn" type="warning" plain @click="dataStore.exportHeritageCsv()">
            <el-icon><Tickets /></el-icon> 导出数据表 (.csv)
          </el-button>
        </div>

        <!-- 田野调查规范模板 -->
        <div class="export-card">
          <div class="export-top">
            <div class="format-badge tpl">Template</div>
            <h4>田野调查标准采集规范</h4>
          </div>
          <p class="export-desc">非遗田野工作者与志愿者标准录入模板，预置经纬度采集规范、门类对照表及防错约束，确保采集数据一次性通过空间体检。</p>
          <div class="export-stat">包含：规范表头、示例数据与填写说明</div>
          <el-button class="export-btn" type="info" plain @click="downloadTemplate('excel')">
            <el-icon><Files /></el-icon> 下载采集模板 (.xlsx)
          </el-button>
        </div>
      </div>
    </section>

    <!-- 三、工作台双栏：多源高精度底图接入测试 + 田野调查空间体检 -->
    <div class="dual-column-grid">
      <!-- 左栏：多源高精度底图接入与测试 -->
      <section class="section-block basemap-block">
        <div class="section-title-bar">
          <div class="title-left">
            <span class="symbol">❖</span>
            <span class="title-text">多源高精度空间底图接入与即时测试</span>
          </div>
        </div>
        <p class="column-desc">
          山东省非遗多植根于历史街区、传统村落与山川水网。系统提供高德高分辨率矢量路网、遥感卫星及天地图等多种底图，满足不同空间分析场景的精度需求。
        </p>

        <div class="basemap-list">
          <div
            v-for="b in basemapOptions"
            :key="b.key"
            class="basemap-item"
            :class="{ 'is-selected': isCurrentBasemap(b.provider, b.type) }"
            @click="selectBasemap(b.provider, b.type)"
          >
            <div class="basemap-item-left">
              <div class="basemap-radio-circle"></div>
              <div class="basemap-item-title">{{ b.name }}</div>
            </div>
            <div class="basemap-item-tag">{{ b.tag }}</div>
          </div>
        </div>

        <div class="basemap-meta-panel">
          <div class="meta-row">
            <span class="meta-label">投影标准：</span>
            <span class="meta-val">EPSG:3857 (Web Mercator 标准网格，无偏移撕裂)</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">当前底图：</span>
            <span class="meta-val highlight">{{ currentBasemapLabel }}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">分辨率：</span>
            <span class="meta-val">支持 1~18 级亚米级缩放与高清视网膜瓦片平滑渲染</span>
          </div>
        </div>

        <div class="basemap-actions">
          <el-button type="primary" @click="applyBasemapAndGo">
            <el-icon><Aim /></el-icon> 确认底图并前往地图查看
          </el-button>
        </div>
      </section>

      <!-- 右栏：田野调查数据导入与格式体检 -->
      <section class="section-block survey-block">
        <div class="section-title-bar">
          <div class="title-left">
            <span class="symbol">❖</span>
            <span class="title-text">田野调查数据导入与空间体检</span>
          </div>
        </div>
        <p class="column-desc">
          支持将田野调查记录文件上传体检。系统将自动进行山东省域边界越界排查、空值率分析及重复项校验，合格后可直接加载至地图叠加呈现。
        </p>

        <el-tabs v-model="activeTab" class="survey-tabs">
          <!-- Excel -->
          <el-tab-pane label="Excel 调查表" name="excel">
            <el-upload
              drag
              accept=".xlsx,.xls"
              :auto-upload="false"
              :limit="1"
              :on-change="onExcelChange"
              :on-remove="() => (excelFile = null)"
              class="custom-uploader"
            >
              <el-icon class="uploader-icon"><UploadFilled /></el-icon>
              <div class="upload-tip">点击或将田野调查 <b>.xlsx / .xls</b> 拖拽至此处</div>
            </el-upload>
            <div v-if="excelColumns.length" class="column-map">
              <div class="col-title">智能识别经纬度坐标列：</div>
              <el-form :inline="true" size="small">
                <el-form-item label="经度列">
                  <el-select v-model="lngColumn" placeholder="经度列" style="width: 120px">
                    <el-option v-for="c in excelColumns" :key="c" :label="c" :value="c" />
                  </el-select>
                </el-form-item>
                <el-form-item label="纬度列">
                  <el-select v-model="latColumn" placeholder="纬度列" style="width: 120px">
                    <el-option v-for="c in excelColumns" :key="c" :label="c" :value="c" />
                  </el-select>
                </el-form-item>
                <el-form-item label="名称列">
                  <el-select v-model="nameColumn" placeholder="名称列" clearable style="width: 130px">
                    <el-option v-for="c in excelColumns" :key="c" :label="c" :value="c" />
                  </el-select>
                </el-form-item>
              </el-form>
            </div>
          </el-tab-pane>

          <!-- GeoJSON -->
          <el-tab-pane label="GeoJSON 矢量" name="geojson">
            <el-upload
              drag
              accept=".json,.geojson"
              :auto-upload="false"
              :limit="1"
              :on-change="onGeojsonChange"
              :on-remove="() => (geojsonData = null)"
              class="custom-uploader"
            >
              <el-icon class="uploader-icon"><UploadFilled /></el-icon>
              <div class="upload-tip">拖拽或点击上传 <b>.geojson / .json</b> 矢量文件</div>
            </el-upload>
            <div v-if="geojsonData" class="file-status">
              ❖ 已选择：{{ geojsonName }}（包含 {{ (geojsonData as any)?.features?.length ?? 0 }} 个要素）
            </div>
          </el-tab-pane>

          <!-- Shapefile -->
          <el-tab-pane label="Shapefile 压缩包" name="shp">
            <el-upload
              drag
              multiple
              :auto-upload="false"
              :limit="8"
              accept=".shp,.dbf,.prj,.shx"
              :on-change="onShpChange"
              :on-remove="onShpRemove"
              class="custom-uploader"
            >
              <el-icon class="uploader-icon"><UploadFilled /></el-icon>
              <div class="upload-tip">上传 <b>.shp + .dbf</b>（必选）及 .prj 投影文件</div>
            </el-upload>
            <div v-if="shpFiles.length" class="file-status">
              ❖ 已选文件：{{ shpFiles.map((f) => f.name).join('、') }}
            </div>
          </el-tab-pane>
        </el-tabs>

        <div class="survey-actions">
          <el-button type="primary" :loading="converting" @click="convertAndCheck">
            <el-icon><Finished /></el-icon> 执行格式转换与空间体检
          </el-button>
          <el-button v-if="convertedGeo" type="success" @click="loadToMap">
            <el-icon><MapLocation /></el-icon> 加载到地图并前往
          </el-button>
          <el-button v-if="report" @click="onExportReport">
            <el-icon><DocumentChecked /></el-icon> 导出体检报告
          </el-button>
        </div>

        <!-- 体检报告 -->
        <div v-if="report" class="health-report-box">
          <div class="report-box-header">
            <span class="rb-title">❖ 空间体检结果</span>
            <el-tag :type="report.total > 0 && report.outOfBounds === 0 ? 'success' : 'warning'" size="small">
              {{ report.total > 0 && report.outOfBounds === 0 ? '全量合格' : '发现潜在风险' }}
            </el-tag>
          </div>
          <div class="report-metrics-grid">
            <div class="metric-card">
              <div class="m-val">{{ report.total }}</div>
              <div class="m-lbl">要素总数</div>
            </div>
            <div class="metric-card" :class="{ 'm-danger': report.outOfBounds > 0 }">
              <div class="m-val">{{ report.outOfBounds }}</div>
              <div class="m-lbl">山东省界越界</div>
            </div>
            <div class="metric-card" :class="{ 'm-warn': report.missingCoord > 0 }">
              <div class="m-val">{{ report.missingCoord }}</div>
              <div class="m-lbl">缺少坐标</div>
            </div>
            <div class="metric-card">
              <div class="m-val">{{ report.duplicateNames }}</div>
              <div class="m-lbl">重名项</div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- 四、已挂载至工作区的数据集 -->
    <section class="section-block">
      <div class="section-title-bar">
        <div class="title-left">
          <span class="symbol">❖</span>
          <span class="title-text">当前工作区已挂载空间图层（{{ dataStore.userDatasets.length }}）</span>
        </div>
        <el-button v-if="dataStore.userDatasets.length" size="small" type="primary" @click="router.push('/')">
          前往地图叠加查看
        </el-button>
      </div>

      <div v-if="!dataStore.userDatasets.length" class="empty-layers">
        <el-empty description="当前暂无额外挂载图层，可在上方专题仓储中一键载入" :image-size="60" />
      </div>
      <div v-else class="layers-grid">
        <div v-for="d in dataStore.userDatasets" :key="d.id" class="layer-item-card">
          <div class="layer-item-info">
            <div class="layer-item-name">{{ d.name }}</div>
            <div class="layer-item-meta">
              挂载时间：{{ d.addedAt }} · 要素量：{{ (d.health as any)?.total ?? (d.geojson as any)?.features?.length ?? 0 }}
            </div>
          </div>
          <div class="layer-item-actions">
            <el-button size="small" text type="primary" @click="router.push('/')">查看</el-button>
            <el-button size="small" text type="danger" @click="dataStore.removeUserDataset(d.id)">卸载</el-button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import {
  FolderAdd,
  Check,
  Download,
  Document,
  Tickets,
  Files,
  Aim,
  UploadFilled,
  Finished,
  MapLocation,
  DocumentChecked,
  Watermelon,
  Ship,
  Promotion,
  GoldMedal,
} from '@element-plus/icons-vue';
import { useDataStore } from '@/services/stores/dataStore';
import { useMapStore } from '@/services/stores/mapStore';
import { convertShp, convertExcel, checkHealth, downloadTemplate, exportHealthReport, type HealthReport } from '@/data/api/convert';
import type { BaseMapProvider, BaseMapType } from '@/data/sources/tianditu';
import * as XLSX from 'xlsx';

const router = useRouter();
const dataStore = useDataStore();
const mapStore = useMapStore();
dataStore.init();

// 专题图层仓储元数据
const thematicLayers = [
  {
    key: 'yellow_river',
    title: '黄河流域（山东段）非遗生态廊道',
    cities: '菏泽、济宁、泰安、聊城、济南、德州、淄博、滨州、东营 9 市',
    itemCount: 65,
    desc: '聚焦黄河入鲁九市，涵盖沿黄水工治河民俗、鲁西南鼓吹乐、鲁北木版年画、黄河陶艺等活态遗产。',
    tags: ['九市通贯', '生态非遗', '民间文学', '传统技艺'],
    accentBg: '#fbf4ea',
    accentColor: '#b4861f',
    icon: Watermelon,
  },
  {
    key: 'grand_canal',
    title: '京杭大运河（齐鲁段）活态工坊分布带',
    cities: '德州、聊城、泰安、济宁、枣庄 5 市',
    itemCount: 48,
    desc: '沿千年运河商贸水道分布，涵盖临清贡砖、台庄运河社戏、微山湖民间造船手艺及运河沿岸老字号。',
    tags: ['运河漕运', '商埠手造', '传统技艺', '曲艺'],
    accentBg: '#eef5f3',
    accentColor: '#3c6a50',
    icon: Ship,
  },
  {
    key: 'qi_great_wall',
    title: '齐长城文化带沿线非遗保护网',
    cities: '济南、泰安、淄博、潍坊、临沂、日照、青岛 7 市',
    itemCount: 82,
    desc: '横跨齐鲁大地东西山脊，涵盖孟姜女传说、博山琉璃、莱芜锡雕、齐鲁冶铁铸造及鲁班锁技艺。',
    tags: ['长城史诗', '琉璃陶瓷', '冶铁金属', '民俗'],
    accentBg: '#fbeeed',
    accentColor: '#8f2317',
    icon: Promotion,
  },
  {
    key: 'national_masters',
    title: '齐鲁传统手工艺与大师工坊高精点位',
    cities: '全省 16 市手造大师工坊与保护传承基地',
    itemCount: 76,
    desc: '遴选齐鲁传统美术、传统技艺国家级核心项目，涵盖雕刻、黑陶、鲁绣、木版年画等高精空间点位。',
    tags: ['手造大省', '鲁绣黑陶', '国家级非遗', '匠人传承'],
    accentBg: '#f8f4ec',
    accentColor: '#7a5a2a',
    icon: GoldMedal,
  },
];

function isLayerLoaded(layerName: string) {
  return dataStore.userDatasets.some((d) => d.name.includes(layerName));
}

function loadThematic(key: string, title: string) {
  const result = dataStore.loadPreloadedThematic(key);
  // 设置待缩放目标，跳转到地图后自动缩放到图层范围
  dataStore.setPendingZoomToDataset(result.id);
  ElMessage.success(`已成功载入【${title}】空间图层，前往地图自动定位`);
}

// 多源高精度底图选项
const basemapOptions = [
  { key: 'amap-vec', provider: 'amap' as BaseMapProvider, type: 'vec' as BaseMapType, name: '高德地图 · 高清矢量路网', tag: '推荐 · 城市街巷精准' },
  { key: 'amap-img', provider: 'amap' as BaseMapProvider, type: 'img' as BaseMapType, name: '高德地图 · 亚米级遥感卫星', tag: '高清 · 村落古貌俯瞰' },
  { key: 'tianditu-vec', provider: 'tianditu' as BaseMapProvider, type: 'vec' as BaseMapType, name: '天地图 · 山东省政区权威底图', tag: '国家公共平台' },
  { key: 'osm-vec', provider: 'osm' as BaseMapProvider, type: 'vec' as BaseMapType, name: 'OpenStreetMap · 全球开源矢量底图', tag: '国际通用开源' },
];

function isCurrentBasemap(p: BaseMapProvider, t: BaseMapType) {
  return mapStore.provider === p && mapStore.baseMap === t;
}

function selectBasemap(p: BaseMapProvider, t: BaseMapType) {
  mapStore.setProvider(p);
  mapStore.setBaseMap(t);
  ElMessage.success('已切换底图提供商，可在地图主页中即时生效');
}

const currentBasemapLabel = computed(() => {
  const cur = basemapOptions.find((b) => b.provider === mapStore.provider && b.type === mapStore.baseMap);
  return cur ? cur.name : '标准矢量底图';
});

function applyBasemapAndGo() {
  router.push('/');
}

// 田野调查数据导入与格式体检状态
const activeTab = ref('excel');
const geojsonData = ref<object | null>(null);
const geojsonName = ref('');
const shpFiles = ref<File[]>([]);
const excelFile = ref<File | null>(null);
const excelColumns = ref<string[]>([]);
const lngColumn = ref('');
const latColumn = ref('');
const nameColumn = ref('');
const convertedGeo = ref<object | null>(null);
const report = ref<HealthReport | null>(null);
const converting = ref(false);

function onGeojsonChange(file: any) {
  const raw = file.raw as File;
  if (!raw) return;
  geojsonName.value = raw.name;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      geojsonData.value = JSON.parse(reader.result as string);
      convertedGeo.value = null;
      report.value = null;
      ElMessage.success('GeoJSON 解析成功');
    } catch {
      geojsonData.value = null;
      ElMessage.error('JSON 解析失败');
    }
  };
  reader.readAsText(raw);
}

function onShpChange(file: any) {
  const raw = file.raw as File;
  if (raw && !shpFiles.value.some((f) => f.name === raw.name)) shpFiles.value.push(raw);
}

function onShpRemove() {
  shpFiles.value = [];
  convertedGeo.value = null;
  report.value = null;
}

function onExcelChange(file: any) {
  const raw = file.raw as File;
  if (!raw) return;
  excelFile.value = raw;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const wb = XLSX.read(reader.result as ArrayBuffer);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null }) as unknown[][];
      excelColumns.value = (rows[0] || []).map((c) => String(c ?? ''));
      lngColumn.value = excelColumns.value.find((c) => /lng|经度|lon/i.test(c)) || '';
      latColumn.value = excelColumns.value.find((c) => /lat|纬度/i.test(c)) || '';
      nameColumn.value = excelColumns.value.find((c) => /name|名称|项目/i.test(c)) || '';
      convertedGeo.value = null;
      report.value = null;
      ElMessage.success(`已读取 Excel 表格，识别出 ${excelColumns.value.length} 列`);
    } catch (e: any) {
      ElMessage.error('Excel 读取失败: ' + e.message);
    }
  };
  reader.readAsArrayBuffer(raw);
}

async function convertAndCheck() {
  converting.value = true;
  try {
    let geo: object | null = null;
    if (activeTab.value === 'geojson') {
      geo = geojsonData.value;
      if (!geo) throw new Error('请先选择 GeoJSON 文件');
    } else if (activeTab.value === 'shp') {
      if (!shpFiles.value.length) throw new Error('请先选择 shp 文件');
      geo = await convertShp(shpFiles.value);
    } else {
      if (!excelFile.value) throw new Error('请先选择 Excel 文件');
      if (!lngColumn.value || !latColumn.value) throw new Error('请选择经纬度列');
      geo = await convertExcel(excelFile.value, lngColumn.value, latColumn.value, nameColumn.value);
    }
    convertedGeo.value = geo;
    report.value = await checkHealth(geo);
    ElMessage.success('格式转换与空间体检完成');
  } catch (e: any) {
    ElMessage.error(e.message || '转换体检失败');
  } finally {
    converting.value = false;
  }
}

function loadToMap() {
  if (!convertedGeo.value) return;
  const name =
    geojsonName.value ||
    excelFile.value?.name ||
    shpFiles.value.find((f) => /\.shp$/i.test(f.name))?.name ||
    '田野调查数据集';
  const dsId = dataStore.addUserDataset(name, convertedGeo.value, report.value as unknown as Record<string, unknown>);
  // 设置待缩放目标，跳转到地图后自动缩放到图层范围
  dataStore.setPendingZoomToDataset(dsId);
  ElMessage.success('已挂载至地图图层并自动定位');
  router.push('/');
}

function onExportReport() {
  if (!convertedGeo.value) return ElMessage.warning('请先完成转换并体检');
  exportHealthReport(convertedGeo.value);
  ElMessage.success('正在导出体检报告');
}
</script>

<style scoped>
.data-manage-page {
  padding: 24px 32px 60px;
  max-width: 1280px;
  margin: 0 auto;
  font-family: var(--zi-font-sans);
  color: var(--zi-ink, #2b2218);
}

/* 顶部 Banner */
.page-header {
  margin-bottom: 28px;
  border-bottom: 1px solid rgba(180, 134, 31, 0.2);
  padding-bottom: 16px;
}
.header-badge {
  display: inline-block;
  font-size: 12px;
  font-weight: 700;
  color: var(--zi-red, #8f2317);
  letter-spacing: 1px;
  margin-bottom: 6px;
}
.page-title {
  font-family: var(--zi-font-serif, "STSong", "Songti SC", "SimSun", serif);
  font-size: 26px;
  font-weight: 700;
  color: #26190e;
  margin: 0 0 8px 0;
  letter-spacing: 0.5px;
}
.page-desc {
  font-size: 14px;
  color: #6d5b45;
  line-height: 1.6;
  margin: 0;
}

/* 区块通用结构 */
.section-block {
  background: var(--zi-paper, #fffdf8);
  border: 1px solid #e8dfcc;
  border-radius: 4px;
  padding: 22px 24px;
  margin-bottom: 24px;
  box-shadow: 0 1px 4px rgba(74, 58, 31, 0.04);
}
.section-title-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 8px;
}
.title-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.symbol {
  color: var(--zi-red, #8f2317);
  font-size: 16px;
}
.title-text {
  font-family: var(--zi-font-serif, "STSong", "Songti SC", "SimSun", serif);
  font-size: 17px;
  font-weight: 700;
  color: #3a2e1d;
  letter-spacing: 0.5px;
}
.section-hint {
  font-size: 12px;
  color: #8c785d;
}

/* 专题图层卡片网格 */
.thematic-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}
.thematic-card {
  background: #ffffff;
  border: 1px solid #e6ded1;
  border-radius: 4px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  transition: all 200ms ease-out;
}
.thematic-card:hover {
  border-color: #c9a552;
  box-shadow: 0 2px 8px rgba(180, 134, 31, 0.1);
}
.thematic-card.is-loaded {
  border-color: #3c6a50;
  background: #fbfdfc;
}
.thematic-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 10px;
}
.thematic-icon-wrap {
  width: 38px;
  height: 38px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.thematic-info {
  flex: 1;
  min-width: 0;
}
.thematic-title {
  font-size: 15px;
  font-weight: 700;
  margin: 0 0 4px 0;
  color: #2b2218;
}
.thematic-scope {
  font-size: 11px;
  color: #8a765d;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.thematic-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 2px;
  border: 1px solid;
  flex-shrink: 0;
}
.thematic-desc {
  font-size: 13px;
  color: #61513e;
  line-height: 1.5;
  margin: 0 0 12px 0;
  flex: 1;
}
.thematic-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 14px;
}
.thematic-tag {
  font-size: 11px;
  background: #f4ede0;
  color: #70583b;
  padding: 2px 6px;
  border-radius: 2px;
}
.thematic-footer {
  margin-top: auto;
}
.btn-thematic {
  width: 100%;
}

/* 开放数据导出卡片 */
.export-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}
.export-card {
  background: #ffffff;
  border: 1px solid #e7ded0;
  border-radius: 4px;
  padding: 18px;
  display: flex;
  flex-direction: column;
}
.export-top {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
.format-badge {
  font-size: 11px;
  font-weight: 800;
  padding: 2px 7px;
  border-radius: 4px;
  text-transform: uppercase;
}
.format-badge.json { background: #e8f4fc; color: #1d72b8; }
.format-badge.excel { background: #eaf6ee; color: #1d7c3b; }
.format-badge.csv { background: #fdf3e6; color: #b86208; }
.format-badge.tpl { background: #f2eef8; color: #6b3eb8; }
.export-card h4 {
  font-size: 14px;
  margin: 0;
  color: #332617;
}
.export-desc {
  font-size: 12px;
  color: #6e5c46;
  line-height: 1.5;
  margin: 0 0 12px 0;
  flex: 1;
}
.export-stat {
  font-size: 11px;
  color: #8c7659;
  margin-bottom: 12px;
}
.export-btn {
  width: 100%;
}

/* 双栏工作台网格 */
.dual-column-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}
@media (max-width: 900px) {
  .dual-column-grid {
    grid-template-columns: 1fr;
  }
}
.column-desc {
  font-size: 13px;
  color: #6d5b45;
  line-height: 1.5;
  margin: 0 0 16px 0;
}

/* 底图接入测试列表 */
.basemap-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
}
.basemap-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  background: #ffffff;
  border: 1px solid #e5ddcf;
  border-radius: 4px;
  cursor: pointer;
  transition: all 160ms ease-out;
}
.basemap-item:hover {
  border-color: #b4861f;
  background: #fffdf9;
}
.basemap-item.is-selected {
  border-color: #8f2317;
  background: #fdfaf5;
  box-shadow: 0 0 0 1px #8f2317;
}
.basemap-item-left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.basemap-radio-circle {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid #b8a68d;
  position: relative;
}
.basemap-item.is-selected .basemap-radio-circle {
  border-color: #8f2317;
}
.basemap-item.is-selected .basemap-radio-circle::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #8f2317;
}
.basemap-item-title {
  font-size: 13px;
  font-weight: 600;
  color: #332617;
}
.basemap-item-tag {
  font-size: 11px;
  color: #887256;
  background: #f4ecdf;
  padding: 2px 6px;
  border-radius: 2px;
}
.basemap-meta-panel {
  background: #f9f5ec;
  border: 1px solid #e7ded0;
  border-radius: 4px;
  padding: 12px 14px;
  margin-bottom: 16px;
  font-size: 12px;
}
.meta-row {
  display: flex;
  margin-bottom: 6px;
}
.meta-row:last-child {
  margin-bottom: 0;
}
.meta-label {
  color: #7d6b52;
  width: 76px;
  flex-shrink: 0;
}
.meta-val {
  color: #3a2e1d;
  font-family: monospace;
}
.meta-val.highlight {
  color: #8f2317;
  font-weight: 700;
  font-family: inherit;
}
.basemap-actions .el-button {
  width: 100%;
}

/* 田野调查上传与体检 */
.custom-uploader :deep(.el-upload-dragger) {
  padding: 16px 10px;
  border-color: #d9cdb8;
  background: #fffefb;
  border-radius: 4px;
}
.uploader-icon {
  font-size: 28px;
  color: #a38d72;
  margin-bottom: 6px;
}
.upload-tip {
  font-size: 12px;
  color: #715f48;
}
.column-map {
  margin-top: 10px;
  background: #f8f4ec;
  padding: 10px 12px;
  border-radius: 4px;
}
.col-title {
  font-size: 12px;
  font-weight: 700;
  color: #4a3c2a;
  margin-bottom: 8px;
}
.file-status {
  font-size: 12px;
  color: #3c6a50;
  font-weight: 600;
  margin-top: 8px;
}
.survey-actions {
  display: flex;
  gap: 8px;
  margin: 16px 0 12px;
  flex-wrap: wrap;
}
.health-report-box {
  background: #f9f6ef;
  border: 1px solid #e5dccb;
  border-radius: 4px;
  padding: 12px 14px;
  margin-top: 12px;
}
.report-box-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.rb-title {
  font-size: 13px;
  font-weight: 700;
  color: #332617;
}
.report-metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.metric-card {
  background: #ffffff;
  border: 1px solid #eae3d5;
  border-radius: 3px;
  padding: 8px;
  text-align: center;
}
.m-val {
  font-size: 16px;
  font-weight: 700;
  color: #332617;
}
.m-lbl {
  font-size: 11px;
  color: #8c785d;
  margin-top: 2px;
}
.m-danger .m-val { color: #d03020; }
.m-warn .m-val { color: #d4821a; }

/* 挂载图层列表 */
.empty-layers {
  padding: 12px;
}
.layers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 12px;
}
.layer-item-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #ffffff;
  border: 1px solid #e7dfd2;
  border-radius: 4px;
}
.layer-item-name {
  font-size: 13px;
  font-weight: 700;
  color: #332617;
  margin-bottom: 4px;
}
.layer-item-meta {
  font-size: 11px;
  color: #8c785d;
}
.layer-item-actions {
  display: flex;
  gap: 4px;
}
</style>
