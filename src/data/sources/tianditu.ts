// 数据层：天地图 WMTS 源封装
// tk 由后端 /api/tianditu 代理拼接，前端不持有密钥。
// 后端 /api/tianditu/status 返回 tk 是否配置；未配置时退回 OSM 占位。
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import WMTS from 'ol/source/WMTS';
import WMTSTileGrid from 'ol/tilegrid/WMTS';

export type BaseMapType = 'vec' | 'img';

// 天地图 w 集（EPSG:4326）瓦片矩阵：z 0-17
const TDT_RESOLUTIONS: number[] = [];
const TDT_MATRIX_IDS: string[] = [];
for (let z = 0; z < 18; z += 1) {
  TDT_RESOLUTIONS.push(1.40625 / 2 ** z);
  TDT_MATRIX_IDS.push(String(z));
}

const TDT_LAYER: Record<BaseMapType, string> = { vec: 'vec', img: 'img' };
const TDT_TYPE: Record<BaseMapType, string> = { vec: 'vec_w', img: 'img_w' };

function createTiandituLayer(type: BaseMapType): TileLayer {
  const source = new WMTS({
    url: `/api/tianditu/${TDT_TYPE[type]}`,
    layer: TDT_LAYER[type],
    matrixSet: 'w',
    format: 'tiles',
    style: 'default',
    projection: 'EPSG:4326',
    tileGrid: new WMTSTileGrid({
      origin: [-180, 90],
      resolutions: TDT_RESOLUTIONS,
      matrixIds: TDT_MATRIX_IDS,
    }),
    wrapX: true,
  });
  return new TileLayer({ source });
}

/**
 * 创建底图图层。
 * @param useTianditu 后端 tk 已配置时 true，用天地图 WMTS；否则 OSM 占位
 */
export function createBaseMapLayer(type: BaseMapType = 'vec', useTianditu = false): TileLayer {
  if (useTianditu) return createTiandituLayer(type);
  return new TileLayer({ source: new OSM() });
}
