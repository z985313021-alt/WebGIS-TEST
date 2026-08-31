# Skill: git-collab（Git / GitHub 协作）

## 适用场景
初始化仓库、日常提交、分支管理、合并、PR。

## 分支策略
- `main`：稳定可运行版本，受保护（GitHub 规则：Changes must be made through a pull request），只接受 PR 合并。
- `dev`：集成开发分支。
- `feature/<模块>-<简述>`：功能分支（如 `feature/data-shp-ingest`）。
- 禁止直接 push main；通过 PR + review 合并。

## ⚠️ 用户明确约定（2025 实测，必须遵守）
1. **AI 代理绝不 push main**——远程 main 已启用分支保护，直接推会被 GH013 拒绝。
2. **PR 创建由用户自己处理**，代理只负责：建分支 → 提交 → push 分支，然后告知用户 PR 链接
   （格式：`https://github.com/z985313021-alt/WebGIS-TEST/pull/new/<分支名>`）。
3. 日常开发一律在 `feature/*` 分支；`dev` 用于集成，由用户决定何时合并。
4. 本仓库远程：`https://github.com/z985313021-alt/WebGIS-TEST.git`（owner: z985313021-alt）。

## 提交流程
1. `git checkout -b feature/xxx`
2. 开发 + 飞书留痕（见 feishu-log）
3. `git add` 指定文件（不用 `git add -A` 懒加）
4. `git commit -m "type: 简述"`（见下方规范）
5. `push` → GitHub 开 PR → 同伴 review → 合并 dev → 定期合并 main

## 提交信息规范（Conventional Commits）
- `feat:` 新功能
- `fix:` 修复
- `docs:` 文档（如更新 DEV_PLAN / 飞书记录）
- `refactor:` 重构（不改变行为）
- `chore:` 构建/依赖
- 例：`feat(data): 新增 shapefile 上传转 geojson`

## 初始化待办（首次）
- [x] `git init` + 首提交
- [x] 建 `main`/`dev`
- [x] 写 `.gitignore`（node_modules/ dist/ .env 等）
- [x] 建 GitHub 仓库并关联（z985313021-alt/WebGIS-TEST）
- [x] 验证远程分支保护：main 禁止直推（GH013 实测），dev 可推
- [ ] 加 PR 模板（可选）

## 注意
- `.env`（含天地图 tk、飞书 secret）必须进 `.gitignore`，绝不提交。
- 大体积 shp/excel 示例数据谨慎提交，必要时 git-lfs 或放 releases。
