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
export const CATEGORY_COLORS: Record<string, string> = {
  '民间文学': '#8e44ad',
  '传统音乐': '#2980b9',
  '传统舞蹈': '#e67e22',
  '传统戏剧': '#c0392b',
  '曲艺': '#16a085',
  '传统体育、游艺与杂技': '#27ae60',
  '传统美术': '#f39c12',
  '传统技艺': '#d35400',
  '传统医药': '#2c3e50',
  '民俗': '#1abc9c',
};

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
