<template>
  <div class="data-manage">
    <h2>数据管理</h2>
    <p class="desc">上传 shp / geojson / excel 数据，体检后加载到地图叠加显示。</p>

    <el-tabs v-model="activeTab" class="upload-tabs">
      <!-- GeoJSON -->
      <el-tab-pane label="GeoJSON" name="geojson">
        <el-upload
          drag
          accept=".json,.geojson"
          :auto-upload="false"
          :limit="1"
          :on-change="onGeojsonChange"
          :on-remove="() => (geojsonData = null)"
        >
          <div class="upload-tip">点击或拖拽 <b>.geojson / .json</b> 文件到此处</div>
        </el-upload>
        <div v-if="geojsonData" class="file-preview">✅ {{ geojsonName }}（{{ (geojsonData as any)?.features?.length ?? 0 }} 要素）</div>
      </el-tab-pane>

      <!-- Shapefile -->
      <el-tab-pane label="Shapefile" name="shp">
        <el-upload
          drag
          multiple
          :auto-upload="false"
          :limit="8"
          accept=".shp,.dbf,.prj,.shx"
          :on-change="onShpChange"
          :on-remove="onShpRemove"
        >
          <div class="upload-tip">上传 <b>.shp + .dbf</b>（必选）及 .prj/.shx 等配套文件</div>
        </el-upload>
        <div v-if="shpFiles.length" class="file-preview">✅ {{ shpFiles.map((f) => f.name).join('、') }}</div>
      </el-tab-pane>

      <!-- Excel -->
      <el-tab-pane label="Excel" name="excel">
        <el-upload
          drag
          accept=".xlsx,.xls"
          :auto-upload="false"
          :limit="1"
          :on-change="onExcelChange"
          :on-remove="() => (excelFile = null)"
        >
          <div class="upload-tip">上传 <b>.xlsx / .xls</b>，第一行为列名，含经纬度列</div>
        </el-upload>
        <div v-if="excelColumns.length" class="column-map">
          <el-form label-width="90px" size="small">
            <el-form-item label="经度列">
              <el-select v-model="lngColumn" placeholder="选择经度列">
                <el-option v-for="c in excelColumns" :key="c" :label="c" :value="c" />
              </el-select>
            </el-form-item>
            <el-form-item label="纬度列">
              <el-select v-model="latColumn" placeholder="选择纬度列">
                <el-option v-for="c in excelColumns" :key="c" :label="c" :value="c" />
              </el-select>
            </el-form-item>
            <el-form-item label="名称列(可选)">
              <el-select v-model="nameColumn" placeholder="选择名称列" clearable>
                <el-option v-for="c in excelColumns" :key="c" :label="c" :value="c" />
              </el-select>
            </el-form-item>
          </el-form>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 转换 + 体检 -->
    <div class="actions">
      <el-button type="primary" :loading="converting" @click="convertAndCheck">转换并体检</el-button>
      <el-button v-if="convertedGeo" type="success" @click="loadToMap">加载到地图并前往</el-button>
      <el-button v-if="report" @click="onExportReport">导出体检报告 Excel</el-button>
    </div>

    <!-- 模板下载 -->
    <el-card class="template-card" shadow="never">
      <template #header>📥 模板下载</template>
      <el-space>
        <el-button size="small" @click="downloadTemplate('excel')">Excel 模板</el-button>
        <el-button size="small" @click="downloadTemplate('geojson')">GeoJSON 示例</el-button>
        <el-button size="small" @click="downloadTemplate('shp')">SHP 示例</el-button>
      </el-space>
    </el-card>

    <!-- WMS 接入 -->
    <el-card class="wms-card" shadow="never">
      <template #header>🌐 WMS 接入探测</template>
      <el-input v-model="wmsUrl" placeholder="请输入 WMS 服务地址，例如 https://demo.geo-solutions.it/geoserver/wms" clearable>
        <template #append>
          <el-button :loading="wmsProbing" @click="onProbeWms">探测图层</el-button>
        </template>
      </el-input>
      <div v-if="wmsResult" class="wms-result">
        <p>发现图层数：{{ wmsResult.layerCount }}</p>
        <el-table :data="wmsResult.layers" size="small" max-height="200">
          <el-table-column prop="name" label="Name" />
          <el-table-column prop="title" label="Title" />
        </el-table>
      </div>
    </el-card>

    <!-- 体检报告 -->
    <el-card v-if="report" class="report-card" shadow="never">
      <template #header>
        <div class="report-header">
          <span>📋 数据体检报告</span>
          <el-tag :type="report.total > 0 && report.outOfBounds === 0 ? 'success' : 'warning'" size="small">
            {{ report.total > 0 && report.outOfBounds === 0 ? '健康' : '注意' }}
          </el-tag>
        </div>
      </template>
      <el-descriptions :column="3" size="small" border>
        <el-descriptions-item label="要素总数">{{ report.total }}</el-descriptions-item>
        <el-descriptions-item label="类型分布">{{ formatByType(report.byType) }}</el-descriptions-item>
        <el-descriptions-item label="越界(山东范围)">{{ report.outOfBounds }}</el-descriptions-item>
        <el-descriptions-item label="缺坐标">{{ report.missingCoord }}</el-descriptions-item>
        <el-descriptions-item label="空值数量">{{ report.nullValueCount }}</el-descriptions-item>
        <el-descriptions-item label="无名要素">{{ report.emptyNameCount }}</el-descriptions-item>
        <el-descriptions-item label="重名数量">{{ report.duplicateNames }}</el-descriptions-item>
        <el-descriptions-item label="字段列表" :span="2">{{ report.fields.join('、') || '—' }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 已加载数据集 -->
    <el-card class="datasets-card" shadow="never">
      <template #header>🗂️ 已加载到地图的数据集（{{ dataStore.userDatasets.length }}）</template>
      <el-empty v-if="!dataStore.userDatasets.length" description="还没有加载数据集" :image-size="60" />
      <div v-for="d in dataStore.userDatasets" :key="d.id" class="dataset-item">
        <div class="dataset-info">
          <div class="dataset-name">{{ d.name }}</div>
          <div class="dataset-meta">{{ d.addedAt }} · {{ (d.health as any)?.total ?? 0 }} 要素</div>
        </div>
        <el-button size="small" text type="danger" @click="dataStore.removeUserDataset(d.id)">移除</el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { useRouter } from 'vue-router';
import { useDataStore } from '@/services/stores/dataStore';
import { convertShp, convertExcel, checkHealth, downloadTemplate, exportHealthReport, probeWms, type HealthReport } from '@/data/api/convert';
import * as XLSX from 'xlsx';

const router = useRouter();
const dataStore = useDataStore();

const activeTab = ref('geojson');
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
const wmsUrl = ref('');
const wmsProbing = ref(false);
const wmsResult = ref<{ layerCount: number; layers: { name: string; title: string }[] } | null>(null);

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
  // 客户端读列名（用 xlsx 包）
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
      ElMessage.success(`已读取 ${excelColumns.value.length} 列`);
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
    ElMessage.success('转换 + 体检完成');
  } catch (e: any) {
    ElMessage.error(e.message || '转换失败');
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
    '数据集';
  dataStore.addUserDataset(name, convertedGeo.value, report.value as unknown as Record<string, unknown>);
  ElMessage.success('已加载到地图');
  router.push('/');
}

