// 逻辑层：OpenLayers 实现的 MapAdapter
// 合并自：队友 T2（天地图 WMTS + 投影切换）+ T3（GeoJSON 图层/筛选/高亮/点击）+ T7（量算绘制）
// 成员2（地图模块）新增：点位聚合（Cluster）+ 密度热力图（Heatmap）
// 注意：ol 的 Map 导入别名 OMap，避免遮蔽全局 Map（new Map() 必须指向 JS Map）
import OMap from 'ol/Map';
import View from 'ol/View';
import VectorLayer from 'ol/layer/Vector';
import VectorImageLayer from 'ol/layer/VectorImage';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import { Style, Circle as CircleStyle, Fill, Stroke, Icon, Text } from 'ol/style';
import { fromLonLat, transform } from 'ol/proj';
import Draw from 'ol/interaction/Draw';
import Point from 'ol/geom/Point';
import ImageLayer from 'ol/layer/Image';
import type ImageSource from 'ol/source/Image';
import ImageWMS from 'ol/source/ImageWMS';
import Cluster from 'ol/source/Cluster';
import HeatmapLayer from 'ol/layer/Heatmap';
import ScaleLine from 'ol/control/ScaleLine';
import OverviewMap from 'ol/control/OverviewMap';
import type { Feature } from 'ol';
import type { MapAdapter, FeatureStyleFn, BaseMapType } from './MapAdapter';
import { createBaseMapLayer, createTiandituLabelLayer } from '@/data/sources/tianditu';
import { categoryGlyph } from '@/data/sources/heritage';
import type { BaseMapProvider } from '@/data/sources/tianditu';

const HIDDEN_STYLE = new Style({
  image: new CircleStyle({ radius: 0, fill: new Fill({ color: 'rgba(0,0,0,0)' }) }),
});
/**
 * 高亮（选中）样式：朱砂涟漪扩散 + 金色聚焦环脉动 + 印章本体放大。
 * phase 为 0→1 循环相位，由脉冲计时器驱动重绘，形成持续动效。
 */
function buildHighlightStyles(phase: number, color: string, glyph: string): Style[] {
  const styles: Style[] = [];
  // 两道相位错开的涟漪环，持续向外扩散淡出
  for (const offset of [0, 0.5]) {
    const t = (phase + offset) % 1;
    const fade = 1 - t;
    styles.push(new Style({
      image: new CircleStyle({
        radius: 15 + t * 30,
        fill: new Fill({ color: 'rgba(184,53,43,' + (0.28 * fade).toFixed(3) + ')' }),
        stroke: new Stroke({ color: 'rgba(184,53,43,' + (0.95 * fade).toFixed(3) + ')', width: 2.6 }),
      }),
    }));
  }
  // 金色聚焦环：呼吸式缩放
  styles.push(new Style({
    image: new CircleStyle({
      radius: 16 + Math.sin(phase * Math.PI * 2) * 2.4,
      fill: new Fill({ color: 'rgba(217,160,32,0.20)' }),
      stroke: new Stroke({ color: '#d9a020', width: 2.4 }),
    }),
  }));
  // 印章本体：放大展示（底部尖角仍对准该点位）
  styles.push(new Style({
    image: new Icon({
      src: cachedSealIcon(color, glyph),
      width: 40,
      height: 40 * SEAL_RATIO,
      anchor: [0.5, 1],
      anchorXUnits: 'fraction',
      anchorYUnits: 'fraction',
    }),
  }));
  return styles;
}

/** 山东中心（经纬度） */
const SHANDONG_CENTER: [number, number] = [118.2, 36.3];

/** 放大到该 zoom 及以上时，非遗点标注从 pin 图标切换为「图片缩略图 + 名称」 */
const LABEL_ZOOM = 11;

/**
 * 生成「非遗印章」点位图标（SVG data URI）：
 * 印面（门类传统色）+ 内边细线 + 白色门类单字 + 底部落点尖角。
 * 替代通用地图水滴 pin，让点位本身就是非遗视觉符号。
 */
function sealIconDataUri(color: string, glyph: string): string {
  const ch = (glyph || '遗').slice(0, 1);
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="36" viewBox="0 0 32 36">'
    // 落点尖角（指向地理坐标）
    + '<path d="M13.1 25.6 L16 34 L18.9 25.6 Z" fill="' + color + '" stroke="#fff8ec" stroke-width="1.2" stroke-linejoin="round"/>'
    // 印面
    + '<rect x="2.6" y="1.4" width="26.8" height="26.8" rx="4.6" fill="' + color + '" stroke="#fff8ec" stroke-width="2"/>'
    // 印面内边框（朱文印的双线感）
    + '<rect x="5.9" y="4.7" width="20.2" height="20.2" rx="2.6" fill="none" stroke="rgba(255,248,236,0.6)" stroke-width="1.1"/>'
    // 门类单字
    + '<text x="16" y="19" text-anchor="middle" font-family="KaiTi,STKaiti,SimSun,serif" font-size="15.5" font-weight="700" fill="#fff8ec">' + ch + '</text>'
    + '</svg>';
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}
/** 印章图标宽高比（32:36），Icon 需等比设置避免拉伸 */
const SEAL_RATIO = 36 / 32;

