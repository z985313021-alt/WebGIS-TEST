// 逻辑层：OpenLayers 实现的 MapAdapter
// 合并自：队友 T2（天地图 WMTS + 投影切换）+ T3（GeoJSON 图层/筛选/高亮/点击）+ T7（量算绘制）
// 注意：ol 的 Map 导入别名 OMap，避免遮蔽全局 Map（new Map() 必须指向 JS Map）
import OMap from 'ol/Map';
import View from 'ol/View';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import { Style, Circle as CircleStyle, Fill, Stroke } from 'ol/style';
import { fromLonLat, transform } from 'ol/proj';
import Draw from 'ol/interaction/Draw';
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
      // 量算绘制中：抑制要素点击，避免与绘制冲突
      if (this.measuring) return;
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
    (features as Feature[]).forEach((f) => {
      f.set('_props', f.getProperties());
      if (f.get('id') == null && f.get('_id') == null) f.set('_id', f.getId());
    });
    const layer = new VectorLayer({
      source: new VectorSource({ features }),
      style: (feature) => this.buildStyle(feature as Feature),
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

  // ---- T7 量算绘制 ----
  private measureDraw: Draw | null = null;
  private measureLayer: VectorLayer | null = null;
  private measuring = false;

  startMeasure(mode: 'distance' | 'area', onDone: (geometry: object) => void): void {
    if (!this.map) return;
    this.stopMeasure();
    this.measuring = true;
    const source = new VectorSource();
    const measureStyle = new Style({
      stroke: new Stroke({ color: '#ff5722', width: 2.5 }),
      fill: new Fill({ color: 'rgba(255,87,34,0.15)' }),
      image: new CircleStyle({ radius: 5, fill: new Fill({ color: '#ff5722' }) }),
    });
    this.measureLayer = new VectorLayer({ source, style: measureStyle });
    this.map.addLayer(this.measureLayer);
    this.measureDraw = new Draw({
      source,
      type: mode === 'distance' ? 'LineString' : 'Polygon',
      style: measureStyle,
    });
    this.map.addInteraction(this.measureDraw);
    this.measureDraw.on('drawend', (evt) => {
      this.measuring = false;
      const geom = evt.feature.getGeometry();
      const geom4326 = geom!.clone().transform(this.viewProjection(), 'EPSG:4326');
      onDone(new GeoJSON().writeGeometryObject(geom4326) as object);
    });
  }

  stopMeasure(): void {
    this.measuring = false;
    if (this.measureDraw && this.map) this.map.removeInteraction(this.measureDraw);
    this.measureDraw = null;
    if (this.measureLayer && this.map) this.map.removeLayer(this.measureLayer);
    this.measureLayer = null;
  }

  isMeasuring(): boolean {
    return this.measuring;
  }

  destroy(): void {
    this.map?.setTarget(undefined);
    this.map = null;
  }

  /** 要素样式：隐藏(筛选不中) / 高亮(选中) / 分类样式（按几何类型渲染） */
  private buildStyle(feature: Feature): Style {
    const props = (feature.get('_props') as Record<string, unknown>) ?? feature.getProperties();
    // 筛选不中 → 隐藏
    for (const predicate of this.filters.values()) {
      if (!predicate(props)) return HIDDEN_STYLE;
    }
    const color = (props['color'] as string) || '#1890ff';
    const geomType = feature.getGeometry()?.getType();
    // 高亮（仅点要素放大）
    const id = props['id'];
    if (this.highlightId != null && String(id) === String(this.highlightId) && geomType === 'Point') {
      return HIGHLIGHT_STYLE;
    }
    // 多边形/线 → 描边+填充
    if (geomType === 'Polygon' || geomType === 'MultiPolygon') {
      return new Style({
        stroke: new Stroke({ color, width: 2 }),
        fill: new Fill({ color: 'rgba(255, 87, 34, 0.15)' }),
      });
    }
    if (geomType === 'LineString' || geomType === 'MultiLineString') {
      return new Style({ stroke: new Stroke({ color, width: 3 }) });
    }
    // 点 → 圆点
    return new Style({
      image: new CircleStyle({
        radius: 6,
        fill: new Fill({ color }),
        stroke: new Stroke({ color: '#ffffff', width: 1.5 }),
      }),
    });
  }
}
