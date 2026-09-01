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
