// 逻辑层：地图引擎抽象接口
// 显示层只依赖此接口，不耦合 OpenLayers / Cesium 细节。
import type BaseMapType from '@/data/sources/tianditu';

export interface MapAdapter {
  mount(target: HTMLElement): void;
  setBaseMap(type: BaseMapType): void;
  addVectorLayer(geojson: object, id: string): void;
  removeLayer(id: string): void;
  zoomTo(center: [number, number], zoom?: number): void;
  destroy(): void;
}
