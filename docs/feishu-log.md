# 飞书开发日志（留痕存档）

> 字段结构见 `.dsh/skills/feishu-log.md`。
> 当前为本地存档；待用户提供飞书 app 凭证后，可一键推送至飞书文档/多维表格。
> 每次开发改动追加一条，按时间倒序。

---

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
- [ ] 用户提交天地图 tk → 后端 /api/tianditu 实现 WMTS 代理 → 切真实底图（替换 OSM 占位）
- [ ] 数据层：shp/excel/WMS 接入（后端转换接口补全）
- [ ] 空间分析：量算/缓冲区/查询/勾画（引入 turf）
- [ ] 飞书凭证到位后日志自动上传
