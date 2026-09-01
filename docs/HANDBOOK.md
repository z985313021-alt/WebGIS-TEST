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

一个**通用地图可视化平台**（实习项目）：上传各种数据到地图上看、查、分析。

- 前端：Vue3 + Vite + TypeScript + Element Plus（界面）+ OpenLayers（2D 地图）
- 后端：Node.js + Express（处理 shp/excel 转换、保护天地图密钥）
- 底图：天地图（矢量/影像）
- 分析：量算、缓冲区、查询、勾画（用 turf.js）
- 后期：Cesium 做 3D 演示

**页面结构**（顶部导航 + 多页面）：

| 页面 | 作用 |
|---|---|
| 地图主页 | 全屏地图 + 可折叠面板（图层/底图/绘制） |
| 数据管理 | 上传 shp/geojson/excel、接入 WMS |
| 空间分析 | 量算/缓冲区/查询/勾画工具 |
| 图表可视化 | 数据列表 + 图表（ECharts），与地图联动 |
| 关于 | 项目说明 |

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

## 4. 天地图底图

- 天地图的 `tk`（密钥）像**家门钥匙**——只能放后端 `server/.env`，**绝不放前端代码**（等于把钥匙贴门外）。
- 前端想换底图：调 `mapStore.setBaseMap('vec')` 或 `'img'`（矢量/影像），**别自己拼 tk**。
- 常见报错：
  - 瓦片 403 → tk 失效/后端代理漏参
  - 地图偏移 → 投影不匹配（3857 vs 4326）
- 你一般什么都不用改，底图已封装好。

---

## 5. 数据接入

| 格式 | 谁处理 | 你在哪里操作 |
|---|---|---|
| **GeoJSON** | 前端直接读 | 数据管理页上传/选择 |
| **Shapefile** | **必须后端转**（浏览器读不了 .shp/.dbf 组合） | 数据管理页上传，后端 `POST /api/convert/shp` |
| **Excel** | 后端读经纬度列转 GeoJSON | 数据管理页上传，后端 `POST /api/convert/excel`（要告诉接口哪列是经度、哪列是纬度） |
| **WMS** | 前端加图层；跨域走后端代理 | 数据管理页填 WMS 地址 |

规则：**经纬度校验**——经度范围 73~135，纬度 3~54（中国大陆），乱数会被拒。
规则：**shp 优先转 WGS84** 再进前端，别在前端再折腾投影。

---

## 6. 空间分析功能清单

| 功能 | 用什么实现 | 代码位置 | 入口 |
|---|---|---|---|
| 测距/测面 | `ol/sphere` | `services/analysis/measure.ts` | 空间分析页 |
| 缓冲区 | turf.js `buffer` | `services/analysis/buffer.ts` | 空间分析页 |
| 叠加统计（区域内计数） | turf `booleanPointInPolygon` | `services/analysis/overlay.ts` | 空间分析页 |
| 属性查询+高亮 | 按字段筛 Feature + setStyle | `services/analysis/query.ts` | 空间分析页 |
| 勾画/标注 | Draw + Modify + Snap | `services/draw/` | 地图主页绘制面板 |

注意：
- 距离/缓冲区单位默认**米**，界面让用户选单位。
- 超过 1 万要素的叠加统计会很卡，先找架构商量（可能挪后端算）。

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
