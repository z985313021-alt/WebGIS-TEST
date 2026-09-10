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
  /** 获取当前缩放级别 */
  getZoom(): number;
  /** 获取当前地图中心（经纬度 EPSG:4326） */
  getCenter(): [number, number];
  /** 获取当前旋转角度（弧度，0=正北朝上） */
  getRotation(): number;
  /** 重置视图到初始范围（山东全景，旋转归零） */
  resetView(): void;
  /** 重置地图旋转到正北朝上 */
  resetRotation(): void;
  /** 监听鼠标移动，回调返回经纬度（EPSG:4326），离开地图时为 null */
  onPointerMove(cb: (lonlat: [number, number] | null) => void): void;
  /** 监听视图变化（缩放/平移/旋转），回调返回当前状态 */
  onViewChange(cb: (state: { zoom: number; center: [number, number]; rotation: number }) => void): void;
  /** 开始量算/绘制（distance=线 / area=面），绘制完成后回调几何（GeoJSON 4326）；绘制期间自动抑制要素点击 */
  startMeasure(mode: 'distance' | 'area', onDone: (geometry: object) => void): void;
  /** 停止当前量算绘制 */
  stopMeasure(): void;
  /** 是否正在量算绘制中 */
  isMeasuring(): boolean;
  /**
   * 点位聚合模式：小比例尺下将邻近点合并为带数字的聚合圆，
   * 放大后自动拆分为单点。与热力图模式互斥，传 false 恢复普通标注。
   */
  setClusterMode(enabled: boolean): void;
  /**
   * 密度热力图模式：以点密度渲染高斯模糊热力图，颜色越亮表示越密集。
   * 与聚合模式互斥，传 false 恢复普通标注。
   */
  setHeatmapMode(enabled: boolean): void;
  /** 设置聚合距离（像素，默认 60），仅聚合模式下生效 */
  setClusterDistance(distance: number): void;
  /**
   * 行政区域热力图模式（Choropleth）：按行政区域统计数量，用色阶填充区域，
   * 颜色越深表示数量越多。与聚合/密度热力图互斥，传 false 恢复普通标注。
   */
  setChoroplethMode(enabled: boolean): void;
  /**
   * 设置行政区域统计数据（城市名 -> 数量），用于计算色阶。
   * 筛选变化时应重新统计并调用此方法更新热力图。
   */
  setChoroplethData(data: Record<string, number>): void;
  destroy(): void;
}

export type { BaseMapType };
