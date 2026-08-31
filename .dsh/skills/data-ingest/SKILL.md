# Skill: data-ingest（数据接入）

## 适用场景
接入 Shapefile / GeoJSON / Excel / WMS 数据。

## 数据源与负责层
| 格式 | 前端 | 后端 | 备注 |
|---|---|---|---|
| GeoJSON | 直接 `ol/format/GeoJSON` 加载 | 可选静态托管 | 最简单，优先 |
| Shapefile | 上传 .shp/.dbf/.prj | 用 `shapefile`+`dbf` 等库转 GeoJSON | 浏览器读不了多文件 |
| Excel | 上传 .xlsx | 用 `xlsx` 读经纬度行→GeoJSON | 需指定经纬度列 |
| WMS | `ol/source/ImageWMS` / `TileWMS` | 可选代理解决跨域 | OGC 标准 |

## 后端接口草案（server/）
- `POST /api/convert/shp`：接收 shp 相关文件，返回 GeoJSON
- `POST /api/convert/excel`：接收 xlsx + 经纬度列名，返回 GeoJSON
- `GET /api/tianditu/:type`：天地图代理（见 tianditu-basemap）
- `GET /api/wms/proxy?url=`：（可选）WMS 跨域中转

## 数据层封装位置
- `src/data/sources/geojson.ts` / `shp.ts` / `excel.ts` / `wms.ts`
- 统一返回 `Feature[]` 或 GeoJSON，交给 `repository.ts` 缓存。

## 注意
- Excel 转要素需校验经纬度非空、范围合理（中国大陆约 lng 73–135, lat 3–54）。
- Shapefile 投影：优先转成 WGS84 再下发，避免前端再投影。
