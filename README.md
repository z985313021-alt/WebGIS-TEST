# WebGIS 实习项目 · 通用地图可视化平台

> 基于 Vue3 + OpenLayers 的 WebGIS 实习项目：上传 shp / geojson / excel 等数据，在地图上展示、查询、分析。
> 顶层导航 + 多页面，地图为主体，面板可折叠。OpenLayers 为主（2D），Cesium 为辅（后期 3D 演示）。

---

## 📋 工作任务流程（从这里开始，必读）

| 你想知道什么 | 看这个文档 |
|---|---|
| **总任务清单 + 排期 + 技术决策** | 👉 [`docs/DEV_PLAN.md`](docs/DEV_PLAN.md) |
| **队友工作手册**（三层架构/地图/数据/分析/飞书日志怎么写） | 👉 [`docs/HANDBOOK.md`](docs/HANDBOOK.md) |
| **Git 协作规则**（分支/提交规范/常见报错，新手必读） | 👉 [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) |
| **开发日志**（每次改动留痕） | 👉 [`docs/feishu-log.md`](docs/feishu-log.md) |
| 分支保护规则怎么配的 | [`docs/GITHUB_RULES_SETUP.md`](docs/GITHUB_RULES_SETUP.md) |

### 每日工作流（一句话版）
```
开工：git checkout dev → git pull → git checkout -b feature/功能名
干活：写代码 → 写飞书日志（docs/feishu-log.md）
收工：git add 具体文件 → git commit -m "feat: 简述" → git push -u origin feature/功能名
       → 网页上开 PR（base 选 dev）→ 等审批合并
```

---

## 🚀 快速开始

```bash
# 1. 克隆
git clone https://github.com/z985313021-alt/WebGIS-TEST.git
cd WebGIS-TEST

# 2. 装依赖（自动启用防呆钩子：禁止直接提交/推送 main）
npm install

# 3. 启动前端
npm run dev        # http://localhost:8000

# 4. 另开一个终端启动后端
npm run server     # http://localhost:3001（天地图代理/数据转换）

# 5. 开发日志推送飞书（每次任务收尾跑一次，全量生成最新飞书文档）
npm run feishu:push
```

> 后端需要 `.env`（含天地图 tk、飞书凭证等密钥）：复制 `.env.example` 为 `.env` 并填入真实值。**`.env` 严禁提交。**
> 飞书文档地址与说明见 `.dsh/skills/feishu-log/SKILL.md`。

---

## 🗺️ 项目结构（三层分离）

```
src/
  data/        # 数据层：接口请求、数据源适配（tianditu/geojson/shp/excel/wms）
  services/    # 逻辑层：地图业务(MapAdapter)、空间分析、Pinia stores
  views/       # 显示层：页面（地图主页/数据管理/空间分析/图表/关于）
  components/  # 显示层：组件（地图容器/可折叠面板/图表）
  router/      # 顶部导航路由
  config/      # 常量配置
server/        # Node 后端：天地图 tk 代理、shp/excel 转 GeoJSON、WMS 中转
docs/          # 计划书/手册/协作规范/开发日志（也同步飞书）
.dsh/skills/   # AI 代理用技能手册（队友读 docs/HANDBOOK.md 即可）
```

**依赖方向：显示层 → 逻辑层 → 数据层 → 后端**（禁止反向，详见 HANDBOOK 第 2 节）

---

## 🧱 技术栈

| 类别 | 选型 |
|---|---|
| 前端框架 | Vue3 + Vite + TypeScript |
| 状态管理 | Pinia |
| UI 组件库 | Element Plus |
| 2D 地图 | OpenLayers（主） |
| 3D 演示 | Cesium（后期） |
| 底图 | 天地图 WMTS（tk 由后端代理） |
| 空间分析 | turf.js + ol/sphere |
| 图表 | ECharts |
| 后端 | Node.js + Express |
| 协作 | Git + GitHub（分支保护 + PR）+ 飞书日志 |

---

## 🌿 分支模型（规则已生效）

| 分支 | 用途 | 谁能直接提交 |
|---|---|---|
| `main` | 稳定版，随时可演示 | ❌ 只能 PR（1 人审批） |
| `dev` | 集成开发线 | ❌ 只能 PR |
| `feature/功能名` | 你的功能分支 | ✅ 随便推，用完即删 |

- 本地还有**防呆钩子**兜底：在 main 上直接 commit / push 会被拦下（`npm install` 自动启用）。
- PR 由管理员合并；代理只推 feature 分支。

---

## 📅 当前进度

- ✅ 脚手架 + 三层架构 + 地图页跑通（OSM 占位底图）
- ✅ 协作体系：分支保护 + 防呆钩子 + 手册/规范 + PR 模板
- 🔲 天地图真实底图（等 tk 密钥）
- 🔲 数据层：shp / geojson / excel / wms 接入
- 🔲 空间分析：量算 / 缓冲区 / 查询 / 勾画
- 🔲 图表联动 + Cesium 演示（后期）

详细里程碑见 [`docs/DEV_PLAN.md`](docs/DEV_PLAN.md) 第 3 节。

---

## 🧭 遇到问题

| 问题 | 找谁 / 看哪 |
|---|---|
| Git 卡住 / 合并冲突 | `docs/CONTRIBUTING.md` 第 5 节报错对照表，或找组长 |
| 代码放哪 / 架构不懂 | `docs/HANDBOOK.md` 第 2 节 |
| 怎么写开发日志 | `docs/HANDBOOK.md` 第 7 节 |
| 权限 / PR 没人批 | 仓库管理员 |
