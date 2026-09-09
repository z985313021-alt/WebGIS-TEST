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
  - `HomeMap.vue`：全屏 WebGIS 主页，内嵌左侧深色停靠轨、工作台抽屉（名录/空间分析/态势/时空演变）与右侧统计图表抽屉。
  - `DataManage.vue`：专题空间图层仓储、田野调查数据格式转换、空间数据体检报告。
  - `ChartView.vue`：非遗多维统计透视、门类分布饼图、地市柱状排行、公布批次递增趋势。
  - `TravelRoute.vue`：文化研学自驾路径规划（高德公路折线与天气）与 12306 高铁路线查询。
  - `Shop.vue` & `AdminShop.vue`：文创衍生品展示、购物车结算与管理员文创商品维护后台。
  - `BigScreen.vue`：全屏数字孪生文化展陈态势大屏。
  - `HeritageDetail.vue`：单项非遗全要素详情、多媒体相册、传承人联动与研学评论。
  - `Profile.vue` & `MyOrders.vue`：个人中心资料修改、省市区三级联动地址簿、文创订单跟踪。
  - `AuthPage.vue`：用户登录与注册页面。

### 2.2 逻辑层（Service Layer）
- **状态管理 (`src/services/stores/`)**：
  - `dataStore.ts`：185 项非遗数据集管理、多条件组合筛选（地市/类别/批次/关键字）、用户挂载图层管理。
  - `mapStore.ts`：地图图层态势模式（标准单点 / 动态聚类 Cluster / 空间密度热力 Heatmap）、底图数据源（高德 / 天地图 / OSM / 白模）。
  - `userStore.ts`：登录态与 Token 缓存、个人资料、管理员权限判断、退出登录。
  - `cartStore.ts`：文创购物车计数与列表同步。
- **空间计算与适配器**：
  - `OLMapAdapter.ts`：OpenLayers 核心逻辑适配器，屏蔽地图底层实现差异。
  - `src/services/analysis/`：基于 `ol/sphere` 与 `turf.js` 的距离量算、面积量算、空间缓冲区、空间相交叠置统计。

### 2.3 数据层（Data Layer）
- `src/data/http.ts`：基于 Axios 封装的统一 HTTP 客户端，拦截 401 认证失效，自动附带 Bearer Token。
- `src/data/api/`：分模块接口定义（`auth.ts`, `shop.ts`, `interact.ts`, `convert.ts`）。

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
- `POST /api/shop/orders`：结算下单（受 SQLite 事务保护，自动原子扣减库存）。
- `GET /api/shop/orders`：查看我的文创订单列表。
- `POST /api/shop/orders/:orderNo/pay`：订单模拟支付。
- `GET /api/admin/shop/products`：管理员获取全量商品（含下架商品）。
- `POST /api/admin/shop/products`：管理员发布新文创商品。
- `PUT /api/admin/shop/products/:id`：管理员编辑文创商品信息与库存。
- `DELETE /api/admin/shop/products/:id`：管理员下架/删除商品。

### 3.3 研学社区互动
- `GET /api/likes/:itemId`：获取指定非遗项目的累计点赞数。
- `POST /api/likes/:itemId`：对非遗项目点赞 +1。
- `GET /api/comments/:itemId`：获取指定非遗项目的研学评论列表。
- `POST /api/comments/:itemId`：发表研学评论留言。

### 3.4 高德地理服务代理（后端安全代理，不泄露 Key）
- `GET /api/amap/inputtips?keywords=...&city=山东`：高德智能输入提示（限定山东省域）。
- `GET /api/amap/weather?city=...`：高德城市实况气象与温湿度。
- `GET /api/amap/direction/driving?origin=...&destination=...&waypoints=...`：高德公路驾车轨迹规划，返回真实路网折线坐标点串。

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
