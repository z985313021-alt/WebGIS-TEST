# 协作指南（写给所有队友，尤其是新手）

> 读一遍只要 3 分钟，能帮你避开 90% 的协作事故。
> 服务器端还有 GitHub 分支保护规则兜底，但请先按本指南操作。

## 0. 克隆后一次性准备（必做）

```bash
git clone https://github.com/z985313021-alt/WebGIS-TEST.git
cd WebGIS-TEST
npm install        # 会自动启用 Git 防呆钩子（postinstall）
```

如果钩子没生效，手动跑一次：`npm run setup`

## 1. 黄金法则：永远不要在 main / dev 上写代码

| 分支 | 用途 | 你能直接改吗 |
|---|---|---|
| `main` | 稳定版本，随时可演示 | ❌ 绝不，只能 PR 合并 |
| `dev` | 集成测试分支 | ❌ 只能 PR 合并 |
| `feature/xxx` | 你的功能分支 | ✅ 随便提交 |

## 2. 每天开工的固定动作

```bash
git checkout dev            # 切到集成分支
git pull                    # 拉最新代码
git checkout -b feature/你的功能名   # 例：feature/data-shp、fix/layer-toggle
# ...写代码...
git add 具体文件             # 别用 git add -A
git commit -m "feat: 简述这次加了什么"
git push -u origin feature/你的功能名
# 然后到 GitHub 页面点 "Compare & pull request"
```

## 3. 提交信息怎么写（Conventional Commits）

格式：`type: 简述`（小写 type + 英文冒号 + 空格）

| type | 用在什么时候 | 例子 |
|---|---|---|
| `feat` | 新功能 | `feat(data): 新增 shapefile 上传` |
| `fix` | 修 bug | `fix(map): 修复底图切换后偏移` |
| `docs` | 只改文档 | `docs: 更新分工表` |
| `refactor` | 重构但行为不变 | `refactor: 抽取地图适配器` |
| `chore` | 构建/依赖/配置 | `chore: 升级 ol 到 10.x` |

## 4. 发 PR 后

1. 填一下 PR 模板（做了什么 / 类型 / 自查清单）
2. @管理员 review，通过后合并
3. 合并后可以删功能分支：`git branch -d feature/xxx`

## 5. 常见报错对照表

| 报错 | 原因 | 怎么办 |
|---|---|---|
| `❌ 你当前在受保护分支 [main] 上`（本地提交时） | 你在 main 上直接改代码 | `git checkout -b feature/xxx` 后再提交 |
| `GH013: Repository rule violations`（推送时） | 服务器禁止直推该分支 | 改推 feature 分支 + 开 PR |
| `push declined due to repository rule violations` | 同上 | 同上 |
| push 提示 `rejected (fetch first)` | 远端有新提交 | `git pull` 后再推 |

## 6. 红线（碰了要请全组喝奶茶）

- ❌ `git push --force` / `-f`：会覆盖别人的提交
- ❌ `git push --no-verify`：绕过防呆钩子
- ❌ 在 main/dev 直接 commit（钩子会拦，但别试）
- ❌ 提交 `.env`（里面有密钥）

## 7. 出问题找谁

- Git 操作卡住 → 组长
- GitHub 权限/合并 → 仓库管理员
- 每次开发记得按模板写**飞书开发日志**（字段见 `.dsh/skills/feishu-log.md`）
