// 数据层：天地图 WMTS 源封装
// 注意：tk 由后端 /api/tianditu 代理，前端不直接持有密钥。
// 阶段：先返回 OSM 占位（无需 tk），tk 就绪后切到 WMTS 实现。
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import { get as getProjection } from 'ol/proj';

export type BaseMapType = 'vec' | 'img';

/**
 * 创建底图图层。当前返回 OSM 占位；
 * tk 配置后改为 ol/source/WMTS 调用 /api/tianditu 代理。
 */
export function createBaseMapLayer(type: BaseMapType = 'vec'): TileLayer {
  // TODO: 接入 WMTS（见 .dsh/skills/tianditu-basemap）
  void getProjection; // 保留投影引用占位
  void type;
  return new TileLayer({ source: new OSM() });
}
