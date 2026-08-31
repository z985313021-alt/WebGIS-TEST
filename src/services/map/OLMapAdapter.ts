// 逻辑层：OpenLayers 实现的 MapAdapter
import Map from 'ol/Map';
import View from 'ol/View';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import type { MapAdapter, BaseMapType } from './MapAdapter';
import { createBaseMapLayer } from '@/data/sources/tianditu';

export class OLMapAdapter implements MapAdapter {
  private map: Map | null = null;
  private baseLayer: ReturnType<typeof createBaseMapLayer> | null = null;
  private vectorLayers = new Map<string, VectorLayer>();

  mount(target: HTMLElement): void {
    this.baseLayer = createBaseMapLayer('vec');
    this.map = new Map({
      target,
      layers: [this.baseLayer],
      view: new View({ center: [104.06, 30.67], zoom: 4 }),
    });
  }

  setBaseMap(type: BaseMapType): void {
    if (!this.map) return;
    const next = createBaseMapLayer(type);
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
    this.map?.getView().setView({ center, zoom });
  }

  destroy(): void {
    this.map?.setTarget(undefined);
    this.map = null;
  }
}
