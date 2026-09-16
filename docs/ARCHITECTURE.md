# 「遗蕴齐鲁」WebGIS 平台 · 系统架构与接口规范 (Architecture & API)

---

## 1. 系统整体架构

平台采用**现代化前后端分离的 SPA 单页 WebGIS 架构**：

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             前端用户界面层 (SPA)                              │
│  Vue 3 + Vite + TypeScript + Pinia + Element Plus + OpenLayers 2D + ECharts │
└───────────────────────────────────────┬─────────────────────────────────────┘
                                        │ RESTful API / JSON
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           服务端应用层 (Express.js)                           │
│  · 身份认证与会话管理 (Auth & Sessions)                                        │
│  · 文创商城与订单事务 (Shop & Order Transactions)                             │
│  · 研学社区点赞留言 (Likes & Comments)                                        │
│  · 高德开放平台天气 / 地理联想安全代理 (AMap API Proxy)                          │
│  · 天地图密钥中转与瓦片代理 (Tianditu WMTS Proxy)                              │
│  · 空间数据转换与体检 (Shapefile / Excel / GeoJSON Convert & Health Check)     │
│  · 12306 高铁票务及经停站中转 (Train Route & Stops API)                       │
└───────────────────┬─────────────────────────────────────┬───────────────────┘
                    │                                     │
                    ▼                                     ▼
      ┌───────────────────────────┐         ┌───────────────────────────┐
      │     SQLite 关系型数据库    │         │      空间地理矢量资产     │
      │   (Node 内置 node:sqlite) │         │       (GeoJSON / JSON)    │
      │  · users.db (用户/地址)   │         │  · 185 项国家级非遗点位   │
      │  · shop.db (文创/订单)    │         │  · 16 地市行政边界拓扑   │
      │  · interact.db (互动留言) │         │  · 全省自驾干线路网骨架   │
      └───────────────────────────┘         └───────────────────────────┘
