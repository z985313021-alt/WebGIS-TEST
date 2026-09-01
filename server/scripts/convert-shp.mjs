// T1 数据标准化：shp(+dbf, GBK) → 标准 GeoJSON（山东非遗）
// 用法:
//   node server/scripts/convert-shp.mjs <输入.shp> <输出.geojson> [--filter-province=山东省] [--kind=heritage|inheritor]
// 特性：
//  - dbf 用 GBK 解码（旧项目教训：中文乱码）
//  - 省级过滤（全国名录 → 只留山东）
//  - 字段精确映射 + 空值兜底（防御性编程）
//  - 批次归一化（'第一批'→1，空→null）
import { openShp } from 'shapefile';
import { writeFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname } from 'node:path';
import { readDbf } from './dbf-reader.mjs';

const [,, shpPath, outPath] = process.argv;
const args = process.argv.slice(2);
const filterProvince = (args.find(a => a.startsWith('--filter-province=')) || '').split('=')[1] || null;
const filterArea = (args.find(a => a.startsWith('--filter-area=')) || '').split('=')[1] || null;

if (!shpPath || !outPath || !existsSync(shpPath)) {
  console.error('用法: node convert-shp.mjs <输入.shp> <输出.geojson> [--filter-province=山东省]');
  process.exit(1);
}

// 字段映射：标准名 → dbf 字段名（带备选）
const FIELD_MAP = {
  name:        ['名称', '项目名称'],
  category:    ['类别', '门类'],
  batch:       ['批次'],
  city:        ['市', '地市'],
  district:    ['区县', '区'],
  area:        ['申报地区或', '申报地区'],
  protectUnit: ['保护单位'],
  year:        ['公布时间'],
  code:        ['编号'],
  type:        ['类型'],
  province:    ['省'],
  inheritor:   ['传承人姓名', '姓名', '传承人'],
};

function norm(v) { const s = v == null ? '' : String(v).trim(); return s; }
function toHalfWidth(s) {
  // 全角数字/字母 → 半角（旧数据坑：'第一批'里的'１'是全角）
  return s.replace(/[\uff10-\uff19]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
          .replace(/[\uff21-\uff3a]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
          .replace(/[\uff41-\uff5a]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
}
function pick(rec, keys) { for (const k of keys) { if (rec[k] != null && norm(rec[k]) !== '') return rec[k]; } return null; }
const CN_NUM = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10 };
function parseBatch(v) {
  const s = norm(toHalfWidth(v));
  if (!s) return null;
  const m = s.match(/(\d+)/);
  if (m) return Number(m[1]);                    // '1' / '第2批'
  const c = s.match(/[一二三四五六七八九十]/);
  if (c && CN_NUM[c[0]] != null) return CN_NUM[c[0]];  // '第一批' → 1
  return null;
}

async function main() {
  const { fields, records } = readDbf(shpPath.replace(/\.shp$/i, '.dbf'));
  console.log('字段:', fields.map(f => f.name).join(', '));

  // 几何
  const source = await openShp(shpPath);
  const geoms = [];
  while (true) {
    const { value, done } = await source.read();
    if (done) break;
    geoms.push(value);
  }
  console.log(`dbf=${records.length} 条, shp=${geoms.length} 条`);

  let filtered = 0, skipped = 0, noName = 0, noGeom = 0, noBatch = 0, kept = 0;
  const features = [];

  for (let i = 0; i < records.length; i++) {
    const rec = records[i];
    const g = geoms[i];

    // 省级过滤（有"省"字段时）
    if (filterProvince) {
      const prov = norm(pick(rec, FIELD_MAP.province));
      if (prov !== filterProvince) { filtered++; continue; }
    }
    // 申报地区包含过滤（无省字段的表，如传承人）
    if (filterArea) {
      const area = norm(pick(rec, FIELD_MAP.area));
      if (!area.includes(filterArea)) { filtered++; continue; }
    }

    const nameRaw = norm(pick(rec, FIELD_MAP.name));
    const name = nameRaw.replace(/[\?？]+$/, '').trim();   // 清尾部解码残渣
    if (!name) { noName++; skipped++; continue; }

    let coords = null;
    if (g && g.type === 'Point') {
      coords = [Number(g.coordinates[0]), Number(g.coordinates[1])];
    } else if (rec.lng_wgs84 != null && rec.lat_wgs84 != null) {
      coords = [Number(rec.lng_wgs84), Number(rec.lat_wgs84)];
    }
    if (!coords || isNaN(coords[0]) || isNaN(coords[1])) { noGeom++; skipped++; continue; }

    const batch = parseBatch(pick(rec, FIELD_MAP.batch));
    if (batch === null) noBatch++;

    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: coords },
      properties: {
        id: kept + 1,
        name,
        category: norm(pick(rec, FIELD_MAP.category)) || '未分类',
        batch,
        city: norm(pick(rec, FIELD_MAP.city)) || '未知',
        district: norm(pick(rec, FIELD_MAP.district)),
        area: norm(pick(rec, FIELD_MAP.area)),
        protectUnit: norm(pick(rec, FIELD_MAP.protectUnit)),
        year: pick(rec, FIELD_MAP.year) == null ? null : Number(norm(pick(rec, FIELD_MAP.year))) || null,
        code: norm(pick(rec, FIELD_MAP.code)),
        type: norm(pick(rec, FIELD_MAP.type)),
        inheritor: norm(pick(rec, FIELD_MAP.inheritor)) || null,
        province: norm(pick(rec, FIELD_MAP.province)) || filterProvince || '',
      },
    });
    kept++;
  }

  const fc = {
    type: 'FeatureCollection',
    features,
    crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:EPSG::4326' } },
    meta: { source: shpPath, total: features.length, generatedAt: new Date().toISOString() },
  };

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(fc), 'utf8');

  const size = statSync(outPath).size;
  console.log(`输出: ${outPath}  (${(size / 1024).toFixed(0)} KB)`);
  console.log(`保留: ${kept} | 非目标省过滤: ${filtered} | 无名跳过: ${noName} | 无几何跳过: ${noGeom}`);
  console.log(`批次未标注(null): ${noBatch} (${kept ? (noBatch / kept * 100).toFixed(0) : 0}%)`);
}

main().catch((e) => { console.error('失败:', e); process.exit(1); });
