# Skill: architecture-layers（分层架构规范）

## 适用场景
新建页面、组件、服务、store、数据接口时，确保三层清晰分离。

## 目录约定
```
src/
  config/        # 常量配置：天地图 URL 模板、后端 BASE_URL、图层默认样式
  data/          # 数据层
    http.ts          # axios 实例（仅此文件可配 baseURL/拦截器）
    sources/         # 各数据源适配：tianditu.ts / geojson.ts / shp.ts / wms.ts / excel.ts
    repository.ts    # 已加载图层/要素的仓储（读数据层，被逻辑层用）
  services/      # 逻辑层（纯业务逻辑，不碰 DOM）
    map/             # MapAdapter 接口 + OLMapAdapter 实现
    analysis/        # 量算/缓冲区/查询/叠加统计
    draw/            # 勾画服务
    chart/           # 图表联动逻辑
    stores/          # Pinia stores（mapStore / dataStore / uiStore ...）
  components/    # 显示层-复用组件
    map/             # MapContainer / LayerPanel / BaseMapSwitch / DrawToolbar
    panels/          # 可折叠面板封装（统一折叠行为）
    chart/           # ECharts 封装
  views/         # 显示层-页面（路由级）
    HomeMap.vue / DataManage.vue / Analysis.vue / ChartView.vue / About.vue
  router/index.ts # 顶部导航路由
```

## 依赖方向（硬性）
显示层 → 逻辑层 → 数据层 → 后端/外部服务
（反向禁止：数据层不得 import 显示层；逻辑层不得 import 组件）

## 新增模块检查清单
- [ ] 数据获取是否只在 `data/`？
- [ ] 业务状态是否进 Pinia store？
- [ ] 组件是否只通过 store/服务拿数据，不自己发请求？
- [ ] 地图操作是否走 `MapAdapter` 接口？
- [ ] 是否已在飞书留痕？
