# 飞书开发日志（留痕存档）

> 字段结构见 `.dsh/skills/feishu-log.md`。
> 当前为本地存档；待用户提供飞书 app 凭证后，可一键推送至飞书文档/多维表格。
> 每次开发改动追加一条，按时间倒序。

---

## [2026-08-31 16:35] 天地图 tk 服务端 key 验证出图 + feature 分支并入 dev 最新
- **日期时间**：2026-08-31 16:35
- **操作人**：架构（AI 代理）
- **模块**：后端 / 协作 / 文档
- **做了什么修改**：① 天地图 tk 由浏览器端 key 换成服务端 key，经后端代理实测瓦片返回 200 image/png（出图成功）；② `feature/tianditu-basemap` 合并 `origin/dev` 最新（PR #4 防呆钩子、#5 README），解决 3 个文件冲突（git-collab/SKILL.md、DEV_PLAN.md、feishu-log.md），推送远程
- **尝试的实现方法**：`git merge origin/dev` 保留双方内容；服务端 key 走 `/api/tianditu/vec_w` 代理回源验证
- **遇到的问题**：① 浏览器端 key 被天地图拒绝（code 301012 权限类型错误，须服务端 key）；② dev 与 main 已分叉，merge 时 git-collab/SKILL.md、DEV_PLAN.md、feishu-log.md 三处冲突
- **解决方案**：申请服务端 key 替换 `.env`；冲突逐一手动合并（双方独立内容均保留，仅一处待办勾选以 dev 为准）
- **创新点**：PR 到 dev 时顺带把 main 独有提交（git-collab 文档、TEST）带入 dev，可消除 dev/main 分叉
- **关联提交/文件**：da187a2（merge）、d9c6ef9（天地图接入）、server/index.js、.env

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

## [创建日] T1 数据标准化完成：185 条山东非遗 + 图片绑定
- **日期时间**：创建日（本次会话）
- **操作人**：架构（AI 代理）
- **模块**：数据层
- **做了什么修改**：① 从旧仓库 zip（用户放 E 盘）提取 shp；② 写 GBK dbf 读取器 + shp→GeoJSON 转换脚本；③ 过滤山东省 185 条非遗（名录全国 3610 条）；④ 图片绑定 173/185（93.5%）；⑤ 拷贝图片库 163 张 + 边界/路网/统计到项目
- **尝试的实现方法**：shapefile 包读几何 + 自写 dbf-reader（iconv-lite GBK 解码）；字段模糊映射；图片用"全名/基名/括号内容 × 序号 × 扩展名"匹配策略（继承旧系统 getPossibleImagePaths）
- **遇到的问题**：① dbf 字段名 GBK 乱码 → iconv-lite 解码；② 批次"第一批"里的"1"是**汉字一**和全角字符 → 中文数字映射 + 全角转半角；③ shapefile 包迭代方式（.read() 而非 for await）；④ 9 个名称尾部有解码残渣 "?" → 正则清理；⑤ 图片名在括号内容里（海阳大秧歌 vs 秧歌（海阳大秧歌））→ 括号内容作为候选名
- **解决方案**：见上；数据质量校验：185 条、10 类别与旧系统完全一致、16 地市、0 坐标越界
- **创新点**：把旧项目的"字段不可信"经验做成模糊映射 + 防御性编程；数据体检统计内嵌转换脚本
- **关联提交/文件**：server/scripts/{dbf-reader,convert-shp,bind-images,inspect-shp}.mjs、server/data/{heritage.geojson,shandong-boundary.json,roads.json,stats-summary.json}、public/images/（163 张）

## [创建日] 修复 PR#4 中文乱码（API 编码坑）
- **日期时间**：创建日（本次会话）
- **操作人**：架构（AI 代理）
- **模块**：协作 / 文档
- **做了什么修改**：PR #4 标题与描述中的中文全部变成 `??`，用 UTF-8 字节方式重新 PATCH 修复
- **尝试的实现方法**：`Invoke-RestMethod -Body (ConvertTo-Json 字符串)` → 中文被编码转换破坏；改为把 JSON 写成 UTF-8 文件 → `ReadAllBytes` → `-Body $bytes -ContentType application/json; charset=utf-8` 发送
- **遇到的问题**：PowerShell 传中文 body 给 GitHub API 时，非 UTF-8 字节流导致中文全部变问号（ASCII 正常）
- **解决方案**：文件方式传 UTF-8 原始字节，绕开 PowerShell 字符串编码；修复后用 API 读回校验（Contains('本地防呆钩子')=True）
- **创新点**：凡含中文的 API 写入一律走"UTF-8 文件 + 字节体"模式，避免再次踩坑
- **关联提交/文件**：PR #4（title/body 已 PATCH）、docs/feishu-log.md

## [创建日] 审查 dev 提交 + 人读版工作手册 + CRLF 隐患修复
- **日期时间**：创建日（本次会话）
- **操作人**：架构（AI 代理）
- **模块**：文档 / 协作 / 显示层
- **做了什么修改**：① 审查 feature/collab-guardrails → dev 的 3 个提交（10 文件，结论通过），开 PR #4；② 新增 `.gitattributes` 强制钩子脚本 LF，修 Windows CRLF 隐患；③ 新增 `docs/HANDBOOK.md`（把 9 个 AI 版技能翻译成队友人读版工作手册）；④ SKILLS.md 加指针
- **尝试的实现方法**：GitHub API 读 PR/compare（用本机凭证管理器存量凭证，只读）；人读版用"餐厅类比"讲三层架构
- **遇到的问题**：钩子脚本是 bash，Windows autocrlf 会把 LF 转 CRLF，队友 checkout 后 bash 报 `$'\r'` 错 → 用 .gitattributes 强制 eol=lf
- **解决方案**：`.gitattributes` 加 `.githooks/** text eol=lf` 和 `*.sh text eol=lf`
- **创新点**：一份规则两套读本——`.dsh/skills/`（AI 用）+ `docs/HANDBOOK.md`（人用），同步维护
- **关联提交/文件**：docs/HANDBOOK.md、.gitattributes、.dsh/skills/SKILLS.md、PR #4

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
