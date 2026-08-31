# Skill: spatial-analysis（空间分析）

## 适用场景
实现量算、缓冲区、属性查询、叠加统计、勾画。用户要求"都要有"，但不必如 ArcGIS 强大。

## 功能清单与实现建议（OpenLayers 生态）
| 功能 | 实现 | 说明 |
|---|---|---|
| 测距 | `ol/sphere.getDistance` + Draw(LineString) | 累加分段距离 |
| 测面 | `ol/sphere.getArea` + Draw(Polygon) | 球面面积 |
| 逆地理/坐标查询 | 点击地图→经纬度→（可选）逆地理 API | 后端代理防 key 泄露 |
| 属性查询+高亮 | 按字段筛选 Feature，setStyle 高亮 | 配合 Element Plus 表单 |
| 缓冲区 | `ol/sphere` 或 `Turf.js` `buffer` | 推荐 Turf.js，简单可靠 |
| 叠加统计 | 判断点是否在面内（Turf `booleanPointInPolygon`）计数 | 区域内要素统计 |
| 勾画/标注 | Draw + Modify + Snap + 导出 GeoJSON | 用户要求"适量勾画"，后续详谈细化 |

## 依赖建议
- 引入 `turf.js`（@turf/turf 或按需）做缓冲区/叠加，避免手写几何算法。
- 量算用 OpenLayers 自带 `ol/sphere`，无需额外库。

## 服务位置
- `src/services/analysis/`：measure.ts / buffer.ts / query.ts / overlay.ts
- `src/services/draw/`：draw.ts（勾画）
- 暴露方法给显示层面板调用，结果进 Pinia store 以便图表联动。

## 注意
- 缓冲区距离单位默认米；UI 需让用户选单位。
- 大数据量叠加统计注意性能，可后端做（后续评估）。
