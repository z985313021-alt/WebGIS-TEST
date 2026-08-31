// 逻辑层：OpenLayers 实现的 MapAdapter
import OLMap from 'ol/Map';
import View from 'ol/View';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import type { MapAdapter, BaseMapType } from './MapAdapter';
import { createBaseMapLayer } from '@/data/sources/tianditu';

export class OLMapAdapter implements MapAdapter {
  private map: OLMap | null = null;
  private baseLayer: ReturnType<typeof createBaseMapLayer> | null = null;
  private vectorLayers = new Map<string, VectorLayer>();
  private useTianditu = false;

  mount(target: HTMLElement, useTianditu = false): void {
    this.useTianditu = useTianditu;
    this.baseLayer = createBaseMapLayer('vec', useTianditu);
    this.map = new OLMap({
      target,
      layers: [this.baseLayer],
      // 天地图 w 集为 EPSG:4326；OSM 兜底保持默认 3857
      view: useTianditu
        ? new View({ projection: 'EPSG:4326', center: [104.06, 30.67], zoom: 5 })
        : new View({ center: [104.06, 30.67], zoom: 4 }),
    });
  }

  setBaseMap(type: BaseMapType): void {
    if (!this.map) return;
    const next = createBaseMapLayer(type, this.useTianditu);
    if (this.baseLayer) this.map.removeLayer(this.baseLayer);
    this.map.addLayer(next);
    this.baseLayer = next;
  }

  addVectorLayer(geojson: object, id: string): void {
    if (!this.map) return;
    const layer = new VectorLayer({
      source: new VectorSource({ features: new GeoJSON().readFeatures(geojson) }),
    });
    this.map.addLayer(layer);
    this.vectorLayers.set(id, layer);
  }

  removeLayer(id: string): void {
    const layer = this.vectorLayers.get(id);
    if (layer && this.map) this.map.removeLayer(layer);
    this.vectorLayers.delete(id);
  }

  zoomTo(center: [number, number], zoom = 10): void {
    const view = this.map?.getView();
    if (!view) return;
    view.setCenter(center);
    view.setZoom(zoom);
  }

  destroy(): void {
    this.map?.setTarget(undefined);
    this.map = null;
  }
}
