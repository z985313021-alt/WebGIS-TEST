// 逻辑层：地图引擎抽象接口
// 显示层只依赖此接口，不耦合 OpenLayers / Cesium 细节。
import type { BaseMapType, BaseMapProvider } from '@/data/sources/tianditu';

export type FeatureStyleFn = (props: Record<string, unknown>) => unknown;

export interface MapAdapter {
  /** 挂载地图。provider=tianditu 用天地图 WMTS（EPSG:3857 c 集），否则 OSM */
  mount(target: HTMLElement, provider?: BaseMapProvider): void;
  setBaseMap(type: BaseMapType): void;
  /** 切换底图提供商（天地图 / OSM），天地图模式自动叠加中文注记层 */
  setProvider(provider: BaseMapProvider): void;
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
  /** 加载省界高亮图层（加粗描边 + 半透明填充，置于底图之上、数据之下） */
  addBoundaryLayer(geojson: object, id: string): void;
  /** 加载 WMS 图层（ImageWMS 透明叠加） */
  addWMSLayer(url: string, id: string, params?: { layers?: string; version?: string; format?: string }): void;
  removeLayer(id: string): void;
  /** 经纬度定位（EPSG:4326，自动适配视图投影） */
  zoomTo(lonlat: [number, number], zoom?: number): void;
  /** 开始量算/绘制（distance=线 / area=面），绘制完成后回调几何（GeoJSON 4326）；绘制期间自动抑制要素点击 */
  startMeasure(mode: 'distance' | 'area', onDone: (geometry: object) => void): void;
  /** 停止当前量算绘制 */
  stopMeasure(): void;
  /** 是否正在量算绘制中 */
  isMeasuring(): boolean;
  destroy(): void;
}

export type { BaseMapType };
