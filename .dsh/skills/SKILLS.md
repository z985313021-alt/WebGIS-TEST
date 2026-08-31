# WebGIS 项目 — 本地技能手册（Local Skills）

> 本目录是为「Vue3 + OpenLayers 通用 WebGIS 实习项目」挂载的局部技能集。
> 用途：让 AI 代理与团队成员在每次开发前读取对应技能，保持架构/规范一致。
> 读取方式：开发前根据任务类型打开对应 `SKILL.md`；本索引用于快速定位。

## 技能清单

| 技能名 | 文件 | 何时使用 |
|---|---|---|
| project-context | `project-context/SKILL.md` | 任何开发前先读，了解项目背景与分层架构 |
| architecture-layers | `architecture-layers/SKILL.md` | 新增模块/页面/服务时，确保数据/逻辑/显示层分离 |
| tianditu-basemap | `tianditu-basemap/SKILL.md` | 接入或调试天地图 WMTS 底图 |
| openlayers-api | `openlayers-api/SKILL.md` | 使用 OpenLayers 实现地图/图层/交互/分析 |
| data-ingest | `data-ingest/SKILL.md` | shp/geojson/excel/WMS 数据接入与后端解析 |
| spatial-analysis | `spatial-analysis/SKILL.md` | 量算/缓冲区/查询/叠加统计/勾画 |
| feishu-log | `feishu-log/SKILL.md` | 每次开发改动后写飞书开发日志 |
| git-collab | `git-collab/SKILL.md` | Git/GitHub 分支、提交、PR 协作 |
| cesium-demo | `cesium-demo/SKILL.md` | 最后阶段的 Cesium 3D 视觉演示（暂未启用） |

## 使用纪律
1. 任何代码改动前，先读 `project-context` 与对应技能。
2. 严格三层分离：显示层禁止直接写数据请求，逻辑层不直接操作 DOM。
3. 每次改动**必须**按 `feishu-log` 规范留痕（哪怕只是调试）。
4. 主文档 `docs/DEV_PLAN.md` 与本章节保持同步更新。
