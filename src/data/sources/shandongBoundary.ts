// 数据层：山东省边界（合并后的单一省界，去除了内部地市界线）
// 由 scripts/merge-shandong-boundary.mjs 从各市界预合并生成
import boundaryGeo from '../shandong-province-boundary.json';

let cached: object | null = null;

/** 返回仅含省界的 FeatureCollection（供省界高亮图层使用） */
export function loadShandongBoundary(): object {
  if (cached) return cached;
  cached = boundaryGeo as unknown as object;
  return cached;
}
