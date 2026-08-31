# GitHub 分支保护规则 — 手动配置清单

> 目标：让不熟练的队友**无法**直接提交/推送 main（和 dev），一切改动走 feature 分支 + PR。
> 配置位置：GitHub 仓库的 **Settings → Rules → Rulesets**（新版规则系统）。
> 预计耗时：5 分钟。

---

## 第 0 步：进入规则设置页

1. 浏览器打开 `https://github.com/z985313021-alt/WebGIS-TEST`
2. 点仓库顶栏最右侧的 **Settings**（齿轮图标）
3. 左侧菜单找到 **Rules** → 点 **Rulesets**
4. 先看一眼已有规则列表——之前测试时可能建过规则，多余的点进去 → 右上 `⋯` → **Delete** 清掉，避免新旧规则叠加冲突

## 第 1 步：新建 main 保护规则

1. 点绿色按钮 **New ruleset** → 选 **New branch ruleset**
2. **Ruleset Name**：`protect-main`
3. **Enforcement status**：改为 **Active** ⚠️（默认 Draft 不生效——这是最大的坑）
4. **Bypass list**：点 **Add bypass target** → 选 **Repository admin** → Bypass mode 选 **Always**
   （作用：紧急情况只有你一个人能直推，队友不行）
5. **Target branches**：点 **Add target** → **Include by pattern** → 填 `main`
6. 往下在 **Branch protection rules** 区域勾选：
   - ✅ **Require a pull request before merging**
     - Required approvals：`1`
     - ✅ Dismiss stale pull request approvals when new commits are pushed
     - ❌ Require review from Code Owners（没配 CODEOWNERS，不勾）
     - ❌ Require approval from someone other than the last pusher（团队只有你一个管理员时勾了会卡死自己，人多后再勾）
   - ✅ **Block force pushes**
   - ✅ **Restrict deletions**
7. 拉到底点 **Create** 保存

## 第 2 步：dev 保护规则（三选一）

同样方法再建一个 ruleset：Name=`protect-dev`，Active，Bypass=你自己，Target 填 `dev`：

| 玩法 | 怎么配 |
|---|---|
| ① dev 也必须 PR（推荐） | 勾选规则与 main 完全一致 |
| ② dev 只许管理员直推 | **不勾** Require a pull request，其余（禁 force push、禁删除）照勾，Bypass=Always |
| ③ 不要 dev | 跳过本步；以后合并完把 dev 分支删掉 |

## 第 3 步：邀请队友（PR 审批的前提）

1. Settings → **Collaborators** → **Add people** → 输入队友 GitHub 用户名 → 发邀请
2. 通知队友去邮箱**接受邀请**（不接受就无法 approve 你的 PR）

## 第 4 步：验证规则生效

1. 找一个受保护分支试推一次（如 `git push origin dev`）→ 应看到 `GH013: Repository rule violations` 被拒
2. 队友在本地 main 上改代码提交 → 应被本地钩子拦截（`.githooks/pre-commit`，`npm install` 后自动生效）

## 第 5 步：把攒下的提交走 PR 合并

配置完成后推送本地领先的分支并开 PR：
- `feature/collab-guardrails`（防呆钩子）→ PR 入口：`https://github.com/z985313021-alt/WebGIS-TEST/pull/new/feature/collab-guardrails`
- `feature/git-collab-docs`（文档）→ `https://github.com/z985313021-alt/WebGIS-TEST/pull/new/feature/git-collab-docs`
- 合并后本地：`git checkout dev && git pull` 同步

## 队友上手（发到群里）

```bash
git clone https://github.com/z985313021-alt/WebGIS-TEST.git
cd WebGIS-TEST
npm install          # 自动启用防呆钩子
# 日常开发照 docs/CONTRIBUTING.md 第 2 节的命令抄
```

## 常见坑

| 现象 | 原因 | 解法 |
|---|---|---|
| 规则建了但拦不住 | Enforcement status 停在 Draft | 进规则改成 Active 保存 |
| PR 一直等不到批准 | Required approvals=1 但只有你一个账号 | 先拉队友进 Collaborators；或临时把 approvals 改 0 |
| Require PR 选项灰色不可点 | 私有仓库 + 免费账号 | 仓库改 Public（Settings→General→Danger Zone），或申请 GitHub 学生包 |
| 规则互相打架 | 旧版 Branch rules（Settings→Branches）和新 Rulesets 叠加 | 只用 Rulesets，旧的在 Settings→Branches 里 Delete |
| 推送被拒 `GH013` | 正常！保护生效了 | 改推 feature 分支 + 开 PR |

---
*配套本地防呆层：`.githooks/`（钩子）、`scripts/setup-hooks.ps1`、`docs/CONTRIBUTING.md`（新手指南）、`.github/PULL_REQUEST_TEMPLATE.md`（PR 模板）。*
