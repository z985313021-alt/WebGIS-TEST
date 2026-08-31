# Skill: openlayers-api（OpenLayers 核心 API 调研笔记）

## 适用场景
用 OpenLayers 实现地图/图层/交互/分析时参考。基于官方文档整理。

## 官方文档入口
- 官网：https://openlayers.org/
- API：https://openlayers.org/en/latest/apidoc/
- 示例：https://openlayers.org/en/latest/examples/
- npm 包：`ol`（当前主流 7.x/8.x/9.x，本调研以最新稳定为准）

## 核心概念
| 概念 | 模块 | 说明 |
|---|---|---|
| Map | `ol/Map` | 地图容器，绑定 target(view DOM) + layers + view |
| View | `ol/View` | 中心点、缩放、投影（默认 EPSG:3857） |
| Layer | `ol/layer/{Tile,Vector,Image}` | 图层类型 |
| Source | `ol/source/{OSM,WMTS,Vector,ImageWMS}` | 数据来源 |
| Feature | `ol/Feature` | 矢量要素，含 geometry + attributes |
| Geometry | `ol/geom/{Point,LineString,Polygon}` | 几何 |
| Interaction | `ol/interaction/{Draw,Modify,Select,Snap}` | 交互 |
| Overlay | `ol/Overlay` | 弹窗/标注 HTML 锚定 |
| Control | `ol/control/{Zoom,ScaleLine,FullScreen}` | 控件 |
| Observable | `map.on('click'|'pointermove')` | 事件 |

## 常用片段
### 初始化
```ts
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';

new Map({
  target: 'map',
  layers: [new TileLayer({ source: new OSM() })],
  view: new View({ center: [0,0], zoom: 2 }),
});
```

### 矢量图层 + GeoJSON
```ts
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';

new VectorLayer({
  source: new VectorSource({
    url: '/data/x.geojson',
    format: new GeoJSON(),
  }),
});
```

### 绘制
```ts
import Draw from 'ol/interaction/Draw';
map.addInteraction(new Draw({ source, type: 'Polygon' }));
```

### 量算（球面）
- 距离：`ol/sphere.getDistance()`
- 面积：`ol/sphere.getArea()`

## 注意
- 本项目用 `MapAdapter` 封装上述细节，显示层不应散落 `ol/` import。
- WMTS 天地图见 tianditu-basemap 技能。