/**
 * 印章图标缓存：同一「色 + 单字」只生成一次 data URI。
 * 地图重绘时样式函数会被高频调用（185 点 × 每秒十余帧），
 * 若每次都重新拼 SVG 并 encode，字符串与 Icon 图片缓存全部失效，是主要卡顿源。
 */
const SEAL_ICON_CACHE = new Map<string, string>();
function cachedSealIcon(color: string, glyph: string): string {
  const key = color + '|' + glyph;
  let uri = SEAL_ICON_CACHE.get(key);
  if (!uri) {
    uri = sealIconDataUri(color, glyph);
    SEAL_ICON_CACHE.set(key, uri);
  }
  return uri;
}

// ---- 行政热力图色阶辅助 ----
/** 行政热力图色阶：数量从少到多，颜色从浅米黄到深红（非遗主题色） */
const CHOROPLETH_COLORS = [
  '#f5ecd7', // 0-10% 极浅
  '#e8d5a8', // 10-25% 浅黄
  '#d9b877', // 25-40% 金黄
  '#c9944a', // 40-55% 琥珀
  '#b8702e', // 55-70% 橙棕
  '#a04d22', // 70-85% 深橙
  '#8f2317', // 85-100% 深红（品牌主色）
];

/** 根据数量和最大值计算色阶颜色 */
function choroplethColor(count: number, max: number): string {
  if (max <= 0 || count <= 0) return CHOROPLETH_COLORS[0];
  const ratio = count / max;
  const idx = Math.min(CHOROPLETH_COLORS.length - 1, Math.floor(ratio * CHOROPLETH_COLORS.length));
  return CHOROPLETH_COLORS[idx];
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

// ---- 聚合样式辅助 ----
/** 聚合圆颜色：数量越多颜色越暖（蓝→绿→黄→橙→红） */
function clusterColor(count: number): string {
  if (count < 5) return '#3b82f6';
  if (count < 15) return '#10b981';
  if (count < 30) return '#f59e0b';
  if (count < 60) return '#f97316';
  return '#ef4444';
}
/** 聚合圆半径：数量越大圆越大（14~26px） */
function clusterRadius(count: number): number {
  return Math.min(26, 14 + Math.sqrt(count) * 2.2);
}

export class OLMapAdapter implements MapAdapter {
  private map: OMap | null = null;
  private baseLayer: ReturnType<typeof createBaseMapLayer> | null = null;
  private labelLayer: ReturnType<typeof createTiandituLabelLayer> | null = null;
  private layers = new Map<string, VectorLayer | VectorImageLayer>();
  private wmsLayers = new Map<string, ImageLayer<ImageSource>>();
  private styleFns = new Map<string, FeatureStyleFn>();
  private filters = new Map<string, (props: Record<string, unknown>) => boolean>();
  private highlightId: string | number | null = null;
  /** 选中动效相位（0→1 循环），驱动涟漪扩散与聚焦环呼吸 */
  private pulsePhase = 0;
  private pulseTimer: number | null = null;
  /** 常规印章样式缓存（色+单字 → Style），避免重绘时反复新建 Icon/Style 对象 */
  private styleCache = new Map<string, Style>();
  private hoverCityCode: string | null = null;
  private cityStyleFns = new Map<string, () => void>();
  private clickCb: ((props: Record<string, unknown> | null) => void) | null = null;
  /** 聚合圆点击回调（传入聚合内点位列表和聚合中心） */
  private clusterClickCb: ((items: Array<Record<string, unknown>>, center: [number, number]) => void) | null = null;
  private baseMapType: BaseMapType = 'vec';
  private provider: BaseMapProvider = 'osm';
  /** 出生动画：距动画开始已过去的毫秒数(0=未在播放)。由 playBirthAnimation 驱动，buildStyle 读取 */
  private birthPlayhead = 0;
  private birthTimer: ReturnType<typeof setTimeout> | null = null;
  /** 本次出生动画要弹出的 feature 集合（空 = 全部可见点都弹） */
  private birthTargets = new Map<Feature, boolean>();

  // ---- 成员2：聚合 / 热力图状态 ----
  /** 当前显示模式：normal=普通标注 / cluster=点位聚合 / heatmap=密度热力图 */
  private displayMode: 'normal' | 'cluster' | 'heatmap' | 'choropleth' = 'normal';
  /** 聚合距离（像素） */
  private clusterDistance = 60;
  /** 聚合图层（基于 heritage 原始 source 做 Cluster 包装） */
  private clusterLayer: VectorLayer<Cluster> | null = null;
  /** 热力图图层 */
  private heatmapLayer: HeatmapLayer | null = null;
  /** 记录 heritage 图层的原始 VectorSource，供聚合/热力图复用 */
  private heritageSource: VectorSource | null = null;

  // ---- 成员2：行政区域热力图（Choropleth）状态 ----
  /** 行政热力图图层（基于市界 GeoJSON，按数量色阶填充） */
  private choroplethLayer: VectorLayer | null = null;
  /** 行政区域统计数据：城市名 -> 数量 */
  private choroplethData: Record<string, number> = {};
  /** 市界 GeoJSON 数据（由 MapContainer 设置） */
  private choroplethBoundary: object | null = null;
  /** 当前 hover 的城市名（用于高亮） */
  private hoveredCity: string | null = null;

  mount(target: HTMLElement, provider: BaseMapProvider = 'osm'): void {
    this.provider = provider;
    this.baseMapType = 'vec';
    this.baseLayer = createBaseMapLayer('vec', provider);
    // 统一 EPSG:3857（天地图 c 集与 OSM 同投影），中心点山东
    const center = fromLonLat(SHANDONG_CENTER);
    this.map = new OMap({
      target,
      layers: [this.baseLayer],
      view: new View({
        projection: 'EPSG:3857',
        center,
        zoom: 7.5,
        // 山东周边范围（手算 3857：112E~124E, 32N~39.5N），放大显示
        extent: [12467783, 3763311, 13803617, 4793547],
        constrainOnlyCenter: true,
        smoothExtentConstraint: true,
      }),
      // 构造后用 animate 平滑约束也行 —— 先删 SHANDONG_BOUNDS 引用
      // 成员2：添加比例尺控件（左下角，公制单位）
      controls: [
        new ScaleLine({
          units: 'metric',
          bar: true,
          steps: 4,
          text: true,
          minWidth: 100,
        }),
        // 鹰眼图（右下角小地图缩略图，默认折叠为小图标，点击展开）
        // 底图用高德矢量（国内可访问），和主地图保持一致
        new OverviewMap({
          collapsible: true,
          collapsed: true,
          label: '',
          collapseLabel: '',
          layers: [createBaseMapLayer('vec', 'amap')],
          view: new View({
            projection: 'EPSG:3857',
            center: fromLonLat([118.2, 36.3]),
            zoom: 6,
          }),
        }),
      ],
    });

    this.syncLabelLayer();
    // 缩放结束后重算样式（非遗点 pin/图片切换、边界层刷新）——用 moveend 而非
    // change:resolution，避免拖动/缩放每一帧都触发全层重绘导致卡顿
    this.map.on('moveend', () => {
      this.layers.forEach((layer) => layer.changed());
      this.clusterLayer?.changed();
    });
    // 行政热力图模式：hover 高亮城市边界
    this.map.on('pointermove', (evt) => {
      if (this.displayMode !== 'choropleth' || !this.choroplethLayer) return;
      const cityFeat = this.map!.forEachFeatureAtPixel(evt.pixel, (f) => f, {
        layerFilter: (l) => l === this.choroplethLayer,
      });
      const cityName = cityFeat
        ? ((cityFeat.get('_props') as Record<string, unknown>) ?? cityFeat.getProperties())['name'] as string
        : null;
      if (cityName !== this.hoveredCity) {
        this.hoveredCity = cityName;
        this.choroplethLayer!.changed();
        this.map!.getTargetElement().style.cursor = cityFeat ? 'pointer' : '';
      }
    });
    this.map.on('singleclick', (evt) => {
      // 拾取点模式：把点击位置转为经纬度回调出去（单次拾取后自动退出）
      if (this.pickCb) {
        const cb = this.pickCb;
        const lonlat = transform(evt.coordinate, this.viewProjection(), 'EPSG:4326') as [number, number];
        this.stopPickPoint();
        cb(lonlat);
        return;
      }
      // 量算绘制中：抑制要素点击，避免与绘制冲突
      if (this.measuring) return;
      // 行政热力图模式：点击城市区域放大到该市
      if (this.displayMode === 'choropleth' && this.choroplethLayer) {
        const cityFeat = this.map!.forEachFeatureAtPixel(evt.pixel, (f) => f, {
          layerFilter: (l) => l === this.choroplethLayer,
        });
        if (cityFeat) {
          const props = (cityFeat.get('_props') as Record<string, unknown>) ?? cityFeat.getProperties();
          const center = props['center'] as [number, number] | undefined;
          if (center) {
            this.zoomTo(center, 9.5);
          }
          return;
        }
      }
      // 聚合模式：优先检测聚合点，点击聚合圆则放大展开 + 弹出点位列表
      if (this.displayMode === 'cluster' && this.clusterLayer) {
        const clusterFeat = this.map!.forEachFeatureAtPixel(evt.pixel, (f) => f, {
          layerFilter: (l) => l === this.clusterLayer,
        });
        if (clusterFeat) {
          const features = clusterFeat.get('features') as Feature[] | undefined;
          if (features && features.length > 1) {
            // 多个点聚合 → 飞到聚合中心并放大一级展开
            const geom = clusterFeat.getGeometry();
            let centerLonLat: [number, number] = [0, 0];
            if (geom && geom.getType() === 'Point') {
              const coord = (geom as any).getCoordinates();
              const view = this.map!.getView();
              centerLonLat = transform(coord, view.getProjection(), 'EPSG:4326') as [number, number];
              view.animate({
                center: coord,
                zoom: Math.min((view.getZoom() ?? 7) + 2, 18),
                duration: 500,
              });
            }
            // 成员2增强：触发聚合点击回调，传入点位列表和聚合中心
            const items = features.map((f) => {
              const p = (f.get('_props') as Record<string, unknown>) ?? f.getProperties();
              return { ...p };
            });
            this.clusterClickCb?.(items, centerLonLat);
            return;
          }
          // 单点聚合 → 透传到普通点击回调
          if (features && features.length === 1) {
            const props = (features[0].get('_props') as Record<string, unknown>) ?? features[0].getProperties();
            this.clickCb?.(props);
            return;
          }
        }
        this.clickCb?.(null);
        return;
      }
      // 热力图模式：原始图层不可见，需用 layerFilter 强制检测 heritage 图层
      if (this.displayMode === 'heatmap') {
        const heritageLayer = this.layers.get('heritage');
        const feature = this.map!.forEachFeatureAtPixel(evt.pixel, (f) => f, {
          layerFilter: (l) => l === heritageLayer,
        });
        if (feature) {
          this.clickCb?.(feature.getProperties() as Record<string, unknown>);
        } else {
          this.clickCb?.(null);
        }
        return;
      }
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
    } else if (this.provider !== 'tianditu' && this.labelLayer) {
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
    // 把属性挂到 _props，便于点击回调取整包属性；同时标记 _layerId 用于图层样式区分
    (features as Feature[]).forEach((f) => {
      // 顺序要紧：必须先写 _layerId 再快照 _props，
      // 否则属性包里没有图层标识，分析图层/用户图层的专用样式与筛选隔离都会失效
      f.set('_layerId', id);
      f.set('_props', f.getProperties());
      if (f.get('id') == null && f.get('_id') == null) f.set('_id', f.getId());
    });
    const source = new VectorSource({ features });
    const layer = new VectorLayer({
      source,
      style: (feature) => this.buildStyle(feature as Feature),
    });
    this.map.addLayer(layer);
    this.layers.set(id, layer);
    if (styleFn) this.styleFns.set(id, styleFn);
    // 记录 heritage 图层 source，供聚合/热力图复用
    if (id === 'heritage') {
      this.heritageSource = source;
      // 如果当前处于聚合/热力图模式，重建对应图层
      if (this.displayMode === 'cluster') this.setupClusterLayer();
      else if (this.displayMode === 'heatmap') this.setupHeatmapLayer();
    }
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
    // 无底图模式：省界用深色加粗描边 + 浅金填充（非遗平台风格）
    const boundaryStyle = new Style({
      stroke: new Stroke({ color: '#8a6a3f', width: 3 }),
      fill: new Fill({ color: 'rgba(216, 192, 119, 0.12)' }),
    });
    // 用 VectorImageLayer：边界静态、顶点多，平移时复用离屏缓存图像，避免每帧重绘
    const layer = new VectorImageLayer({
      source: new VectorSource({ features }),
      style: boundaryStyle,
      imageRatio: 1,
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

  /** 市界分块图层：16 地市各自色块 + 市名标注，悬停高亮 */
  addCityBoundaryLayer(geojson: object, id: string): void {
    if (!this.map) return;
    const features = new GeoJSON().readFeatures(geojson, {
      featureProjection: this.viewProjection(),
      dataProjection: 'EPSG:4326',
    });
    // 市界同样用 VectorImageLayer：色块+标注静态，平移不重绘，仅 hover 变化时重绘一次
    const layer = new VectorImageLayer({
      source: new VectorSource({ features }),
      style: (feature) => this.cityStyle(feature as Feature),
      imageRatio: 1,
    });
    this.map.addLayer(layer);
    this.layers.set(id, layer);
    // 悬停高亮：pointermove 检测命中的市（取命中的市界 feature，忽略非遗点等）
    this.map.on('pointermove', (evt) => {
      if (evt.dragging) return;
      let hitCode: string | null = null;
      this.map!.forEachFeatureAtPixel(evt.pixel, (f) => {
        const p = (f as Feature).get('_props') as Record<string, unknown> | undefined;
        if (p && typeof p['code'] === 'string' && p['name']) {
          hitCode = p['code'] as string;
          return f;
        }
        return undefined;
      });
      if (this.hoverCityCode !== hitCode) {
        this.hoverCityCode = hitCode;
        this.layers.get(id)?.changed();
      }
    });
    // 样式函数：悬停市高亮，其余正常
    this.cityStyleFns.set(id, () => {});
  }

  /** 市界块样式（含悬停高亮）：色块 + 描边，市名标注定位到 center */
  private cityStyle(feature: Feature): Style[] {
    const props = (feature.get('_props') as Record<string, unknown>) ?? {};
    const code = props['code'];
    const name = (props['name'] as string) || '';
    const center = props['center'] as number[] | undefined;
    const isHover = this.hoverCityCode != null && code === this.hoverCityCode;
    const styles: Style[] = [
      new Style({
        fill: new Fill({ color: isHover ? 'rgba(246, 166, 35, 0.45)' : 'rgba(216, 192, 119, 0.10)' }),
        stroke: new Stroke({ color: isHover ? '#d97706' : '#b08d57', width: isHover ? 3 : 1.5 }),
      }),
    ];
    // 市名标注：geometry 指向市中心
    if (name && center && center.length >= 2) {
      styles.push(new Style({
        geometry: new Point(fromLonLat([center[0], center[1]])),
        text: new Text({
          text: name,
          font: 'bold 14px "Microsoft YaHei", sans-serif',
          fill: new Fill({ color: isHover ? '#d97706' : '#6d4c2a' }),
          stroke: new Stroke({ color: '#ffffff', width: 3 }),
        }),
      }));
    }
    return styles;
  }

  setLayerFilter(id: string, predicate: (props: Record<string, unknown>) => boolean): void {
    this.filters.set(id, predicate);
    this.layers.get(id)?.changed();
    // 筛选变化时聚合/热力图也需要刷新（基于同一 source）
    if (id === 'heritage') {
      // 聚合：Cluster source 重新计算聚类（geometryFunction 依赖筛选结果）
      this.clusterLayer?.getSource()?.refresh();
      // 热力图：weight 函数依赖筛选结果，触发图层重绘
      this.heatmapLayer?.changed();
    }
  }

  setHighlightId(id: string | number | null): void {
    this.highlightId = id;
    // 选中即开启动效，取消选中立即停表，避免无高亮时的空转重绘
    if (id == null) this.stopPulse();
    else this.startPulse();
    this.layers.forEach((layer) => layer.changed());
  }

  /**
   * 启动选中脉冲：90ms 推进一次相位。
   * 只重绘可能承载高亮点的图层（主图层与用户数据集），
   * 省界/缓冲区/路线等图层不必跟着高频重绘；页面不可见时跳过。
   */
  private startPulse(): void {
    if (this.pulseTimer != null) return;
    this.pulseTimer = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      this.pulsePhase = (this.pulsePhase + 0.05) % 1;
      this.layers.forEach((layer, id) => {
        if (id === 'heritage' || id.startsWith('user-')) layer.changed();
      });
    }, 90);
  }

  /** 停止选中脉冲并复位相位 */
  private stopPulse(): void {
    if (this.pulseTimer != null) {
      window.clearInterval(this.pulseTimer);
      this.pulseTimer = null;
    }
    this.pulsePhase = 0;
  }

  onFeatureClick(cb: (props: Record<string, unknown> | null) => void): void {
    this.clickCb = cb;
  }

  onClusterClick(cb: (items: Array<Record<string, unknown>>, center: [number, number]) => void): void {
    this.clusterClickCb = cb;
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

    // 移除 heritage 时同步清理聚合/热力图/行政热力图
    if (id === 'heritage') {
      this.heritageSource = null;
      this.disposeClusterLayer();
      this.disposeHeatmapLayer();
      this.disposeChoroplethLayer();
      this.displayMode = 'normal';
    }
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

  /** 缩放到指定图层的完整范围（padding为边距像素，默认80），图层不存在或无要素则忽略 */
  fitToLayer(id: string, padding = 80): void {
    const layer = this.layers.get(id);
    if (!layer || !this.map) return;
    const source = layer.getSource() as VectorSource;
    if (!source) return;
    const extent = source.getExtent();
    // 空范围（Infinity）说明图层无要素
    if (!extent || !isFinite(extent[0]) || !isFinite(extent[1]) || !isFinite(extent[2]) || !isFinite(extent[3])) return;
    this.map.getView().fit(extent, {
      padding: [padding, padding, padding, padding],
      duration: 800,
      maxZoom: 16,
    });
  }

  // ---- 成员2：地图控件辅助方法 ----
  /** 获取当前缩放级别 */
  updateSize(): void {
    this.map?.updateSize();
  }

  getZoom(): number {
    return this.map?.getView().getZoom() ?? 7.5;
  }

  /** 获取当前地图中心（经纬度 EPSG:4326） */
  getCenter(): [number, number] {
    const view = this.map?.getView();
    if (!view) return SHANDONG_CENTER;
    const center = view.getCenter();
    if (!center) return SHANDONG_CENTER;
    return transform(center, view.getProjection(), 'EPSG:4326') as [number, number];
  }

  /** 获取当前旋转角度（弧度，0=正北朝上） */
  getRotation(): number {
    return this.map?.getView().getRotation() ?? 0;
  }

  /** 重置视图到山东全景（zoom 7.5，旋转归零） */
  resetView(): void {
    const view = this.map?.getView();
    if (!view) return;
    view.animate({
      center: fromLonLat(SHANDONG_CENTER),
      zoom: 7.5,
      rotation: 0,
      duration: 800,
    });
  }

  /** 重置地图旋转到正北朝上 */
  resetRotation(): void {
    const view = this.map?.getView();
    if (!view) return;
    view.animate({ rotation: 0, duration: 300 });
  }

  /** 监听鼠标移动，回调返回经纬度（EPSG:4326） */
  onPointerMove(cb: (lonlat: [number, number] | null) => void): void {
    if (!this.map) return;
    this.map.on('pointermove', (evt) => {
      const coord = evt.coordinate;
      if (!coord) { cb(null); return; }
      const lonlat = transform(coord, this.map!.getView().getProjection(), 'EPSG:4326');
      cb([lonlat[0], lonlat[1]]);
    });
  }

  /** 监听视图变化（缩放/平移/旋转），回调返回当前状态 */
  onViewChange(cb: (state: { zoom: number; center: [number, number]; rotation: number }) => void): void {
    if (!this.map) return;
    this.map.on('moveend', () => {
      cb({
        zoom: this.getZoom(),
        center: this.getCenter(),
        rotation: this.getRotation(),
      });
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
      // 出生动画只影响点位图层：边界/缓冲区/路线等静态层无需跟着重绘
      this.layers.forEach((layer, id) => {
        if (id === 'heritage' || id.startsWith('user-')) layer.changed();
      });
      this.birthTimer = setTimeout(tick, 25);
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

  // ---- 地图拾取点（缓冲区选点） ----
  private pickCb: ((lonlat: [number, number]) => void) | null = null;

  startPickPoint(onPick: (lonlat: [number, number]) => void): void {
    if (!this.map) return;
    // 拾取与量算互斥，避免两次绘制冲突
    this.stopMeasure();
    this.pickCb = onPick;
    const target = this.map.getTargetElement();
    if (target) target.style.cursor = 'crosshair';
  }

  stopPickPoint(): void {
    this.pickCb = null;
    const target = this.map?.getTargetElement();
    if (target) target.style.cursor = '';
  }

  isPickingPoint(): boolean {
    return this.pickCb != null;
  }

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

  // ============================================================
  // 成员2（地图模块）：点位聚合 + 密度热力图
  // ============================================================

  /** 判断 feature 是否通过所有筛选（聚合/热力图模式下复用） */
  private passFilter(feature: Feature): boolean {
    const props = (feature.get('_props') as Record<string, unknown>) ?? feature.getProperties();
    for (const predicate of this.filters.values()) {
      if (!predicate(props)) return false;
    }
    return true;
  }

  /** 构建聚合要素样式：圆形 + 数量文字，颜色/半径随数量变化 */
  private buildClusterStyle(feature: Feature): Style {
    const features = feature.get('features') as Feature[] | undefined;
    const count = features ? features.length : 1;
    const color = clusterColor(count);
    const radius = clusterRadius(count);
    return new Style({
      image: new CircleStyle({
        radius,
        fill: new Fill({ color: color + 'dd' }),
        stroke: new Stroke({ color: '#ffffff', width: 2.5 }),
      }),
      text: new Text({
        text: String(count),
        font: 'bold 13px "Microsoft YaHei", "PingFang SC", sans-serif',
        fill: new Fill({ color: '#ffffff' }),
        stroke: new Stroke({ color: 'rgba(0,0,0,0.3)', width: 2 }),
      }),
    });
  }

  /** 创建并挂载聚合图层（基于 heritage 原始 source） */
  private setupClusterLayer(): void {
    if (!this.map || !this.heritageSource) return;
    this.disposeClusterLayer();
    const clusterSource = new Cluster({
      distance: this.clusterDistance,
      source: this.heritageSource,
      // 筛选过滤：不满足筛选条件的点返回 null，不参与聚合
      geometryFunction: (feature) => {
        if (!this.passFilter(feature as Feature)) return null;
        const geom = feature.getGeometry();
        return geom && geom.getType() === 'Point' ? (geom as Point) : null;
      },
    });
    this.clusterLayer = new VectorLayer({
      source: clusterSource,
      style: (feature) => this.buildClusterStyle(feature as Feature),
    });
    this.map.addLayer(this.clusterLayer);
  }

  /** 移除并销毁聚合图层 */
  private disposeClusterLayer(): void {
    if (this.clusterLayer && this.map) {
      this.map.removeLayer(this.clusterLayer);
    }
    this.clusterLayer = null;
  }

  /** 创建并挂载热力图图层（基于 heritage 原始 source） */
  private setupHeatmapLayer(): void {
    if (!this.map || !this.heritageSource) return;
    this.disposeHeatmapLayer();
    this.heatmapLayer = new HeatmapLayer({
      source: this.heritageSource,
      blur: 22,
      radius: 14,
      // 权重：通过筛选的点权重为1，被筛选隐藏的点权重为0（不贡献热力）
      weight: (feature) => (this.passFilter(feature as Feature) ? 1 : 0),
      // 渐变从透明→蓝→青→绿→黄→红
      gradient: [
        'rgba(0,0,255,0)',
        'rgba(0,0,255,0.5)',
        'rgba(0,255,255,0.6)',
        'rgba(0,255,0,0.7)',
        'rgba(255,255,0,0.8)',
        'rgba(255,128,0,0.85)',
        'rgba(255,0,0,0.9)',
      ],
      opacity: 0.85,
    });
    this.map.addLayer(this.heatmapLayer);
  }

  /** 移除并销毁热力图图层 */
  private disposeHeatmapLayer(): void {
    if (this.heatmapLayer && this.map) {
      this.map.removeLayer(this.heatmapLayer);
    }
    this.heatmapLayer = null;
  }

  /** 切换普通标注图层可见性（聚合/热力图模式下隐藏原始点图层） */
  private setHeritageLayerVisible(visible: boolean): void {
    const layer = this.layers.get('heritage');
    if (layer) layer.setVisible(visible);
  }

  setClusterMode(enabled: boolean): void {
    if (!this.map) return;
    if (enabled) {
      // 开启聚合：关闭热力图，隐藏原始点图层，显示聚合图层
      this.disposeHeatmapLayer();
      this.setupClusterLayer();
      this.setHeritageLayerVisible(false);
      this.displayMode = 'cluster';
    } else {
      // 关闭聚合：恢复普通标注
      this.disposeClusterLayer();
      this.setHeritageLayerVisible(true);
      this.displayMode = 'normal';
    }
  }

  setHeatmapMode(enabled: boolean): void {
    if (!this.map) return;
    if (enabled) {
      // 开启热力图：关闭聚合，隐藏原始点图层，显示热力图
      this.disposeClusterLayer();
      this.setupHeatmapLayer();
      this.setHeritageLayerVisible(false);
      this.displayMode = 'heatmap';
    } else {
      // 关闭热力图：恢复普通标注
      this.disposeHeatmapLayer();
      this.setHeritageLayerVisible(true);
      this.displayMode = 'normal';
    }
  }

  setClusterDistance(distance: number): void {
    this.clusterDistance = Math.max(10, Math.min(200, distance));
    // 聚合模式下重建图层使新距离生效
    if (this.displayMode === 'cluster') {
      this.setupClusterLayer();
    }
  }

  // ---- 成员2：行政区域热力图（Choropleth）----
  /**
   * 设置市界 GeoJSON 数据（由 MapContainer 在加载市界后调用）。
   * 行政热力图基于此数据创建面要素图层。
   */
  setChoroplethBoundary(geojson: object): void {
    this.choroplethBoundary = geojson;
    // 如果已经在行政热力图模式，重建图层
    if (this.displayMode === 'choropleth') {
      this.setupChoroplethLayer();
    }
  }

  setChoroplethMode(enabled: boolean): void {
    if (!this.map) return;
    if (enabled) {
      // 开启行政热力图：关闭聚合/热力图，隐藏原始点图层
      this.disposeClusterLayer();
      this.disposeHeatmapLayer();
      this.setupChoroplethLayer();
      this.setHeritageLayerVisible(false);
      this.displayMode = 'choropleth';
    } else {
      // 关闭行政热力图：恢复普通标注
      this.disposeChoroplethLayer();
      this.setHeritageLayerVisible(true);
      this.displayMode = 'normal';
    }
  }

  setChoroplethData(data: Record<string, number>): void {
    this.choroplethData = { ...data };
    // 行政热力图模式下刷新图层样式
    if (this.displayMode === 'choropleth' && this.choroplethLayer) {
      this.choroplethLayer.changed();
    }
  }

  /** 创建并挂载行政热力图图层（基于市界 GeoJSON） */
  private setupChoroplethLayer(): void {
    if (!this.map || !this.choroplethBoundary) return;
    this.disposeChoroplethLayer();
    const source = new VectorSource({
      features: new GeoJSON().readFeatures(this.choroplethBoundary, {
        featureProjection: 'EPSG:3857',
      }),
    });
    this.choroplethLayer = new VectorLayer({
      source,
      style: (feature) => this.choroplethStyle(feature as Feature),
    });
    this.map.addLayer(this.choroplethLayer);
  }

  /** 移除并销毁行政热力图图层 */
  private disposeChoroplethLayer(): void {
    if (this.choroplethLayer && this.map) {
      this.map.removeLayer(this.choroplethLayer);
    }
    this.choroplethLayer = null;
    this.hoveredCity = null;
  }

  /** 行政热力图样式：按城市数量计算填充色，hover 高亮描边 */
  private choroplethStyle(feature: Feature): Style {
    const props = (feature.get('_props') as Record<string, unknown>) ?? feature.getProperties();
    const cityName = (props['name'] as string) || '';
    const count = this.choroplethData[cityName] || 0;
    const maxCount = Math.max(1, ...Object.values(this.choroplethData));
    const fillColor = choroplethColor(count, maxCount);
    const isHovered = this.hoveredCity === cityName;

    return new Style({
      fill: new Fill({ color: fillColor }),
      stroke: new Stroke({
        color: isHovered ? '#8f2317' : '#ffffff',
        width: isHovered ? 2.5 : 1,
      }),
    });
  }

  destroy(): void {
    this.stopPickPoint();
    this.stopPulse();
    this.stopBirthAnimation();
    this.disposeClusterLayer();
    this.disposeHeatmapLayer();
    this.map?.setTarget(undefined);
    this.map = null;
  }

  /** 要素样式：隐藏(筛选不中) / 高亮(选中) / 分类样式（按几何类型渲染） */
  private buildStyle(feature: Feature): Style | Style[] {
    const props = (feature.get('_props') as Record<string, unknown>) ?? feature.getProperties();
    const geomType = feature.getGeometry()?.getType();
    // 图层标识：主图层 heritage / 用户数据集 user-* / 分析图层 buffer、route…
    const layerId = (feature.get('_layerId') as string) || (props['_layerId'] as string) || 'heritage';
    // 筛选只作用于该图层自己的条件：主图层的名录筛选不得隐藏缓冲区、
    // 寻访路线、用户上传图层等分析要素（否则这些图层会整层不可见）。
    const layerFilter = this.filters.get(layerId);
    if (layerFilter && !layerFilter(props)) return HIDDEN_STYLE;
    const color = (props['color'] as string) || '#1890ff';
    // 高亮（仅点要素放大）
    const id = props['id'];
    if (this.highlightId != null && String(id) === String(this.highlightId) && geomType === 'Point') {
      return buildHighlightStyles(this.pulsePhase, color, categoryGlyph(props['category'] as string));
    }
    // 用户数据集图层（user- 开头）→ 醒目的金色高亮样式，与主图层蓝色pin区分
    if (layerId && layerId.startsWith('user-') && geomType === 'Point') {
      return [
        // 外圈：半透明金色光晕
        new Style({
          image: new CircleStyle({
            radius: 16,
            fill: new Fill({ color: 'rgba(255, 193, 7, 0.25)' }),
            stroke: new Stroke({ color: 'rgba(255, 193, 7, 0.7)', width: 2 }),
          }),
        }),
        // 内圈：金色实心圆
        new Style({
          image: new CircleStyle({
            radius: 9,
            fill: new Fill({ color: 'rgba(255, 193, 7, 0.95)' }),
            stroke: new Stroke({ color: '#ffffff', width: 2.5 }),
          }),
        }),
      ];
    }
    // 空间分析图层：缓冲区 / 叠加范围 / 寻访路线 → 非遗主题线型（替代默认蓝橙）
    if (layerId === 'buffer') {
      if (geomType === 'Point') {
        return new Style({
          image: new CircleStyle({
            radius: 6,
            fill: new Fill({ color: '#b8352b' }),
            stroke: new Stroke({ color: '#fff8ec', width: 2.5 }),
          }),
        });
      }
      return new Style({
        stroke: new Stroke({ color: '#b8352b', width: 3, lineDash: [12, 8] }),
        fill: new Fill({ color: 'rgba(184,53,43,0.18)' }),
      });
    }
    if (layerId === 'overlay-poly') {
      return new Style({
        stroke: new Stroke({ color: '#2c5f8a', width: 2.2, lineDash: [9, 6] }),
        fill: new Fill({ color: 'rgba(44,95,138,0.12)' }),
      });
    }
    if (layerId === 'route') {
      return new Style({ stroke: new Stroke({ color: '#9c5b2e', width: 3.5 }) });
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
    const glyph = categoryGlyph(props['category'] as string);
    // 出生前完全隐藏（不占用样式缓存）
    if (birthScale <= 0) return HIDDEN_STYLE;
    // 尺寸量化到 5% 档位后复用 Style：
    // 185 个点位在平移/脉冲/出生动画期间会被高频重绘，
    // 复用可把每帧数以百计的 Style+Icon 分配降到个位数。
    const band = Math.max(0.05, Math.round(birthScale * 20) / 20);
    const cacheKey = color + '|' + glyph + '|' + band;
    let cached = this.styleCache.get(cacheKey);
    if (!cached) {
      cached = new Style({
        image: new Icon({
          src: cachedSealIcon(color, glyph),
          width: 30 * band,
          height: 30 * band * SEAL_RATIO,
          anchor: [0.5, 1],
          anchorXUnits: 'fraction',
          anchorYUnits: 'fraction',
        }),
      });
      this.styleCache.set(cacheKey, cached);
    }
    return cached;
  }
}