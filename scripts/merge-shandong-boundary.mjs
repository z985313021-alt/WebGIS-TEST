// 一次性脚本：把 server/data/shandong-boundary.json 的 17 个地市多边形
// 用 turf.union 合并为单一山东省界，输出到 src/data/shandong-province-boundary.json
// 用法：node scripts/merge-shandong-boundary.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { union } from '@turf/turf';

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = join(__dirname, '..', 'server', 'data', 'shandong-boundary.json');
const out = join(__dirname, '..', 'src', 'data', 'shandong-province-boundary.json');

const fc = JSON.parse(readFileSync(src, 'utf8'));
console.log(`输入要素数: ${fc.features.length}`);

const t0 = Date.now();
const merged = union(fc);
const ms = Date.now() - t0;
console.log(`合并耗时: ${ms}ms，类型: ${merged.geometry?.type}`);

const result = { type: 'FeatureCollection', features: [merged] };
writeFileSync(out, JSON.stringify(result));
console.log(`已写入: ${out}`);
