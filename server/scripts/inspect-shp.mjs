// 数据检查脚本 v2：GBK 解码字段 + shapefile 几何
// 用法: node server/scripts/inspect-shp.mjs <shp路径>
import { openShp } from 'shapefile';
import { existsSync } from 'node:fs';
import { readDbf } from './dbf-reader.mjs';

const shpPath = process.argv[2];
if (!shpPath || !existsSync(shpPath)) {
  console.error('用法: node inspect-shp.mjs <xxx.shp>');
  process.exit(1);
}

const dbfPath = shpPath.replace(/\.shp$/i, '.dbf');
const { fields, records } = readDbf(dbfPath);
console.log('=== 文件:', shpPath, '===');
console.log('=== 字段结构 ===');
fields.forEach((f) => console.log(`  ${f.name.padEnd(16)} type=${f.type} len=${f.len}`));
console.log('=== dbf 记录数:', records.length, '===');

// 读几何
const source = await openShp(shpPath);
const geoms = [];
try {
  while (true) {
    const { value, done } = await source.read();
    if (done) break;
    geoms.push(value);
  }
} catch (e) {
  console.error('shp 读取失败:', e.message);
}
console.log('=== shp 几何数:', geoms.length, '===');
console.log('=== 前 5 条（值截断 50 字符）===');
for (let i = 0; i < Math.min(5, records.length); i++) {
  const r = records[i];
  const line = Object.entries(r).map(([k, v]) => {
    const s = v == null ? '∅' : String(v);
    return `${k}=${s.slice(0, 50)}`;
  }).join(' | ');
  console.log(`  [${i}] ${line}`);
  const g = geoms[i];
  if (g) console.log(`      geom: ${g.type} ${JSON.stringify(g.coordinates).slice(0, 60)}`);
}
