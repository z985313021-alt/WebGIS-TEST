// 逻辑层：OpenLayers 实现的 MapAdapter
// 合并自：队友 T2（天地图 WMTS + 投影切换）+ T3（GeoJSON 图层/筛选/高亮/点击）+ T7（量算绘制）
// 注意：ol 的 Map 导入别名 OMap，避免遮蔽全局 Map（new Map() 必须指向 JS Map）
import OMap from 'ol/Map';
import View from 'ol/View';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import { Style, Circle as CircleStyle, Fill, Stroke, Icon, Text } from 'ol/style';
import { fromLonLat, transform } from 'ol/proj';
import Draw from 'ol/interaction/Draw';
import ImageLayer from 'ol/layer/Image';
import type ImageSource from 'ol/source/Image';
import ImageWMS from 'ol/source/ImageWMS';
import type { Feature } from 'ol';
import type { MapAdapter, FeatureStyleFn, BaseMapType } from './MapAdapter';
import { createBaseMapLayer, createTiandituLabelLayer } from '@/data/sources/tianditu';
import type { BaseMapProvider } from '@/data/sources/tianditu';

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

/** 放大到该 zoom 及以上时，非遗点标注从 pin 图标切换为「图片缩略图 + 名称」 */
const LABEL_ZOOM = 11;

/** 生成分类色 pin 图标（SVG data URI），替换默认圆点标注 */
function pinIconDataUri(color: string): string {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24">'
    + '<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="' + color + '" stroke="#ffffff" stroke-width="1.5"/>'
    + '<circle cx="12" cy="9" r="3" fill="#ffffff"/></svg>';
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

/** 出生动画参数 */
const BIRTH_DELAY_MAX = 450; // 每个点最大随机延迟(ms)，让一批点错落弹出
const BIRTH_DURATION = 620; // 单个点弹性放大时长(ms)

/** 由要素 id 生成确定性延迟（同一点每次刷新延迟一致，不抖动） */
function birthDelay(id: unknown): number {
  const s = String(id ?? 0);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % BIRTH_DELAY_MAX;
}

/** easeOutBack：先冲过头一点再回落，做出"弹跳长出"的质感 */
function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const u = t - 1;
  return 1 + c3 * u * u * u + c1 * u * u;
}

export class OLMapAdapter implements MapAdapter {
  private map: OMap | null = null;
  private baseLayer: ReturnType<typeof createBaseMapLayer> | null = null;
  private labelLayer: ReturnType<typeof createTiandituLabelLayer> | null = null;
  private layers = new Map<string, VectorLayer>();
  private wmsLayers = new Map<string, ImageLayer<ImageSource>>();
  private styleFns = new Map<string, FeatureStyleFn>();
  private filters = new Map<string, (props: Record<string, unknown>) => boolean>();
  private highlightId: string | number | null = null;
  private clickCb: ((props: Record<string, unknown> | null) => void) | null = null;
  private baseMapType: BaseMapType = 'vec';
  private provider: BaseMapProvider = 'osm';
  /** 出生动画：距动画开始已过去的毫秒数(0=未在播放)。由 playBirthAnimation 驱动，buildStyle 读取 */
  private birthPlayhead = 0;
  private birthTimer: ReturnType<typeof setTimeout> | null = null;
  /** 本次出生动画要弹出的 feature 集合（空 = 全部可见点都弹） */
  private birthTargets = new Map<Feature, boolean>();

