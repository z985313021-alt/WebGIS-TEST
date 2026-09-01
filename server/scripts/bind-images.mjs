// 图片绑定：为 heritage.geojson 的每个要素匹配分类图片
// 策略（继承旧系统 getPossibleImagePaths + 优化）：
//   1. 分类 → 文件夹映射
//   2. 尝试: 全名/基名(去括号) × 后缀(1-5) × 扩展名(jpg/png/jpeg/webp)
//   3. 括号变体：文件名 "基名（变体）.jpg" 且基名匹配
// 输出: properties 写入 photo(首个命中) 和 photos(全部)
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';

const GEOJSON = 'server/data/heritage.geojson';
const IMG_ROOT = 'public/images';

// 类别 → 图片文件夹（与旧项目目录一致）
const CATEGORY_FOLDER = {
  '民间文学': '民间文学非遗',
  '传统音乐': '传统音乐非遗',
  '传统舞蹈': '传统舞蹈非遗',
  '传统戏剧': '传统戏剧非遗',
  '曲艺': '曲艺非遗',
  '传统体育、游艺与杂技': '体育游艺杂技',
  '传统美术': '美术非遗',
  '传统技艺': '技艺非遗',
  '传统医药': '医药非遗',
  '民俗': '民俗非遗',
};

const EXTS = ['.jpg', '.png', '.jpeg', '.webp'];

// '秧歌（鼓子秧歌）' → '秧歌'
function stripParen(s) {
  return s.replace(/（.*?）|\(.*?\)/g, '').trim();
}

function findPhotos(folder, name) {
  const dir = `${IMG_ROOT}/${folder}`;
  if (!existsSync(dir)) return [];
  const files = readdirSync(dir);
  const lowerMap = new Map(files.map((f) => [f.toLowerCase(), f]));
  const base = stripParen(name);
  // 括号内容也是候选名：'秧歌（海阳大秧歌）' → '海阳大秧歌'
  const parenMatch = name.match(/（([^）]+)）/);
  const parenName = parenMatch ? parenMatch[1].trim() : '';
  const hits = [];

  const tryAdd = (n, num) => {
    EXTS.forEach((e) => {
      const key = `${n}${num}${e}`.toLowerCase();
      if (lowerMap.has(key)) hits.push(`/images/${folder}/${lowerMap.get(key)}`);
    });
  };

  [name, base, parenName].forEach((n) => {
    if (!n) return;
    tryAdd(n, '');                        // 名称.jpg
    for (let i = 1; i <= 5; i++) tryAdd(n, i);   // 名称1.jpg ~ 名称5.jpg
  });

  // 括号变体：文件名为 "基名（变体）.jpg" 且基名匹配
  const baseLower = base.toLowerCase();
  for (const f of files) {
    const stem = f.replace(/\.(jpe?g|png|webp)$/i, '');
    if (stem.toLowerCase().startsWith(baseLower) && stem.includes('（')) {
      hits.push(`/images/${folder}/${f}`);
    }
  }
  return [...new Set(hits)];
}

// 主流程
const data = JSON.parse(readFileSync(GEOJSON, 'utf8'));
let withPhoto = 0;
const withoutPhoto = [];
const folderHits = {};
for (const f of data.features) {
  const p = f.properties;
  const folder = CATEGORY_FOLDER[p.category];
  const photos = folder ? findPhotos(folder, p.name) : [];
  if (photos.length > 0) {
    p.photo = photos[0];
    p.photos = photos;
    withPhoto++;
    folderHits[folder] = (folderHits[folder] || 0) + 1;
  } else {
    withoutPhoto.push({ name: p.name, category: p.category });
  }
}
writeFileSync(GEOJSON, JSON.stringify(data), 'utf8');

console.log('=== 图片绑定结果 ===');
console.log(`有图: ${withPhoto} / ${data.features.length}  无图: ${withoutPhoto.length}`);
console.log('按文件夹命中数:', JSON.stringify(folderHits));
console.log('\n无图要素（前 15）:');
withoutPhoto.slice(0, 15).forEach((x) => console.log(`  [${x.category}] ${x.name}`));
console.log('\n样例:');
data.features.filter((f) => f.properties.photo).slice(0, 6).forEach((f) => {
  console.log(`  ${f.properties.name} -> ${f.properties.photo}`);
});
