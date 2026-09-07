// 数据层：山东省 16 地市边界（含内部分界线，供市界分块 + 悬停高亮图层使用）
import cityGeo from '../shandong-city-boundary.json';

let cached: object | null = null;

/** 返回 16 地市边界 FeatureCollection（每个市一个 feature，properties 含 name/fullname/code/center） */
export function loadShandongCityBoundary(): object {
  if (cached) return cached;
  cached = cityGeo as unknown as object;
  return cached;
}