# 「遗蕴齐鲁」WebGIS 平台 · 数据库架构与数据资产全景规范

本文档为平台服务端持久化数据库、空间矢量资产与数据字典的权威规范。

---

## 1. 架构总览

平台服务端采用 **Node.js 内置轻量高性能数据库引擎 `node:sqlite` (`DatabaseSync`)**（Node.js ≥ 22.5 原生支持，本机 Node v25+），无需任何 node-gyp 原生 C++ 编译链依赖即可跨平台零配置运行。

数据按照**业务关注点与读写隔离**原则，划分为 **3 个独立的 SQLite 数据库文件**（统一存储于 `server/data/` 目录），并与空间地理 GeoJSON 资产协同支撑 WebGIS 运行：

```
server/data/
├── users.db        # 1. 用户中心与身份认证库（3 张表）
├── shop.db         # 2. 非遗全景资产与文创电商库（5 张表）
├── interact.db     # 3. 文化研学社区与互动库（2 张表）
├── heritage.geojson # 齐鲁 185 项国家级非遗标准空间矢量资产
├── inheritors.geojson # 国家级非物质文化遗产代表性传承人空间点位
├── shandong.json   # 山东省 16 地市行政区划拓扑边界
└── roads.json      # 全省骨干路网拓扑数据
```

---

## 2. 数据库与数据表详细字典

### 2.1 用户中心数据库：`users.db`

管理全站用户账号、密码哈希加盐认证、会话状态以及收货地址簿。

#### 表 1：`users`（用户账户表）
存储注册用户的核心身份与个人资料信息。

| 字段名 | 数据类型 | 约束 | 默认值 | 业务作用与说明 |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | PRIMARY KEY AUTOINCREMENT | 自增 | 用户唯一标识 |
| `username` | `TEXT` | NOT NULL UNIQUE | - | 登录用户名（2~20位字母/数字/下划线/中文） |
| `email` | `TEXT` | NOT NULL UNIQUE | - | 电子邮箱，全局唯一 |
| `password_hash`| `TEXT` | NOT NULL | - | 加密存储，格式为 `盐(16字节Hex):scrypt哈希(64字节Hex)` |
| `role` | `TEXT` | NOT NULL | `'user'` | 用户角色：`user`（普通用户）或 `admin`（系统管理员） |
| `nickname` | `TEXT` | - | `''` | 个人昵称（支持个性化展示，上限 30 字） |
| `phone` | `TEXT` | - | `''` | 绑定手机号（中国大陆 11 位手机格式） |
| `avatar_url` | `TEXT` | - | `''` | 头像 URL 或首字矢量头像标识 |
| `created_at` | `TEXT` | NOT NULL | `datetime('now', 'localtime')` | 注册时间戳 |

#### 表 2：`sessions`（登录会话凭证表）
维持客户端与服务端的认证状态。

| 字段名 | 数据类型 | 约束 | 默认值 | 业务作用与说明 |
| :--- | :--- | :--- | :--- | :--- |
| `token` | `TEXT` | PRIMARY KEY | - | 32 字节安全随机 Hex 令牌 |
| `user_id` | `INTEGER` | NOT NULL | - | 外键关联 `users(id)` |
| `created_at` | `TEXT` | NOT NULL | `datetime('now', 'localtime')` | 登录产生时间戳 |

> 索引：`idx_sessions_user` 建立在 `user_id`，加速会话检索与注销失效。

#### 表 3：`addresses`（收货地址簿表）
支撑个人中心与文创商城下单结账的多地址管理，支持省市区三级联动。

| 字段名 | 数据类型 | 约束 | 默认值 | 业务作用与说明 |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | PRIMARY KEY AUTOINCREMENT | 自增 | 地址项编号 |
| `user_id` | `INTEGER` | NOT NULL | - | 外键关联 `users(id)` |
| `receiver` | `TEXT` | NOT NULL | - | 收货人姓名（1~30 字） |
| `phone` | `TEXT` | NOT NULL | - | 收货联系电话（11 位格式校验） |
| `region` | `TEXT` | - | `''` | 级联行政区划，格式如 `山东省 / 济南市 / 历下区` |
| `detail` | `TEXT` | NOT NULL | - | 详细门牌街道（自适应高度输入，上限 100 字） |
| `is_default` | `INTEGER`| NOT NULL | `0` | 是否默认地址（`1` 是 / `0` 否，设默认时自动排他） |
| `created_at` | `TEXT` | NOT NULL | `datetime('now', 'localtime')` | 添加时间 |

---

### 2.2 非遗文创电商数据库：`shop.db`

管理国家级非遗基础信息底表、文创衍生商品、购物车以及交易订单。

#### 表 4：`heritage`（非遗项目空间底表）
由 `server/data/heritage.geojson` 启动时自动全量播种（Seeded），作为文创商品关联溯源的宿主数据。

