// 数据转换/体检工具（T4）：供 server/index.js 使用
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openShp } from 'shapefile';
import { readDbf } from './dbf-reader.mjs';

export const UPLOAD_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'uploads');
mkdirSync(UPLOAD_DIR, { recursive: true });

/** shp 目录文件 → GeoJSON（字段 GBK 解码，原字段名保留） */
export async function convertShpToGeojson(files) {
  const shpFile = files.find((f) => /\.shp$/i.test(f.originalname));
  const dbfPath = files.find((f) => /\.dbf$/i.test(f.originalname))?.path;
  if (!shpFile) throw new Error('缺少 .shp 文件');
  if (!dbfPath || !existsSync(dbfPath)) throw new Error('缺少 .dbf 文件（属性表，必传）');

  // 几何
  const source = await openShp(shpFile.path);
  const geoms = [];
  while (true) {
    const { value, done } = await source.read();
    if (done) break;
    geoms.push(value);
  }
  // 属性（GBK）
  const { fields, records } = readDbf(dbfPath);

  const features = [];
  for (let i = 0; i < records.length; i++) {
    const g = geoms[i];
    if (!g) continue;
    const properties = records[i] ?? {};
    if (g.type === 'Point') {
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [Number(g.coordinates[0]), Number(g.coordinates[1])] },
        properties,
      });
    } else {
      // 线/面原样保留
      features.push({ type: 'Feature', geometry: g, properties });
    }
  }
  return {
    type: 'FeatureCollection',
    features,
    meta: { source: shpFile.originalname, fieldCount: fields.length, total: features.length },
  };
}

/** Excel → 点 GeoJSON（lng/lat 列由前端指定） */
export function convertExcelToGeojson(filePath, { lngColumn, latColumn, nameColumn }) {
  // 动态 import xlsx（Node ESM）
  return import('xlsx').then((XLSX) => {
    const wb = XLSX.readFile(filePath);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: null });
    if (rows.length === 0) throw new Error('Excel 为空');

    const features = [];
    let skipped = 0;
    for (const row of rows) {
      const lng = Number(row[lngColumn]);
      const lat = Number(row[latColumn]);
      if (isNaN(lng) || isNaN(lat)) { skipped++; continue; }
      const properties = {};
      for (const [k, v] of Object.entries(row)) {
        if (k === lngColumn || k === latColumn) continue;
        properties[k] = v == null ? '' : String(v);
      }
      if (nameColumn && properties[nameColumn]) properties.name = properties[nameColumn];
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [lng, lat] },
        properties,
      });
    }
    if (features.length === 0) throw new Error('没有可用的经纬度数据（检查列名是否选对）');
    return {
      type: 'FeatureCollection',
      features,
      meta: { source: filePath.split(/[\\/]/).pop(), total: features.length, skipped },
    };
  });
}

/** 数据体检：对任意 GeoJSON 输出质量报告（增强版：含问题要素明细） */
export function healthCheck(geojson, { bbox = [114.5, 34.2, 122.9, 38.6] } = {}) {
  const features = geojson?.features ?? [];
  const report = {
    total: features.length,
    byType: {},
    outOfBounds: 0,
    missingCoord: 0,
    nullValueCount: 0,
    emptyNameCount: 0,
    duplicateNames: 0,
    fields: new Set(),
    issues: [],
  };
  const names = new Map();
  const dupSet = new Set();
  for (let idx = 0; idx < features.length; idx++) {
    const f = features[idx];
    report.byType[f.geometry?.type] = (report.byType[f.geometry?.type] || 0) + 1;
    const c = f.geometry?.coordinates;
    const props = f.properties ?? {};
    const fName = String(props.name || props.名称 || '').trim();

    if (!c) {
      report.missingCoord++;
      if (fName) report.issues.push({ name: fName, type: '缺少坐标', desc: `要素 #${idx + 1} 无几何坐标` });
      continue;
    }
    if (!Array.isArray(c[0])) {
      if (c[0] < bbox[0] || c[0] > bbox[2] || c[1] < bbox[1] || c[1] > bbox[3]) {
        report.outOfBounds++;
        if (fName) report.issues.push({ name: fName, type: '越界', desc: `坐标(${c[0].toFixed(2)}, ${c[1].toFixed(2)})超出山东省界` });
      }
    }

    Object.keys(props).forEach((k) => report.fields.add(k));
    let hasNull = false;
    for (const v of Object.values(props)) {
      if (v === null || v === undefined || v === '') { hasNull = true; report.nullValueCount++; }
    }

    if (!fName) {
      report.emptyNameCount++;
      report.issues.push({ name: '(无名)', type: '缺少名称', desc: `要素 #${idx + 1} 缺少名称属性` });
    } else {
      names.set(fName, (names.get(fName) || 0) + 1);
      if (names.get(fName) === 2) {
        dupSet.add(fName);
      }
    }
  }
  report.duplicateNames = dupSet.size;
  for (const name of dupSet) {
    report.issues.push({ name, type: '重名', desc: `"${name}" 存在多个要素` });
  }
  report.fields = [...report.fields];
  if (report.issues.length > 100) report.issues = report.issues.slice(0, 100);
  return report;
}
