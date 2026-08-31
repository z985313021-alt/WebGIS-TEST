// 逻辑层：OpenLayers 实现的 MapAdapter
// 合并自：队友 T2（天地图 WMTS + 投影切换）+ 本分支 T3（GeoJSON 图层/筛选/高亮/点击）
// 注意：ol 的 Map 导入别名 OMap，避免遮蔽全局 Map（new Map() 必须指向 JS Map）
import OMap from 'ol/Map';
import View from 'ol/View';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import { Style, Circle as CircleStyle, Fill, Stroke } from 'ol/style';
import { fromLonLat, transform } from 'ol/proj';
import type { Feature } from 'ol';
import type { MapAdapter, FeatureStyleFn, BaseMapType } from './MapAdapter';
import { createBaseMapLayer } from '@/data/sources/tianditu';

const HIDDEN_STYLE = new Style({
  image: new CircleStyle({ radius: 0, fill: new Fill({ color: 'rgba(0,0,0,0)' }) }),
});
const HIGHLIGHT_STYLE = new Style({
  image: new CircleStyle({
    radius: 11,
    fill: new Fill({ color: 'rgba(255, 200, 0, 0.95)' }),
    stroke: new Stroke({ color: '#ffffff', width: 3 }),
  }),
});

/** 山东中心（经纬度） */
const SHANDONG_CENTER: [number, number] = [118.2, 36.3];

export class OLMapAdapter implements MapAdapter {
  private map: OMap | null = null;
  private baseLayer: ReturnType<typeof createBaseMapLayer> | null = null;
  private layers = new Map<string, VectorLayer>();
  private styleFns = new Map<string, FeatureStyleFn>();
  private filters = new Map<string, (props: Record<string, unknown>) => boolean>();
  private highlightId: string | number | null = null;
  private clickCb: ((props: Record<string, unknown> | null) => void) | null = null;
  private useTianditu = false;

  mount(target: HTMLElement, useTianditu = false): void {
    this.useTianditu = useTianditu;
    this.baseLayer = createBaseMapLayer('vec', useTianditu);
    // 天地图 w 集为 EPSG:4326；OSM 兜底保持默认 3857
    const projection = useTianditu ? 'EPSG:4326' : 'EPSG:3857';
    const center = useTianditu ? SHANDONG_CENTER : fromLonLat(SHANDONG_CENTER);
    this.map = new OMap({
      target,
      layers: [this.baseLayer],
      view: new View({ projection, center, zoom: useTianditu ? 6 : 7 }),
      controls: [],
    });
    this.map.on('singleclick', (evt) => {
      const feature = this.map!.forEachFeatureAtPixel(evt.pixel, (f) => f);
      if (feature) {
        this.clickCb?.(feature.getProperties() as Record<string, unknown>);
      } else {
        this.clickCb?.(null);
      }
    });
  }

  setBaseMap(type: BaseMapType): void {
    if (!this.map) return;
    const next = createBaseMapLayer(type, this.useTianditu);
    if (this.baseLayer) this.map.removeLayer(this.baseLayer);
    this.map.addLayer(next);
    this.baseLayer = next;
  }

  /** 视图投影（4326 或 3857），GeoJSON 读取用它做 featureProjection */
  private viewProjection(): string {
    const proj = this.map?.getView().getProjection();
    return proj ? proj.getCode() : 'EPSG:3857';
  }

  addGeoJsonLayer(geojson: object, id: string, styleFn?: FeatureStyleFn): void {
    if (!this.map) return;
    const features = new GeoJSON().readFeatures(geojson, {
      featureProjection: this.viewProjection(),
      dataProjection: 'EPSG:4326',
    });
    // 把属性挂到 _props，便于点击回调取整包属性
    features.forEach((f) => {
      f.set('_props', f.getProperties());
      if (f.get('id') == null && f.get('_id') == null) f.set('_id', f.getId());
    });
    const layer = new VectorLayer({
      source: new VectorSource({ features }),
      style: (feature) => this.buildStyle(feature),
    });
    this.map.addLayer(layer);
    this.layers.set(id, layer);
    if (styleFn) this.styleFns.set(id, styleFn);
  }

  /** 兼容旧接口：无样式/筛选的普通矢量图层 */
  addVectorLayer(geojson: object, id: string): void {
    if (!this.map) return;
    const layer = new VectorLayer({
      source: new VectorSource({
        features: new GeoJSON().readFeatures(geojson, {
          featureProjection: this.viewProjection(),
          dataProjection: 'EPSG:4326',
        }),
      }),
    });
    this.map.addLayer(layer);
    this.layers.set(id, layer);
  }

  setLayerFilter(id: string, predicate: (props: Record<string, unknown>) => boolean): void {
    this.filters.set(id, predicate);
    this.layers.get(id)?.changed();
  }

  setHighlightId(id: string | number | null): void {
    this.highlightId = id;
    this.layers.forEach((layer) => layer.changed());
  }

  onFeatureClick(cb: (props: Record<string, unknown> | null) => void): void {
    this.clickCb = cb;
  }

  getLayerFeatureCount(id: string): number {
    const src = this.layers.get(id)?.getSource();
    return src ? (src as VectorSource).getFeatures().length : 0;
  }

  removeLayer(id: string): void {
    const layer = this.layers.get(id);
    if (layer && this.map) this.map.removeLayer(layer);
    this.layers.delete(id);
    this.styleFns.delete(id);
    this.filters.delete(id);
  }

  /** 经纬度定位（EPSG:4326，自动适配视图投影） */
  zoomTo(lonlat: [number, number], zoom = 9): void {
    const view = this.map?.getView();
    if (!view) return;
    view.animate({
      center: transform(lonlat, 'EPSG:4326', view.getProjection()),
      zoom,
      duration: 350,
    });
  }

  destroy(): void {
    this.map?.setTarget(undefined);
    this.map = null;
  }

  /** 要素样式：隐藏(筛选不中) / 高亮(选中) / 分类样式 */
  private buildStyle(feature: Feature): Style {
    const props = (feature.get('_props') as Record<string, unknown>) ?? feature.getProperties();
    // 筛选不中 → 隐藏
    for (const predicate of this.filters.values()) {
      if (!predicate(props)) return HIDDEN_STYLE;
    }
    // 高亮
    const id = props['id'];
    if (this.highlightId != null && String(id) === String(this.highlightId)) {
      return HIGHLIGHT_STYLE;
    }
    // 分类样式（默认圆点）
    const color = (props['color'] as string) || '#1890ff';
    return new Style({
      image: new CircleStyle({
        radius: 6,
        fill: new Fill({ color }),
        stroke: new Stroke({ color: '#ffffff', width: 1.5 }),
      }),
    });
  }
}