| 字段名 | 数据类型 | 约束 | 默认值 | 业务作用与说明 |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | PRIMARY KEY | - | 对应非遗原始编码 ID（1 ~ 185） |
| `name` | `TEXT` | NOT NULL | - | 非物质文化遗产代表性项目名称 |
| `category` | `TEXT` | - | - | 十大门类（传统技艺/美术/戏剧/民间文学等） |
| `city` | `TEXT` | - | - | 所属地级市（如 济南市、青岛市、菏泽市等） |
| `district` | `TEXT` | - | - | 区县名称 |
| `area` | `TEXT` | - | - | 申报地区 / 保护属地 |
| `protect_unit` | `TEXT` | - | - | 代表性保护单位 |
| `year` | `INTEGER` | - | - | 公布列入年份（2006、2008、2011、2014、2021 等） |
| `code` | `TEXT` | - | - | 国家级项目申报编码（如 Ⅰ-1, Ⅷ-14 等） |
| `type` | `TEXT` | - | - | 项目类型标识 |
| `province` | `TEXT` | - | - | 所属省份（山东省） |
| `photo` | `TEXT` | - | - | 默认展陈图片路径或图片库映射 |
| `lng` | `REAL` | - | - | WGS84 经度坐标（十进制度） |
| `lat` | `REAL` | - | - | WGS84 纬度坐标（十进制度） |

#### 表 5：`products`（文创衍生商品表）
非遗 IP 数字化转化商品名录，支持后台管理员维护商品属性、价格与库存。

| 字段名 | 数据类型 | 约束 | 默认值 | 业务作用与说明 |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | PRIMARY KEY AUTOINCREMENT | 自增 | 商品编号 |
| `heritage_id` | `INTEGER` | - | `NULL` | 外键关联 `heritage(id)`，建立文化溯源链接 |
| `category` | `TEXT` | - | - | 商品分类（典藏工艺、文房四宝、服饰染织、茶道雅器等） |
| `name` | `TEXT` | NOT NULL UNIQUE | - | 文创商品全称 |
| `subtitle` | `TEXT` | - | `''` | 宣传副标题 / 文化寓意说明 |
| `price` | `REAL` | NOT NULL | `0` | 商品标价（元） |
| `stock` | `INTEGER` | NOT NULL | `0` | 现有库存数量（下单扣减，取消回滚） |
| `image` | `TEXT` | - | - | 展示主图路径或 URL |
| `description` | `TEXT` | - | `''` | 详细工艺背景与规格说明 |
| `on_sale` | `INTEGER` | NOT NULL | `1` | 上架状态（`1` 在售 / `0` 暂下架） |
| `created_at` | `TEXT` | NOT NULL | `datetime('now', 'localtime')` | 创建时间 |

> 索引：`idx_products_heritage` 建立在 `heritage_id`。

#### 表 6：`cart`（购物车表）
用户添加的待结算文创选品。

| 字段名 | 数据类型 | 约束 | 默认值 | 业务作用与说明 |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | PRIMARY KEY AUTOINCREMENT | 自增 | 记录编号 |
| `user_id` | `INTEGER` | NOT NULL | - | 外键用户编号 |
| `product_id` | `INTEGER` | NOT NULL | - | 外键商品编号 |
| `qty` | `INTEGER` | NOT NULL | `1` | 选购数量 |
| `added_at` | `TEXT` | NOT NULL | `datetime('now', 'localtime')` | 选入时间 |

> 联合唯一约束：`UNIQUE(user_id, product_id)`，重复加购自动累加数量；索引 `idx_cart_user` 建立在 `user_id`。

#### 表 7：`orders`（文创交易订单主表）
管理商城订单全生命周期。

| 字段名 | 数据类型 | 约束 | 默认值 | 业务作用与说明 |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | PRIMARY KEY AUTOINCREMENT | 自增 | 订单自增主键 |
| `order_no` | `TEXT` | UNIQUE | - | 业务订单编号，如 `SD20260908xxxx` |
| `user_id` | `INTEGER` | NOT NULL | - | 下单用户编号 |
| `receiver` | `TEXT` | NOT NULL | - | 收货人姓名快照 |
| `phone` | `TEXT` | NOT NULL | - | 收件联系电话快照 |
| `address` | `TEXT` | NOT NULL | - | 完整收货地址快照（级联区域 + 详细门牌） |
| `total` | `REAL` | NOT NULL | `0` | 订单支付总金额（元） |
| `status` | `TEXT` | NOT NULL | `'pending'` | 状态：`pending`（待付款）、`paid`（待发货）、`shipped`（待收货）、`done`（已完成）、`cancelled`（已取消） |
| `tracking_no` | `TEXT` | - | `''` | 快递物流单号 |
| `remark` | `TEXT` | - | `''` | 买家下单留言 |
| `created_at` | `TEXT` | NOT NULL | `datetime('now', 'localtime')` | 订单生成时间 |
| `paid_at` | `TEXT` | - | `NULL` | 支付确认时间 |
| `shipped_at` | `TEXT` | - | `NULL` | 发货填单时间 |
| `done_at` | `TEXT` | - | `NULL` | 确认收货完成时间 |

