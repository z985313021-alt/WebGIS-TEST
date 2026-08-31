// 数据检查脚本：读取 shp+dbf，打印字段结构与前 5 条记录
// 用法: node server/scripts/inspect-shp.mjs <shp路径>
import { open } from 'shapefile';
import { readFileSync, existsSync } from 'node:fs';

const shpPath = process.argv[2];
if (!shpPath || !existsSync(shpPath)) {
  console.error('用法: node inspect-shp.mjs <xxx.shp>');
  process.exit(1);
}

const source = await open(shpPath);
console.log('=== 文件:', shpPath, '===');
console.log('=== 字段结构 ===');
let fields = [];
try {
  const dbf = readFileSync(shpPath.replace(/\.shp$/i, '.dbf'));
  const nFields = dbf.readUInt16LE(8);
  let off = 32;
  for (let i = 0; i < nFields; i++) {
    const name = dbf.toString('latin1', off, off + 11).replace(/\0/g, '');
    const type = String.fromCharCode(dbf.readUInt8(off + 11));
    const len = dbf.readUInt8(off + 16);
    fields.push({ name, type, len });
    off += 32;
  }
} catch (e) {
  console.error('dbf 解析失败:', e.message);
}

let count = 0;
const samples = [];
try {
  for await (const rec of source) {
    if (count < 5) samples.push(rec);
    count++;
  }
} catch (e) {
  console.error('读取失败:', e.message);
}
fields.forEach((f) => console.log(`  ${f.name.padEnd(12)} type=${f.type} len=${f.len}`));
console.log('=== 要素总数:', count, '===');
console.log('=== 前 5 条（value 截断 60 字符）===');
for (const s of samples) {
  const line = Object.entries(s.properties).map(([k, v]) => {
    const str = v == null ? '∅' : String(v);
    return `${k}=${str.slice(0, 60)}`;
  }).join(' | ');
  const geom = s.geometry ? `${s.geometry.type}(${JSON.stringify(s.geometry.coordinates).slice(0, 80)})` : '无几何';
  console.log('  geom:', geom);
  console.log('  props:', line);
  console.log('  ---');
}
