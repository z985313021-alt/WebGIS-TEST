// 逻辑层：地图引擎抽象接口
// 显示层只依赖此接口，不耦合 OpenLayers / Cesium 细节。
import type { BaseMapType } from '@/data/sources/tianditu';

export type FeatureStyleFn = (props: Record<string, unknown>) => unknown;

export interface MapAdapter {
  /** 挂载地图。useTianditu=true 时用天地图 WMTS（EPSG:4326），否则 OSM 占位 */
  mount(target: HTMLElement, useTianditu?: boolean): void;
  setBaseMap(type: BaseMapType): void;
  /** 加载 GeoJSON 图层（点/线/面均可），styleFn 按属性定制样式 */
  addGeoJsonLayer(geojson: object, id: string, styleFn?: FeatureStyleFn): void;
  /** 筛选图层：不满足 predicate 的要素显示为隐藏样式 */
  setLayerFilter(id: string, predicate: (props: Record<string, unknown>) => boolean): void;
  /** 高亮某个要素（_id 匹配），null 清除 */
  setHighlightId(id: string | number | null): void;
  /** 要素点击回调（props=null 表示点到空白） */
  onFeatureClick(cb: (props: Record<string, unknown> | null) => void): void;
  getLayerFeatureCount(id: string): number;
  /** 加载通用矢量图层（兼容旧接口） */
  addVectorLayer(geojson: object, id: string): void;
  removeLayer(id: string): void;
  /** 经纬度定位（EPSG:4326，自动适配视图投影） */
  zoomTo(lonlat: [number, number], zoom?: number): void;
  destroy(): void;
}

export type { BaseMapType };
