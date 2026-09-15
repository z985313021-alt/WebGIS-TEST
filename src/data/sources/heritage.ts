// 数据层：非遗数据源（类型、类别颜色、加载）
// 注意：Vite 不识别 .geojson 为 JSON，故打包用副本命名为 heritage.json
import heritageGeo from '../heritage.json';

export interface HeritageItem {
  id: number;
  name: string;
  category: string;
  batch: number | null;
  city: string;
  district: string;
  area: string;
  protectUnit: string;
  year: number | null;
  code: string;
  type: string;
  province: string;
  photo?: string;
  photos?: string[];
  lng: number;
  lat: number;
}

// 10 大类别颜色（文化质感色板）
/**
 * 非遗十门类色标：采用中国传统色（朱砂 / 藤黄 / 靛青 / 赭石 / 松绿 / 黛紫 …），
 * 替代通用 Material 色板，使图表、图例、地图印章与暖纸底图气质统一。
 * 十色色相分离，深色大屏底与浅色页面底均可辨识。
 */
export const CATEGORY_COLORS: Record<string, string> = {
  '民间文学': '#6B4C7A', // 黛紫
  '传统音乐': '#2C5F8A', // 靛青
  '传统舞蹈': '#C97B8B', // 桃夭
  '传统戏剧': '#B8352B', // 朱砂
  '曲艺': '#1F7A6B', // 青碧
  '传统体育、游艺与杂技': '#4E7A3A', // 松绿
  '传统美术': '#D9A020', // 藤黄
  '传统技艺': '#9C5B2E', // 赭石
  '传统医药': '#556B4F', // 艾绿
  '民俗': '#B5522F', // 石榴红
};

/**
 * 十门类印章单字：地图点位以「非遗印章」造型渲染（印面 + 一字门类 + 落点尖角），
 * 戏 / 乐 / 舞 / 曲 / 技 / 画 / 艺 / 医 / 俗 / 文，一句一门，替代通用水滴标记。
 */
export const CATEGORY_GLYPHS: Record<string, string> = {
  '民间文学': '文',
  '传统音乐': '乐',
  '传统舞蹈': '舞',
  '传统戏剧': '戏',
  '曲艺': '曲',
  '传统体育、游艺与杂技': '技',
  '传统美术': '画',
  '传统技艺': '艺',
  '传统医药': '医',
  '民俗': '俗',
};

/** 取门类印章单字（未知门类退回「遗」） */
export function categoryGlyph(category: string | undefined | null): string {
  return CATEGORY_GLYPHS[category ?? ''] ?? '遗';
}

// 类别固定顺序（按数据量降序）
export const CATEGORIES: string[] = [
  '传统戏剧', '传统美术', '民间文学', '传统技艺', '传统音乐',
  '传统体育、游艺与杂技', '民俗', '曲艺', '传统舞蹈', '传统医药',
];

export const BATCHES: number[] = [1, 2, 3, 4, 5];

export const BATCH_LABELS: Record<number, string> = {
  1: '第一批', 2: '第二批', 3: '第三批', 4: '第四批', 5: '第五批',
};

export function batchLabel(b: number | null): string {
  return b == null ? '未标注批次' : BATCH_LABELS[b] ?? `第${b}批`;
}

export function loadHeritage(): HeritageItem[] {
  const fc = heritageGeo as unknown as {
    features: Array<{
      geometry: { coordinates: [number, number] };
      properties: Omit<HeritageItem, 'lng' | 'lat'>;
    }>;
  };
  return fc.features.map((f) => ({
    ...f.properties,
    lng: f.geometry.coordinates[0],
    lat: f.geometry.coordinates[1],
  }));
}