> 索引：`idx_orders_user` 建立在 `user_id`。

#### 表 8：`order_items`（订单明细项快照表）
记录每张订单采购的具体文创商品快照（防范后续商品调价或下架影响历史账目）。

| 字段名 | 数据类型 | 约束 | 默认值 | 业务作用与说明 |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | PRIMARY KEY AUTOINCREMENT | 自增 | 明细项主键 |
| `order_id` | `INTEGER` | NOT NULL | - | 外键关联 `orders(id)` |
| `product_id` | `INTEGER` | - | - | 关联的原商品编号 |
| `product_name`| `TEXT` | NOT NULL | - | 下单时的商品名称快照 |
| `price` | `REAL` | NOT NULL | - | 下单时实际成交单价 |
| `qty` | `INTEGER` | NOT NULL | - | 购买件数 |
| `image` | `TEXT` | - | - | 商品缩略图快照 |

---

### 2.3 互动社区数据库：`interact.db`

管理非遗研学爱好者的点赞、口碑与互动留言数据。

#### 表 9：`likes`（点赞热度统计表）
记录每个非遗项目的公众好评赞数。

| 字段名 | 数据类型 | 约束 | 默认值 | 业务作用与说明 |
| :--- | :--- | :--- | :--- | :--- |
| `item_id` | `INTEGER` | PRIMARY KEY | - | 对应的非遗项目 ID |
| `count` | `INTEGER` | NOT NULL | `0` | 累计获赞总数 |

#### 表 10：`comments`（研学互动评论表）
提供非遗详情页与研学线路的留言交流支持。

| 字段名 | 数据类型 | 约束 | 默认值 | 业务作用与说明 |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | PRIMARY KEY AUTOINCREMENT | 自增 | 评论唯一编号 |
| `item_id` | `INTEGER` | NOT NULL | - | 所属非遗项目 ID |
| `nickname` | `TEXT` | NOT NULL | `'匿名'` | 留言展示昵称 |
| `content` | `TEXT` | NOT NULL | - | 留言正文内容（非空校验） |
| `created_at` | `TEXT` | NOT NULL | `datetime('now', 'localtime')` | 发表时间 |

> 索引：`idx_comments_item` 建立在 `item_id`，保证单项评论快速加载。

---

## 3. 空间地理矢量数据资产字典

除 SQLite 关系数据库外，平台的核心空间分析与地图呈现由以下标准 GeoJSON 驱动：

| 数据文件 | 存储路径 | 格式与要素量 | 核心属性与说明 |
| :--- | :--- | :--- | :--- |
| **国家级非遗点位** | `server/data/heritage.geojson`<br>`public/data/heritage.geojson` | Point 几何 (185 项) | `id`, `name`, `category`, `city`, `district`, `year`, `batch`, `lng`, `lat` —— 全站 2D/3D 地图点位主图层 |
| **国家级传承人点位** | `server/data/inheritors.geojson` | Point 几何 (70+ 项) | 传承人姓名、代表性项目、传习地坐标 |
| **山东 16 地市拓扑边界**| `src/data/sources/shandong-city-boundary.json` | MultiPolygon 几何 (16 城市) | `adcode`, `name`, `center`, 几何坐标 —— 用于行政区划着色、区域非遗空间计数统计 |
| **全省自驾路网骨架** | `server/data/roads.json` | MultiLineString (7.6 MB) | 齐鲁干线公路与旅游廊道拓扑线网，支撑本地路网分析与研学行程单生成 |

---

## 4. 数据库维护、事务与备份规则

1. **外键约束常开**：
   所有数据库连接初始化时，均严格执行 `PRAGMA foreign_keys = ON;`，确保级联约束有效，杜绝脏数据。
2. **订单与库存事务保护**：
   文创下单结算（`createOrder`）采用严格的 SQLite `BEGIN` / `COMMIT` / `ROLLBACK` 事务机制：
   - 检查商品实时库存（`stock >= qty`）；
   - 扣减商品库存（`stock = stock - qty`）；
   - 生成 `orders` 记录与 `order_items` 明细；
   - 清除当前用户购物车选购项；
   - 任何一步失败立即回滚，保证资金与账目一致性。
3. **备份与迁移**：
   - 本地开发与演示：直接备份 `server/data/*.db` 文件即可完整复制全部用户、文创与互动状态；
   - 生产部署迁移：可直接使用 `sqlite3 <backup.sql>` 转储或通过 Node 脚本将数据无缝导入 PostgreSQL / MySQL。
