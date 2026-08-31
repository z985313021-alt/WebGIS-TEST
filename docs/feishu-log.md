# 飞书开发日志（留痕存档）

> 字段结构见 `.dsh/skills/feishu-log.md`。
> 当前为本地存档；待用户提供飞书 app 凭证后，可一键推送至飞书文档/多维表格。
> 每次开发改动追加一条，按时间倒序。

---

## [2026-08-31 15:45] 天地图 WMTS 代理 + 前端底图接入 + 本地环境跑通
- **日期时间**：2026-08-31 15:45
- **操作人**：架构（AI 代理）
- **模块**：后端 / 数据层 / 逻辑层 / 显示层 / 环境
- **做了什么修改**：① 后端 `server/index.js` 实现真实天地图 WMTS 代理（白名单重建 KVP + 环境变量 tk 回源，子域 t0-t7 轮换，新增 `/api/tianditu/status` 状态接口）；② 前端数据层封装 WMTS 源（`src/data/sources/tianditu.ts`）并新增状态查询（`src/data/api/tianditu.ts`）；③ 逻辑层 MapAdapter 增加 `useTianditu` 参数、mapStore 增加 `checkTianditu` action；④ 显示层 MapContainer 初始化先查状态、HomeMap 面板显示当前底图；⑤ 本地环境补装 Node v24、express/dotenv/@types/node 依赖
- **尝试的实现方法**：后端用 `https.get` 回源 `t{s}.tianditu.gov.cn/:type/wmts` 并透传瓦片流；前端用 `ol/source/WMTS` + `WMTSTileGrid`（w 集，EPSG:4326，origin [-180,90]，resolutions 1.40625/2^z）；`/api/tianditu/status` 探测 tk 是否配置
- **遇到的问题**：① 后端缺 express/dotenv 依赖，`npm run server` 崩溃 `Cannot find package 'express'`；② `vue-tsc -b` 构建报 5 个错：缺 vite/client 类型、缺 @types/node、`ol/Map` 遮蔽全局 `Map` 导致 `new Map<string,VectorLayer>()` 报"Expected 0 type arguments"、`View.setView` 方法不存在
- **解决方案**：补装依赖；新建 `src/vite-env.d.ts` 引用 vite/client；`OLMapAdapter` 把 `import Map` 改为 `OLMap` 别名；`zoomTo` 改用 `view.setCenter` + `view.setZoom`
- **创新点**：tk 未配置时前端自动降级 OSM 占位、配置后零改动切天地图（status 探测驱动，且 type 白名单防路径穿越）
- **关联提交/文件**：server/index.js、src/data/sources/tianditu.ts、src/data/api/tianditu.ts、src/services/map/{MapAdapter,OLMapAdapter}.ts、src/services/stores/mapStore.ts、src/components/map/MapContainer.vue、src/views/HomeMap.vue、src/vite-env.d.ts、package.json

## [创建日] Git 仓库初始化 + 远程连接 + 分支保护实测
- **日期时间**：创建日（本次会话，接下条）
- **操作人**：架构（AI 代理）
- **模块**：Git 协作 / 文档
- **做了什么修改**：git init(main) → 首提交（30 个脚手架文件）→ 连接远程 https://github.com/z985313021-alt/WebGIS-TEST.git → 推送
- **尝试的实现方法**：先变基到 origin/main 之上再推 main；被拒后改走"dev 分支承载脚手架提交 + main 重置回远程"方案
- **遇到的问题**：① git_commit 工具在空仓库场景报 undefined → 改用 pwsh 手动 add/commit；② push main 被 GitHub 规则拒绝（GH013: Changes must be made through a pull request）——远程 main 有分支保护
- **解决方案**：`git branch dev` 承载提交 → `git reset --hard origin/main` 复原 main → `git checkout dev` → `git push -u origin dev` 成功；远程 PR 由用户自行创建
- **创新点**：把"main 受保护、PR 用户自理、代理只推 feature/dev 分支"实测约定固化进 `.dsh/skills/git-collab` 技能，避免后续重复踩坑
- **关联提交/文件**：2544b56（脚手架）、.dsh/skills/git-collab/SKILL.md、docs/feishu-log.md

## [2025-创建日] 脚手架搭建 + 分层架构跑通
- **日期时间**：创建日（本次会话）
- **操作人**：架构（AI 代理）
- **模块**：显示层 / 逻辑层 / 数据层 / 后端 / 文档
- **做了什么修改**：搭建 Vue3+Vite+TS 项目；建分层目录；地图主页渲染 OSM 占位底图；可折叠控制面板；后端 server 骨架（天地图代理+shp/excel 转换占位）；本地技能手册 9 个技能；.gitignore/.env.example
- **尝试的实现方法**：npm 非交互建 package.json；Vite alias `@`; Pinia 管 UI 状态；MapAdapter 抽象接口 + OLMapAdapter 实现；显示层只依赖 adapter 不直接 import ol 渲染
- **遇到的问题**：PowerShell `Tail` 命令不存在导致首次 npm install 误报失败 → 改用 `Get-Content -Tail`；当前 hy3 模型不能读图 → 改用 DOM/canvas 断言验证渲染
- **解决方案**：修正安装命令；用 pilot_eval 检查 canvas 尺寸与面板存在性验证渲染
- **创新点**：把项目规范挂成 `.dsh/skills/` 本地技能集，开发前按任务读对应技能，保证三层分离与飞书留痕纪律
- **关联提交/文件**：docs/DEV_PLAN.md、.dsh/skills/*、src/{data,services,views,components,router}/*、server/index.js

## [待办] 下一步
- [x] Git 初始化 + GitHub 仓库 + 分支策略（dev 已推送，PR 用户自理）
- [~] 天地图接入代码已完成（后端 WMTS 代理 + 前端 WMTS 源 + OSM 兜底降级）；等用户填 .env 的 tk 即切真实底图
- [ ] 数据层：shp/excel/WMS 接入（后端转换接口补全）
- [ ] 空间分析：量算/缓冲区/查询/勾画（引入 turf）
- [ ] 飞书凭证到位后日志自动上传
