# Skill: tianditu-basemap（天地图底图接入）

## 适用场景
接入、切换、调试天地图 WMTS 底图。

## 关键事实
- 天地图使用 **WMTS** 协议，需 `tk`（密钥）。申请：http://lbs.tianditu.gov.cn
- **tk 绝不能进前端代码**（会暴露给所有访客）。必须由后端 `server/` 代理/签名中转。
- 常用图层类型：
  - 矢量底图：`vec_w`（经纬度）
  - 影像底图：`img_w`
  - 注记：`cva_w`（矢量注记）/ `cia_w`（影像注记）
- 坐标系：WGS84（EPSG:4326），OpenLayers 默认是 EPSG:3857，需设置 View 的 projection 或做偏移。

## 接入步骤（OpenLayers）
1. 后端提供代理接口，如 `GET /api/tianditu/{type}` 内部拼接 tk 后回源 WMTS。
2. 前端 `data/sources/tianditu.ts` 封装 WMTS source（使用 `ol/source/WMTS` + `ol/tilegrid/WMTS`）。
3. `MapAdapter` 暴露 `setBaseMap(type)` 切换矢量/影像+注记。

## 调试注意
- 瓦片 403：tk 失效或后端代理漏参。
- 偏移：投影不匹配，确认 View projection 与瓦片一致。
- 注记层需与底图叠加，opacity 默认 1。

## 占位符
当前 tk 用 `{{TIANDITU_TK}}` 占位，待用户提供后填入后端环境变量 `.env`。
