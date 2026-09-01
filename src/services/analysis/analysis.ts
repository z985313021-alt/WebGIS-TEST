// 逻辑层：空间分析服务（T7）
// 缓冲区 + 叠加统计，基于 turf.js（纯几何计算，不依赖地图渲染）
import * as turf from '@turf/turf';
import type { HeritageItem } from '@/data/sources/heritage';

/** 以某点为中心生成缓冲区多边形（GeoJSON Feature） */
export function createBuffer(lng: number, lat: number, radiusKm: number): object {
  const point = turf.point([lng, lat]);
  const buffered = turf.buffer(point, radiusKm, { units: 'kilometers' });
  if (!buffered) throw new Error('缓冲区生成失败');
  return buffered as unknown as object;
}

/** 统计点位在多边形（含缓冲区）内的要素 */
export function countPointsInPolygon(items: HeritageItem[], polygonGeojson: object): HeritageItem[] {
  const poly = polygonGeojson as any;
  return items.filter((i) => turf.booleanPointInPolygon(turf.point([i.lng, i.lat]), poly));
}

/** 统计点在圆内（半径 km，球面距离，避免投影误差） */
export function countPointsInRadius(items: HeritageItem[], lng: number, lat: number, radiusKm: number): HeritageItem[] {
  const c = turf.point([lng, lat]);
  return items.filter((i) => turf.distance(c, turf.point([i.lng, i.lat]), { units: 'kilometers' }) <= radiusKm);
}

/** 两点间球面距离（公里） */
export function distanceKm(lng1: number, lat1: number, lng2: number, lat2: number): number {
  return turf.distance(turf.point([lng1, lat1]), turf.point([lng2, lat2]), { units: 'kilometers' });
}

/** 由绘制几何计算测距结果（turf，返回格式化的数值+单位） */
export function measureDistance(geometry: object): { value: number; unit: string } {
  const line = geometry as any;
  const km = turf.length(line, { units: 'kilometers' });
  if (km >= 1) return { value: Math.round(km * 100) / 100, unit: `${Math.round(km * 100) / 100} 公里` };
  return { value: Math.round(km * 1000), unit: `${Math.round(km * 1000)} 米` };
}

/** 由绘制几何计算测面结果（turf.area，球面面积，可靠） */
export function measureArea(geometry: object): { value: number; unit: string } {
  const feature = { type: 'Feature', geometry, properties: {} } as any;
  const m2 = turf.area(feature);
  if (m2 >= 1e6) return { value: Math.round(m2 / 1e4) / 100, unit: `${Math.round(m2 / 1e4) / 100} 平方公里` };
  return { value: Math.round(m2), unit: `${Math.round(m2)} 平方米` };
}

// ---- T10 寻访路线 ----
export interface RouteResult {
  /** 折线 GeoJSON（连接受选点位，最近邻排序） */
  line: object;
  /** 排序后的停靠点 */
  stops: HeritageItem[];
  /** 路线走廊内的其他非遗（行程单沿途推荐） */
  along: HeritageItem[];
}

/** 生成寻访路线：选中点按最近邻贪心排序连线，并列出路线 corridorKm 内的沿途非遗 */
export function buildRoute(selected: HeritageItem[], all: HeritageItem[], corridorKm = 20): RouteResult {
  if (selected.length === 0) throw new Error('请先选择寻访点');
  const stops = [selected[0]];
  const rest = selected.slice(1);
  while (rest.length) {
    const last = stops[stops.length - 1];
    let bestIdx = 0;
    let bestD = Infinity;
    rest.forEach((r, i) => {
      const d = distanceKm(last.lng, last.lat, r.lng, r.lat);
      if (d < bestD) {
        bestD = d;
        bestIdx = i;
      }
    });
    stops.push(rest.splice(bestIdx, 1)[0]);
  }
  const lineFeat = turf.lineString(stops.map((s) => [s.lng, s.lat]));
  // turf v7 的 lineString 返回 Feature（{type:'Feature',geometry,...}），取 .geometry 才是纯 LineString
  const line = (lineFeat as any).geometry;
  const selectedIds = new Set(selected.map((s) => s.id));
  const along = all.filter((i) => {
    if (selectedIds.has(i.id)) return false;
    return turf.pointToLineDistance(turf.point([i.lng, i.lat]), lineFeat, { units: 'kilometers' }) <= corridorKm;
  });
  return { line: line as unknown as object, stops, along };
}
