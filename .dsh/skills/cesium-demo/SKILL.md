# Skill: cesium-demo（Cesium 3D 视觉演示）— 暂未启用

## 适用场景
项目最后阶段，用 Cesium 做 3D 视觉优化演示。**当前阶段不展开**（用户暂不了解）。

## 已知约束
- 基本找不到城市模型（3D Tiles）或地形高程数据。
- 因此 Cesium 只做"轻量视觉演示"，不依赖外部模型/地形数据。

## 暂定演示范围（待定）
- 3D 地球 + 天地图影像底图（Cesium 也支持 WMTS/影像层）。
- 经纬度标注点（用用户已有 GeoJSON 点数据即可，无需模型）。
- 一个「2D ↔ 3D 切换」演示页，证明引擎可切换。

## 官方文档入口（调研阶段再细读）
- 官网：https://cesium.com/platform/cesiumjs/
- 教程：https://cesium.com/learn/cesiumjs-learn/
- API：https://cesium.com/learn/cesiumjs/ref-doc/
- 注意：Cesium Ion 默认需要 token；若只用自有底图可不依赖 Ion。

## 激活条件
用户确认 Cesium 范围、且主功能（OpenLayers 全栈）完成后再启用本技能。