```

---

## 2. 前端架构与模块划分

前端严格遵守三层架构职责边界：

### 2.1 显示层（Presentation Layer）
- **页面路由 (`src/views/`)**：
  - `HomeMap.vue`：全屏 WebGIS 主页，内嵌左侧深色停靠轨、工作台抽屉（名录/空间分析/态势/时空演变）、右侧统计图表抽屉、右下角鹰眼图（OverviewMap）与全套微圆角地图控件套件。
  - `DataManage.vue`：三栏式空间数据治理工作台（规范与 4-Sheet 模板下载 / 空间数据格式转换 / 空间健康体检与 OGC WMS 探测）。
  - `ChartView.vue`：非遗多维统计透视、门类分布饼图、地市柱状排行、公布批次递增趋势。
  - `TravelRoute.vue`：文化研学自驾路径规划（高德公路折线与天气）与 12306 高铁路线查询。
  - `Shop.vue` & `AdminShop.vue`：文创衍生品展示、购物车结算与管理员文创商品维护后台。
  - `BigScreen.vue`：全屏数字孪生文化展陈态势大屏（文字排布与自适应排版深度修润）。
  - `HeritageDetail.vue`：单项非遗全要素详情、多媒体相册、传承人联动与研学评论；页面为「图片 + 详细信息（合并为一张卡）｜空间位置地图」的等高双栏布局，无需跳回主页即可查看该项目的空间位置。
  - `Profile.vue` & `MyOrders.vue`：个人中心资料修改、省市区三级联动地址簿、文创订单跟踪（支持实时空间物流轨迹滑出追踪）。
  - `AuthPage.vue`：用户登录与注册页面。
- **公共与地图控件组件 (`src/components/`)**：
  - `map/MapControls.vue`：国风微圆角地图控件套件（比例尺 ScaleLine、指北针复位、实时 Zoom 级别显示、全省全貌视口重置、鼠标实时经纬度坐标）。
  - `map/ClusterPopup.vue`：密集点位聚合交互浮层（点击聚合簇展示所含非遗清单，支持穿透定位高亮）。
  - `map/HeritageMiniMap.vue`：详情页内嵌空间位置小地图（独立轻量 OLMapAdapter，加载省界/市界与同城点位，当前项目朱砂印章脉冲高亮，点击同城点位可切换详情）。
  - `shop/LogisticsTrack.vue`：订单物流抽屉（真实高德自驾路网轨迹折线 + 货运节点空间分布）。

### 2.2 逻辑层（Service Layer）
- **状态管理 (`src/services/stores/`)**：
  - `dataStore.ts`：185 项非遗数据集管理、多条件组合筛选（地市/类别/批次/关键字）、用户挂载图层管理与自适应视角边界计算。
  - `mapStore.ts`：地图图层态势模式（标准单点 / 动态聚类 Cluster / 空间密度热力 Heatmap）、底图数据源（高德 / 天地图 / OSM / 白模）。
  - `userStore.ts`：登录态与 Token 缓存、个人资料、管理员权限判断、退出登录。
  - `cartStore.ts`：文创购物车计数与列表同步。
- **空间计算、物流与适配器**：
  - `OLMapAdapter.ts`：OpenLayers 核心逻辑适配器（屏蔽底层细节）。点位以「非遗印章」渲染——门类传统色印面 + 一门一字（戏/乐/舞/曲/技/画/艺/医/俗/文）+ 落点尖角，并按色·字·尺寸档位缓存图标与 Style；选中态为朱砂涟漪扩散 + 金色聚焦环呼吸 + 印章放大（相位驱动重绘，取消选中即停表）；另提供鹰眼图集成、胶囊绘制取点模式（`startPickPoint`）、图层自适应范围平滑飞越与容器尺寸自适应（`updateSize`）。
  - `src/services/logistics/logistics.ts`：订单物流空间轨迹服务，解析起终点并联动高德路线规划绘制公路折线。
  - `src/services/analysis/`：基于 `ol/sphere` 与 `turf.js` 的距离量算、面积量算、空间缓冲区、空间相交叠置统计。缓冲区支持三种中心点来源（非遗名录点位 / 地图任意拾取点 / 高德地址检索），结果输出范围内非遗清单并支持二次检索与点击定位。
  - `src/services/geo/coord.ts`：坐标系转换工具（GCJ-02 ↔ WGS84）。高德开放平台返回 GCJ-02，而底图为 WGS84，凡「地址→坐标」「坐标→地址」的往返均需经此转换，避免数百米级偏移。

### 2.3 数据层（Data Layer）
- `src/data/http.ts`：基于 Axios 封装的统一 HTTP 客户端，拦截 401 认证失效，自动附带 Bearer Token。
- `src/data/api/`：分模块接口定义（`auth.ts`, `shop.ts`, `interact.ts`, `convert.ts` 包含模板下载/体检报告导出/WMS探测）。

---

## 3. 服务端核心 API 清单

服务端运行在 Node.js 环境，端口默认为 `3001`，通过 Vite 开发服务器反向代理 `/api`。

### 3.1 身份认证与个人中心
- `POST /api/auth/register`：新用户注册（用户名、邮箱、密码，自动 scrypt 加密）。
- `POST /api/auth/login`：用户登录，验证成功颁发会话 Token。
- `GET /api/auth/me`：获取当前登录用户的资料（支持游客态返回）。
- `POST /api/auth/logout`：注销当前会话。
- `POST /api/auth/change-pwd`：修改当前账户密码。
- `PUT /api/auth/profile`：更新用户昵称、手机号、头像。
- `GET /api/auth/addresses`：获取当前用户的收货地址簿。
- `POST /api/auth/addresses`：新增收货地址。
- `PUT /api/auth/addresses/:id`：修改指定收货地址。
- `DELETE /api/auth/addresses/:id`：删除指定收货地址。
- `POST /api/auth/addresses/:id/default`：设为默认收货地址。

### 3.2 文创电商与后台管理
- `GET /api/shop/products`：获取文创在售商品列表（支持按门类/关键字筛选）。
- `GET /api/shop/cart`：获取当前用户的购物车明细。
- `POST /api/shop/cart`：将指定文创商品加入购物车。
- `PUT /api/shop/cart/:productId`：更新购物车中商品数量。
- `DELETE /api/shop/cart/:productId`：从购物车移除商品。
- `POST /api/shop/orders`：结算下单（SQLite 事务保护，原子扣减库存并写入 60 秒支付时限）。
- `GET /api/shop/orders`：查看我的文创订单列表（附带 `expiresAt` 与 `remainSeconds` 供前端倒计时）。
- `POST /api/shop/orders/:orderNo/pay`：订单模拟支付。
- `POST /api/shop/orders/:orderNo/cancel`：取消订单并回补库存。
- `POST /api/shop/orders/:orderNo/confirm`：确认收货。
- `GET /api/shop/orders/admin`：管理员查看全量订单。
- `POST /api/shop/orders/:orderNo/ship`：管理员发货并登记快递单号。
- `POST /api/shop/products`：管理员发布新文创商品。
- `PUT /api/shop/products/:id`：管理员编辑商品信息、库存与上/下架状态（`onSale`）。
- `DELETE /api/shop/products/:id`：管理员删除商品。
- `GET /api/shop/products` / `GET /api/shop/products/:id` / `GET /api/shop/categories` / `GET /api/shop/flow`：公开的商品与门类查询接口。

> **抢购模式（限时锁库存）**：`POST /api/shop/orders` 在下单瞬间扣减库存并写入 `expires_at`；
> 服务端启动时注册每 5 秒一次的超时扫描（`startExpireScanner`），把超时未支付的订单批量取消并回补库存；
> 前端 `MyOrders.vue` 依据 `remainSeconds` 实时倒计时，剩余 ≤15 秒红色闪烁，归零自动刷新列表。

### 3.3 研学社区互动
- `GET /api/likes/:itemId`：获取指定非遗项目的累计点赞数。
- `POST /api/likes/:itemId`：对非遗项目点赞 +1。
- `GET /api/comments/:itemId`：获取指定非遗项目的研学评论列表。
- `POST /api/comments/:itemId`：发表研学评论留言。

### 3.4 高德地理服务代理（后端安全代理，不泄露 Key）
- `GET /api/amap/inputtips?keywords=...&city=山东`：高德智能输入提示（限定山东省域）。
- `GET /api/amap/weather?city=...`：高德城市实况气象与温湿度。
- `GET /api/amap/direction/driving?origin=...&destination=...&waypoints=...`：高德公路驾车轨迹规划，返回真实路网折线坐标点串。
- `GET /api/amap/geocode?address=...&city=...`：地理编码（结构化地址 → GCJ-02 经纬度），供空间分析「按地址生成缓冲区」使用。
- `GET /api/amap/regeo?location=lng,lat`：逆地理编码（坐标 → 结构化地址），用于地图拾取点回显所在地。

### 3.5 空间数据格式转换与体检
- `POST /api/convert/shp`：上传 Shapefile 压缩包/多文件，转换为 GeoJSON 格式。
- `POST /api/convert/excel`：上传带经纬度列的 Excel，转换为带属性与几何的 GeoJSON。
- `POST /api/health-check`：对上传的矢量数据集进行空间坐标、空值与重复值健康体检。

### 3.6 12306 铁路线网与票务
- `GET /api/train/stations?q=...`：车站搜索。
- `GET /api/train/tickets?from=...&to=...&date=...`：车次与余票查询。
- `GET /api/train/prices?from=...&to=...&date=...`：车次各席别票价查询。
- `GET /api/train/stops?trainNo=...`：经停站与各站经纬度地理坐标。

---

## 4. 路由门禁与游客免登录策略 (Guest Mode)

为提升开放文化遗产平台的传播体验，系统全面实行**游客免登录浏览策略**（在 `src/router/guard.ts` 中实现）：

1. **完全开放免登录页面**：
   - 地图主页 `/`（含左侧名录检索、空间分析抽屉、时空演变滑块、图层聚类与热力）
   - 图表可视化研学大屏 `/chart`
   - 自驾与高铁研学路线 `/travel`
   - 数据资产与田野调查工作台 `/data`
   - 文创商城展厅 `/shop`
   - 态势大屏 `/screen`
   - 非遗详细资料与图片相册 `/heritage/:id`
   - 关于页面 `/about`
2. **需要登录拦截的边界**：
   - 仅在用户进行实质性持久化个人操作（进入个人中心 `/profile`、提交订单结算 `/shop/checkout`、查看我的订单 `/orders`、进入管理员文创后台 `/admin-shop`）时，系统才提示并重定向至 `/login`。
