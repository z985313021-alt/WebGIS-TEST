# WebGIS 实习项目 · 队友工作手册（人读版）

> 本手册是 `.dsh/skills/` 目录里"AI 版技能"的人话翻译——那些文件是写给 AI 代理看的，这一份是写给**所有队友**看的。
> **必读**：第 1、2、7、8 节。其余按你负责的开发任务现查。
> 配合 `docs/CONTRIBUTING.md`（Git 协作细节）一起使用。

---

## 目录
1. [我们在做什么](#1-我们在做什么)
2. [三层架构：你的代码放哪里（必读）](#2-三层架构你的代码放哪里必读)
3. [OpenLayers 速查](#3-openlayers-速查)
4. [天地图底图](#4-天地图底图)
5. [数据接入（shp / geojson / excel / wms）](#5-数据接入)
6. [空间分析功能清单](#6-空间分析功能清单)
7. [飞书开发日志（硬纪律，必读）](#7-飞书开发日志)
8. [Git 日常三板斧](#8-git-日常三板斧)
9. [Cesium：先别碰](#9-cesium先别碰)

---

## 1. 我们在做什么

**「遗蕴齐鲁」山东省非物质文化遗产空间数字化平台**：以空间地理信息系统（WebGIS）为底座，全景融合齐鲁大地 185+ 项国家级非遗项目、传承人、专题文化走廊与文创研学服务的高阶文化空间系统。

- **前端架构**：Vue3 + Vite + TypeScript + Pinia + Element Plus + **OpenLayers**（真实 2D 瓦片地图）+ ECharts（多维可视化研学图表）
- **后端架构**：Node.js + Express + **原生 `node:sqlite`（3 个独立 SQLite 数据库，10 张数据表）**
- **底图服务**：高德矢量 / 高德影像、天地图（WMTS 代理）、OSM、白模多源自由切换
- **空间分析**：距离/面积测算、空间缓冲区分析、多边形叠置统计、十门类空间检索（结合 Turf.js 与 OpenLayers）
- **文旅与服务**：高德自驾自研航迹规划与实况气象、12306 高铁路线联动、非遗文创商城与订单事务、个人中心省市区三级联动地址簿、数字孪生文化态势大屏

**页面全景结构**（顶部固钉导航 + 贴边侧栏抽屉）：

| 页面路由 | 核心功能与呈现 |
|---|---|
| **地图主页 `/`** | 全屏地图主体 + 左侧 48px 墨石色停靠轨 + 380px 工作台抽屉（名录/空间分析/图层态势/时空演变）+ 右侧 420px 统计透视抽屉 |
| **数据管理 `/data`** | 齐鲁非遗四大重点专题图层仓储 + 田野调查数据格式转换（Shp/Excel/GeoJSON）+ 空间数据健康体检 |
| **图表可视化 `/chart`** | 非遗门类环形分布、16 地市阶梯排行、国家级公布批次递增趋势、优势门类 TOP5 |
| **态势大屏 `/screen`** | 全屏沉浸式文化遗产数字化态势大屏，适配大屏展厅展示 |
| **旅游路线 `/travel`** | 高德公路真实自驾轨迹规划（含实况气象与行程单）+ 12306 齐鲁高铁直通路线与经停站 |
| **文创商城 `/shop`** | 非遗衍生文创精品展厅、购物车、结账下单与收货地址簿联动 |
| **文创后台 `/admin-shop`** | 管理员专属文创货架维护、商品上架/下架、库存调整与历史订单审计 |
| **非遗详情 `/heritage/:id`** | 185 项非遗项目全景图文资料、传承人图谱、SQLite 点赞与公众研学评论 |
| **个人中心 `/profile`** | 用户基本资料、省市区三级联动收货地址簿、密码修改 |
| **我的订单 `/orders`** | 文创交易订单生命周期跟踪与详情查询 |

---

## 2. 三层架构：你的代码放哪里（必读）

把项目想成一家餐厅：

| 层 | 类比 | 目录 | 职责 |
|---|---|---|---|
| **显示层** | 前厅服务员 | `src/views/` + `src/components/` | 只负责"摆盘上菜"：页面、按钮、面板。**不**自己买菜、**不**进厨房炒菜 |
| **逻辑层** | 厨房大厨 | `src/services/` + Pinia stores | 做菜：业务规则、空间计算、状态管理。食材让采购部送，菜做好递给前厅 |
| **数据层** | 采购部 | `src/data/` | 所有外部数据进出：调接口、读文件、接地图服务。**不**直接操作页面 |

**依赖方向（硬规矩，反向禁止）：**
```
显示层 → 逻辑层 → 数据层 → 后端
```

**"我要做 X，代码放哪？"速查表：**

| 你要做的事 | 代码放哪 |
|---|---|
| 加一个按钮/面板/页面 | `src/components/` 或 `src/views/`（显示层） |
| 加业务计算（如算面积） | `src/services/analysis/`（逻辑层） |
| 加接口调用（如上传文件） | `src/data/sources/` 或 `src/data/http.ts`（数据层） |
| 改全局状态（如面板开关） | `src/services/stores/`（Pinia） |
| 改地图底层渲染 | `src/services/map/`（走 MapAdapter，别在组件里散装 `import 'ol'`） |

**新增功能自查 5 条（提交前过一遍）：**
1. [ ] 数据请求只出现在 `src/data/`？
2. [ ] 业务状态放进 Pinia store 了？
3. [ ] 组件只从 store/服务拿数据，没自己发请求？
4. [ ] 地图操作走了 `MapAdapter` 接口？
5. [ ] 写了飞书日志？（见第 7 节）

---

## 3. OpenLayers 速查

核心概念一句话版：

| 概念 | 人话 | 对应模块 |
|---|---|---|
| Map | 地图容器，一张画布 | `ol/Map` |
| View | 你的"眼睛"：看哪里、放大多少 | `ol/View` |
| Layer | 透明胶片，一层叠一层 | `ol/layer/*` |
| Source | 胶片上画的东西（数据来源） | `ol/source/*` |
| Feature | 地图上的一个点/线/面 | `ol/Feature` |
| Interaction | 鼠标能做的事（画、选、改） | `ol/interaction/*` |
| Overlay | 钉在某个坐标上的 HTML 弹窗 | `ol/Overlay` |

**常用代码（直接抄）：**

```ts
// 加一个 GeoJSON 图层
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';

const layer = new VectorLayer({
  source: new VectorSource({ url: '/data/x.geojson', format: new GeoJSON() }),
});
map.addLayer(layer);
```

```ts
// 测距（球面距离）
import { getDistance } from 'ol/sphere';
const dist = getDistance([lng1, lat1], [lng2, lat2]); // 单位：米
```

```ts
// 绘制一个多边形
import Draw from 'ol/interaction/Draw';
map.addInteraction(new Draw({ source, type: 'Polygon' }));
```

**重要规矩：** 地图操作都通过 `src/services/map/MapAdapter.ts` 这个"翻译官"——以后 Cesium 接手 3D 时，页面代码不用改一个字。

官方文档：https://openlayers.org/en/latest/apidoc/ （API）、https://openlayers.org/en/latest/examples/ （示例）

---

## 4. 多源底图与高德服务

- **多源底图切换**：
  - 前端支持自由切换：**高德矢量（默认推荐）**、**高德影像**、**天地图（矢量/影像，需配置 tk）**、**OSM** 与 **白模底图**。
  - 通过 `mapStore.setProvider('amap')` 等集中管理，底层自动管理图层切换与注记叠加。
- **高德地理智能服务代理**：
  - 高德 Key 统一在服务端 `server/.env`（`AMAP_KEY`）配置，前端不泄露密钥。
  - 后端提供安全代理：城市实况气象 `/api/amap/weather`、省域联想搜索 `/api/amap/inputtips`、自驾驾车真实路网折线 `/api/amap/direction/driving`。
- **天地图密钥**：
  - 天地图 `tk` 放在服务端保护，前端切天地图时通过后端中转代理或配置项加载。

---

## 5. 数据接入与持久化数据库

| 数据形态 | 格式/存储 | 谁处理 | 业务功能 |
|---|---|---|---|
| **非遗全景要素** | GeoJSON (185 项) | 前端直接读 + `shop.db` 缓存 | 地图点位主图层、图表统计、时空演变 |
| **Shapefile / Excel** | `.shp` / `.xlsx` | 后端转换为 GeoJSON | 数据管理页上传，后端清洗转换并输出体检报告 |
| **用户与地址簿** | `users.db` (SQLite) | 后端 `node:sqlite` 原生引擎 | 注册登录、密码加盐、Token 会话、三级级联收货地址 |
| **文创与订单** | `shop.db` (SQLite) | 后端 `node:sqlite`（事务保护） | 文创 IP 商品、购物车、订单生成与库存原子扣减 |
| **点赞与研学评论** | `interact.db` (SQLite) | 后端 `node:sqlite` | 非遗详情页点赞、研学评论留言与互动 |

详细数据字典与表结构请查阅：[`docs/DATABASE.md`](./DATABASE.md)。

---

## 6. 空间分析与地图工作台

空间分析功能现已全面合并融入**地图主页左侧工作台抽屉**（不再单独跳页，保持沉浸式单页体验）：

| 功能模块 | 实现方式 | 代码位置 | 入口与调用 |
|---|---|---|---|
| **非遗名录检索** | 高德联想 + 拼音/关键词 | `components/panels/FilterPanel.vue` | 左侧停靠轨「名录」按钮 |
| **空间分析工具** | OpenLayers + Turf.js | `components/panels/AnalysisTools.vue` | 左侧停靠轨「分析」按钮 |
| - 距离/面积量算 | `ol/sphere` 球面测量 | `services/analysis/measure.ts` | 空间分析抽屉内交互量算 |
| - 空间缓冲区 | `turf.buffer` (10~50km) | `services/analysis/buffer.ts` | 空间分析抽屉内缓冲区生成 |
| - 区域叠加统计 | `turf.booleanPointInPolygon` | `services/analysis/overlay.ts` | 计算区域或缓冲区内非遗数量 |
| **图层态势与聚类** | OL Cluster / Heatmap | `views/HomeMap.vue` | 左侧停靠轨「态势」按钮 |
| **时空演变回放** | 批次过滤 + 动画播放器 | `components/map/TimeSlider.vue` | 左侧停靠轨「时空」按钮 |
| **多维统计透视** | ECharts 联动分析 | `components/panels/MapChartPanel.vue` | 右侧停靠抽屉（右上角按钮开启） |

---

## 7. 飞书开发日志

**为什么必须有：**
1. 实习留痕 = 你实习成果的**直接证明**（做了什么、怎么做的、遇到什么坑）
2. 排查 bug 的"时光机"——三周前的坑，日志里翻得到

**什么时候写：**
- 每次代码提交前，写一条
- 调试卡住超过 20 分钟，当场记一条
- 用了个新方法/新库，值得记

**字段模板（每条必填）：**

| 字段 | 填什么 | 示例 |
|---|---|---|
| 日期时间 | 本地时间 | 2025-03-20 14:30 |
| 操作人 | 你的名字 | 张三 |
| 模块 | 数据层/逻辑层/显示层/后端/文档/协作 | 协作 |
| 做了什么修改 | 一句话 | 开通分支保护规则 |
| 尝试的实现方法 | 用了什么技术/API | GitHub Rulesets |
| 遇到的问题 | 卡点 | 直推 main 被 GH013 拒绝 |
| 解决方案 | 怎么解决的 | 走 feature 分支 + PR |
| 创新点 | 值得一提的思路 | 本地钩子双保险 |
| 关联提交/文件 | commit hash / 文件路径 | 3e23842 / .githooks |

**一条填好的完整示例**（真实发生过的事）：

> **2025-03-20 15:00｜张三｜协作｜开通分支保护并防呆**
> 做了什么修改：给 main/dev 加了 GitHub 分支保护规则，做了本地防呆钩子。
> 尝试的方法：GitHub Rulesets 要求 PR；本地 .githooks 钩子拦截直推。
> 遇到的问题：队友是新手，可能直接 push main 把主线弄坏；Windows 上钩子脚本还会被 CRLF 搞挂。
> 解决方案：规则设 Required PR+1 批准；钩子脚本用 .gitattributes 强制 LF；写了 CONTRIBUTING 新手指南。
> 创新点：npm install 自动启用钩子（postinstall），队友零配置。
> 关联：PR #4 / docs/CONTRIBUTING.md

**写在哪：** 先记 `docs/feishu-log.md`（随代码提交，人人可见），然后跑 **`npm run feishu:push`** 自动同步到飞书文档（组织内可编辑，地址见 `.dsh/skills/feishu-log/SKILL.md`）。每次推送生成最新完整文档。

---

## 8. Git 日常三板斧

详细规则看 `docs/CONTRIBUTING.md`（**新手必读**），这里只放命令卡：

**开工三连：**
```bash
git checkout dev          # 切到集成分支
git pull                  # 拉最新
git checkout -b feature/功能名   # 例：feature/图层开关
```

**收工三连：**
```bash
git add 具体文件          # 别用 git add -A 一把梭
git commit -m "feat: 简述"   # type: 功能说明
git push -u origin feature/功能名
# 然后网页上点 "Compare & pull request"，base 选 dev
```

**红线（碰了要请全组喝奶茶）：**
- ❌ `git push --force` / `-f`（会覆盖别人提交）
- ❌ `git push --no-verify`（绕过防呆钩子）
- ❌ 在 main / dev 上直接提交（钩子会拦，但别试）
- ❌ 提交 `.env`（里面有密钥）
- ⚠️ 分支名用 `feature/英文功能名`（已有教训：`W's-branch`、`Y分支` 这种名字会让工具链出问题）

---

## 9. Cesium：先别碰

最后阶段才做 3D 演示页（没有城市模型/地形数据，只做轻量视觉演示）。现在写代码**不要**考虑它——MapAdapter 已经预留了切换能力。

---

## 附：卡住了找谁

| 问题 | 找谁 |
|---|---|
| Git 操作卡住 / 合并冲突 | 组长 |
| GitHub 权限 / PR 没人批 | 仓库管理员 |
| 地图/分析代码报错 | 看日志（第 7 节）+ 组里讨论 |
| 报错对照表 | `docs/CONTRIBUTING.md` 第 5 节 |
