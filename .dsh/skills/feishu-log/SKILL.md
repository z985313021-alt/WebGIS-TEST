# Skill: feishu-log（飞书开发日志规范）

## 适用场景
**每次**代码修改、调试、尝试新方法、遇到问题、有创新点时，必须写一条开发日志。
这是项目硬性要求——"开发过程留痕"，不是交付文档。

## 日志字段结构（每条记录必含）
| 字段 | 说明 | 示例 |
|---|---|---|
| 日期时间 | 本地时间 | 2025-xx-xx 14:30 |
| 操作人 | 谁改的 | 张三 |
| 模块 | 地图引擎/数据层/逻辑层/显示层/后端/文档 | 数据层 |
| 做了什么修改 | 一句话动作 | 新增 shp 上传接口 |
| 尝试的实现方法 | 用了什么技术/API | 用 shapefile+npm 转 geojson |
| 遇到的问题 | bug/卡点 | 中文乱码 |
| 解决方案 | 怎么解决的 | dbf 用 gbk 解码 |
| 创新点 | 不错的思路/优化 | 上传即预览 |
| 关联提交/文件 | git commit / 文件路径 | a1b2c3 / src/data/sources/shp.ts |

## 落地方式（已配置自动上传 ✅ 2026-09-01）
1. **本地记录**：每次改动先把日志按上面字段写进 `docs/feishu-log.md`（随 git 提交，人人可见）。
2. **推送飞书**：`npm run feishu:push` —— 脚本 `server/scripts/push-feishu.mjs`
   用飞书导入任务 API 把 `docs/feishu-log.md` 全量转成飞书文档（markdown 原生转换，表格可用）。
3. **凭证**：根目录 `.env` 的 `FEISHU_APP_ID` / `FEISHU_APP_SECRET`（已 gitignore，禁止提交）。
4. **文档权限**：已设为"组织内获得链接的人可编辑"。
5. **文档地址**：每次推送会**替换为最新版本**（旧文档自动删除，保持单版本），最新 URL 由脚本打印，也存在 `server/data/feishu-doc-state.json` 的 `lastUrl`。当前最新：
   `https://feishu.cn/docx/DL2TdklLroLalixg1WIckzeJnSc`（应用云空间"山东非遗实习日志"文件夹）。
6. **注意**：全量导入生成新文档；如想要固定地址+增量追加版，需另行扩展（docx append blocks）。

## 纪律
- 不漏记：哪怕只是"调试天地图 403，发现 tk 失效"。
- 同步：重大变更同步更新 `docs/DEV_PLAN.md` 的变更记录表。
- 频率：按次，不是按天；一次改动一条。
- 任务收尾：先提交日志到 git，再跑 `npm run feishu:push` 推飞书。
