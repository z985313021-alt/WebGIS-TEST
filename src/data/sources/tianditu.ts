// 数据层：天地图 DataServer XYZ 源封装（标准 Web Mercator 网格，与 OSM 同投影可无缝切换）
// tk 由后端 /api/tianditu/xyz 代理拼接，前端不持有密钥。
// 后端 /api/tianditu/status 返回 tk 是否配置；未配置时退回 OSM 占位。
// 说明：天地图 WMTS 只有 w(4326)/c(4490) 地理坐标集，瓦片非正方形，OpenLayers
// 按正方形瓦片算行列号会整体北移一倍（表现为定位到北极附近）；改用 DataServer
// XYZ（标准 3857 网格）后与 OSM 完全一致，无此问题。
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import XYZ from 'ol/source/XYZ';

export type BaseMapType = 'vec' | 'img';
export type BaseMapProvider = 'tianditu' | 'osm';

const TDT_TYPE: Record<BaseMapType, string> = { vec: 'vec_w', img: 'img_w' };

function createTiandituLayer(type: BaseMapType): TileLayer {
  return new TileLayer({
    source: new XYZ({
      url: `/api/tianditu/xyz/${TDT_TYPE[type]}/{z}/{x}/{y}`,
      maxZoom: 18,
    }),
  });
}

/**
 * 天地图注记图层（cva_w DataServer）：叠加在矢量底图上，显示中文城市名、道路名、POI 等标注。
 * OSM 底图自带英文标注，无需此层。
 */
export function createTiandituLabelLayer(): TileLayer {
  return new TileLayer({
    source: new XYZ({
      url: '/api/tianditu/xyz/cva_w/{z}/{x}/{y}',
      maxZoom: 18,
    }),
  });
}

/**
 * 创建底图图层。
 * @param provider tianditu（天地图 DataServer XYZ）或 osm（OpenStreetMap）
 * @param type 底图类型（仅天地图生效：vec 矢量 / img 影像）
 */
export function createBaseMapLayer(type: BaseMapType = 'vec', provider: BaseMapProvider = 'osm'): TileLayer {
  if (provider === 'tianditu') return createTiandituLayer(type);
  return new TileLayer({ source: new OSM() });
}