  mount(target: HTMLElement, provider: BaseMapProvider = 'osm'): void {
    this.provider = provider;
    this.baseMapType = 'vec';
    this.baseLayer = createBaseMapLayer('vec', provider);
    // 统一 EPSG:3857（天地图 c 集与 OSM 同投影），中心点山东
    const center = fromLonLat(SHANDONG_CENTER);
    this.map = new OMap({
      target,
      layers: [this.baseLayer],
      view: new View({ projection: 'EPSG:3857', center, zoom: 7 }),
      controls: [],
    });
    this.syncLabelLayer();
    // zoom 变化时重算样式（非遗点标注在小/大比例之间切换 icon 与图片+名称）
    this.map.getView().on('change:resolution', () => {
      this.layers.forEach((layer) => layer.changed());
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
    this.baseMapType = type;
    if (!this.map) return;
    const next = createBaseMapLayer(type, this.provider);
    // 原位替换底图（保持第 0 层），避免盖住注记/矢量图层
    const layers = this.map.getLayers();
    if (this.baseLayer) {
      const idx = layers.getArray().indexOf(this.baseLayer);
      if (idx >= 0) layers.setAt(idx, next);
      else layers.insertAt(0, next);
    } else {
      layers.insertAt(0, next);
    }
    this.baseLayer = next;
    this.syncLabelLayer();
  }

  /** 切换底图提供商（天地图 / OSM），天地图模式下自动叠加中文注记层 */
  setProvider(provider: BaseMapProvider): void {
    this.provider = provider;
    this.setBaseMap(this.baseMapType);
  }

  /** 天地图模式叠加 cva_c 注记层（城市名/道路名），OSM 模式移除（其自带标注） */
  private syncLabelLayer(): void {
    if (!this.map) return;
    if (this.provider === 'tianditu' && !this.labelLayer) {
      this.labelLayer = createTiandituLabelLayer();
      // 插在底图之上、矢量数据之下
      this.map.getLayers().insertAt(1, this.labelLayer);
    } else if (this.provider === 'osm' && this.labelLayer) {
      this.map.removeLayer(this.labelLayer);
      this.labelLayer = null;
    }
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

  /** 省界高亮图层：加粗描边 + 半透明填充，插入底图之上、矢量数据之下 */
  addBoundaryLayer(geojson: object, id: string): void {
    if (!this.map) return;
    const features = new GeoJSON().readFeatures(geojson, {
      featureProjection: this.viewProjection(),
      dataProjection: 'EPSG:4326',
    });
    const boundaryStyle = new Style({
      stroke: new Stroke({ color: '#1a56db', width: 3 }),
      fill: new Fill({ color: 'rgba(26, 86, 219, 0.08)' }),
    });
    const layer = new VectorLayer({
      source: new VectorSource({ features }),
      style: boundaryStyle,
    });
    // 插在底图（第 0 层）之上，避免盖住后续加入的注记/数据图层
    this.map.getLayers().insertAt(1, layer);
    this.layers.set(id, layer);
  }

  /** 加载 WMS 图层（ImageWMS 透明叠加，EPSG:3857） */
  addWMSLayer(url: string, id: string, params?: { layers?: string; version?: string; format?: string }): void {
    if (!this.map) return;
    const layer = new ImageLayer({
      source: new ImageWMS({
        url,
        params: {
          LAYERS: params?.layers ?? '',
          VERSION: params?.version ?? '1.1.1',
          FORMAT: params?.format ?? 'image/png',
          TRANSPARENT: true,
        },
        ratio: 1,
      }),
    });
    this.map.addLayer(layer);
    this.wmsLayers.set(id, layer);
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

    const wmsLayer = this.wmsLayers.get(id);
    if (wmsLayer && this.map) this.map.removeLayer(wmsLayer);
    this.wmsLayers.delete(id);
  }

  /** 经纬度定位（EPSG:4326，自动适配视图投影） */
  zoomTo(lonlat: [number, number], zoom = 9, duration = 1000): void {
    const view = this.map?.getView();
    if (!view) return;
    view.animate({
      center: transform(lonlat, 'EPSG:4326', view.getProjection()),
      zoom,
      duration,
    });
  }

  // ---- 出生生长动画（时空演变炫技）----
  /**
   * 触发"点出生"动画。传入 wantBornIds 时，只有这些 id 对应的点会逐个弹出
   * （已显示的点不受影响）；不传则当前全部可见点一起弹出（用于首页首载生长）。
   * 每个点的出生进度 = (now - 该点确定性延迟) / 持续时长，动画到点自动结束。
   * 只影响样式（缩放），不改动数据/图层结构。
   */
  playBirthAnimation(wantBornIds?: Array<string | number>): void {
    this.stopBirthAnimation();
    // 预置"本帧想出生的点"映射：feature 原生 id → 是否本次要弹
    this.birthTargets.clear();
    if (wantBornIds) {
      const set = new Set(wantBornIds.map(String));
      this.layers.forEach((layer) => {
        const src = layer.getSource() as VectorSource | null;
        if (!src) return;
        src.getFeatures().forEach((f) => {
          const p = (f.get('_props') as Record<string, unknown>) ?? f.getProperties();
          if (p && p['id'] != null && set.has(String(p['id']))) this.birthTargets.set(f, true);
        });
      });
    }
    this.birthPlayhead = performance.now();
    const tick = () => {
      // 距起始已超过(最长延迟 + 时长) → 结束，恢复静态
      if (performance.now() - this.birthPlayhead >= BIRTH_DELAY_MAX + BIRTH_DURATION) {
        this.stopBirthAnimation();
        this.layers.forEach((layer) => layer.changed());
        return;
      }
      this.layers.forEach((layer) => layer.changed());
      this.birthTimer = setTimeout(tick, 16);
    };
    this.birthTimer = setTimeout(tick, 16);
  }

  /** 停止出生动画，立即恢复静态尺寸 */
  stopBirthAnimation(): void {
    this.birthPlayhead = 0;
    this.birthTargets.clear();
    if (this.birthTimer) {
      clearTimeout(this.birthTimer);
      this.birthTimer = null;
    }
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
    this.stopBirthAnimation();
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
    // 点 → 小比例用分类色 pin 图标，放大到 LABEL_ZOOM 后切换为「图片缩略图 + 名称」
    const zoom = this.map?.getView().getZoom() ?? 7;
    const photo = (props['photo'] as string) || undefined;
    const name = ((props['name'] as string) || '').trim();
    // 出生动画：仅"本次要出生"的点（birthTargets 为空=全部）按确定性延迟弹出
    let birthScale = 1;
    const isBirthTarget = this.birthTargets.size === 0 || this.birthTargets.has(feature);
    if (this.birthPlayhead > 0 && isBirthTarget && geomType === 'Point') {
      const delay = birthDelay(id);
      const t = (performance.now() - this.birthPlayhead - delay) / BIRTH_DURATION;
      if (t < 0) {
        birthScale = 0; // 还没轮到它出生 → 先隐藏
      } else if (t < 1) {
        birthScale = Math.max(0.05, easeOutBack(t));
      }
    }
    const pinsize = Math.max(0.001, 30 * birthScale);
    if (zoom >= LABEL_ZOOM && photo) {
      // 出生前完全隐藏(尺寸0+无文本)；出生中按比例缩放并淡入文本
      const born = birthScale <= 0;
      return new Style({
        image: new Icon({
          src: photo,
          width: Math.max(0.001, 44 * birthScale),
          height: Math.max(0.001, 44 * birthScale),
          anchor: [0.5, 0.5],
          anchorXUnits: 'fraction',
          anchorYUnits: 'fraction',
          opacity: born ? 0 : Math.min(1, birthScale / 0.5),
        }),
        text: born
          ? undefined
          : new Text({
              text: name,
              offsetY: 30,
              font: 'bold 12px "Microsoft YaHei", "PingFang SC", sans-serif',
              fill: new Fill({ color: '#4a3a1f' }),
              stroke: new Stroke({ color: '#ffffff', width: 3 }),
            }),
      });
    }
    return new Style({
      image: new Icon({
        src: pinIconDataUri(color),
        width: pinsize,
        height: pinsize,
        anchor: [0.5, 1],
        anchorXUnits: 'fraction',
        anchorYUnits: 'fraction',
      }),
    });
  }
}