function formatByType(byType: Record<string, number>) {
  return Object.entries(byType || {}).map(([k, v]) => `${k}:${v}`).join(' ');
}

function onExportReport() {
  if (!convertedGeo.value) return ElMessage.warning('请先完成转换并体检');
  exportHealthReport(convertedGeo.value);
  ElMessage.success('正在导出体检报告');
}

async function onProbeWms() {
  if (!wmsUrl.value.trim()) return ElMessage.warning('请输入 WMS 地址');
  wmsProbing.value = true;
  try {
    const res = await probeWms(wmsUrl.value.trim());
    wmsResult.value = res;
    ElMessage.success(`探测成功，发现 ${res.layerCount} 个图层`);
  } catch (e: any) {
    ElMessage.error(e?.message || 'WMS 探测失败');
    wmsResult.value = null;
  } finally {
    wmsProbing.value = false;
  }
}
</script>

<style scoped>
.data-manage { padding: 16px; max-width: 860px; }
.desc { color: #888; font-size: 13px; margin: 4px 0 16px; }
.upload-tip { color: #666; font-size: 13px; }
.file-preview { margin-top: 8px; font-size: 13px; color: #67c23a; }
.column-map { margin-top: 12px; }
.actions { margin: 16px 0; }
.template-card { margin-bottom: 16px; }
.wms-card { margin-bottom: 16px; }
.wms-result { margin-top: 12px; }
.report-card { margin-bottom: 16px; }
.report-header { display: flex; justify-content: space-between; align-items: center; }
.dataset-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 4px; border-bottom: 1px solid #f0f0f0; }
.dataset-name { font-size: 13px; color: #333; }
.dataset-meta { font-size: 12px; color: #999; }
</style>
