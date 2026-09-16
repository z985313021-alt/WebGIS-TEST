# 部署与安全加固方案（阿里云 2C2G）

> 面向本次部署目标：把「遗蕴齐鲁」从本地开发环境搬到阿里云 ECS（2 vCPU / 2 GB）。
> 本文基于当前代码库实测审计（2026-09 版本），分为「安全审计发现」「并发承载力评估」「部署架构」「加固清单」「测试数据」五部分。

---

## 1. 安全审计发现

审计范围：`server/index.js`（约 900 行单文件后端）、`server/scripts/*.mjs`、`package.json`、`.env`、`.gitignore`。

### 1.1 高危（部署前必须处理）

| # | 问题 | 证据 | 影响 |
| :-- | :--- | :--- | :--- |
| H1 | **上传接口无鉴权** | `server/index.js:149` `app.post('/api/convert/shp', upload.array('files'), ...)`、`:161` `/api/convert/excel` 均未挂 `requireAuth` | 匿名即可调用；SHP/Excel 解析是 CPU 密集型，无限次调用可直接打死 2 核 CPU |
| H2 | **单次上传量过大** | `server/index.js:38` `limits: { fileSize: 100 * 1024 * 1024, files: 8 }` | 单请求最多 800 MB 落盘；2 GB 内存的机器一次请求即可能 OOM / 磁盘写满 |
| H3 | **JSON body 上限 50 MB** | `server/index.js:41` `app.use(express.json({ limit: '50mb' }))` | `/api/health-check` 等接口可被 50 MB payload 打爆内存 |
| H4 | **全站无限流** | 无 rate-limit 类中间件 | 登录接口可无限次撞库；`/api/amap/*` 代理被刷会消耗高德配额（额度用完全站地图功能失效） |
| H5 | **登录无失败锁定** | `server/index.js:236` 登录仅校验账号密码，无失败计数 | 密码规则为 6-20 位字母+数字，弱口令可被离线撞库 |

### 1.2 中危（建议一并处理）

| # | 问题 | 证据 | 影响 |
| :-- | :--- | :--- | :--- |
| M1 | **会话永不过期** | `server/scripts/user-db.mjs:126` sessions 表仅 `token, user_id`，无过期字段与清理 | Token 一旦泄露即长期有效，无法强制下线 |
| M2 | **xlsx 依赖存在高危漏洞，且官方无修复版本** | 实测 `npm audit --omit=dev`：xlsx 全部版本命中 **Prototype Pollution**（GHSA-4r6h-8v6p-xvw6）与 **ReDoS**（GHSA-5pgg-2g8v-p4x9），严重级别 **high**，`No fix available` | 项目用它解析**用户上传的 Excel**，属于不可信输入直通解析器；npm 上的 xlsx 已停更，需改用 SheetJS 官方 CDN 版或换成 `exceljs` |
| M2b | **echarts XSS 漏洞** | 实测 `npm audit`：`echarts < 6.1.0` 命中 **XSS**（GHSA-fgmj-fm8m-jvvx），严重级别 **moderate**，升级至 6.1.0 为破坏性变更 | 图表 tooltip/标签渲染的数据若含用户可控内容（如用户上传图层的字段名）存在注入面 |
| M3 | **上传文件无清理** | multer 落盘至 `server/uploads/`，未见定时清理逻辑 | 长期运行会占满磁盘 |
| M4 | **无安全响应头 / CORS 白名单** | 未见 helmet / cors 配置 | 缺少 X-Frame-Options、CSP 等基线防护 |

### 1.3 已做对的部分（无需改动）

- ✅ **SQL 全部参数化**：抽查 `user-db.mjs` 全部使用 `?` 占位符，不存在拼接注入
- ✅ **密钥不进仓库**：`.env` 在 `.gitignore` 中且未被 git 跟踪；高德 / 天地图 Key 均通过后端代理转发，前端不持有 Web 服务 Key
- ✅ **密码存储规范**：scrypt + 随机 salt（`user-db.mjs:42`）
- ✅ **上传目录已忽略**：`server/uploads/` 在 `.gitignore`

---

## 2. 并发承载力评估（2 vCPU / 2 GB）

### 2.1 架构层面的天然瓶颈

| 因素 | 现状 | 说明 |
| :--- | :--- | :--- |
| 进程模型 | Node 单进程单线程 | 只用 1 个核；另一个核基本闲置（可留作 nginx/系统） |
| 数据库 | `node:sqlite` 的 **`DatabaseSync`（同步 API）** | 每次查询会阻塞事件循环；并发写入时延迟被放大 |
| 静态资源 | 后端**没有** `express.static` | 生产环境必须由 nginx 托管 `dist/`，否则要 Node 扛静态文件 |
| 外部依赖 | 高德 / 天地图代理 | 每个代理请求占用一次外呼往返，慢上游会拖住事件循环 |

### 2.2 量级判断（估算，需实测校正）

- **纯接口读取**（非遗列表、地图数据）：个位数毫秒级，单进程可支撑 **数十 QPS**
- **写操作**（下单、评论、点赞）：受同步 SQLite 串行化影响，安全水位约 **10~20 QPS**
- **上传转换接口**：单次 SHP/Excel 解析会占满一个核数百毫秒至数秒，**必须限流 + 鉴权**，否则 2~3 个并发就能让全站无响应
- **内存**：Node 常驻约 150~300 MB；`shandong-boundary.json`（416 KB）、`heritage.geojson`（97 KB）、`stations.json`（326 KB）启动后常驻，2 GB 足够
- ⚠️ `server/data/roads.json` **7.7 MB**，若被热路径反复读取+解析会明显拖慢，建议确认使用位置并做一次性缓存

> 结论：**面向课程/演示场景（几十人同时在线）2C2G 足够**；但要抗住"恶意或误操作的高并发"，必须先完成第 1 节的高危项加固，再由 nginx 兜住入口。

---

## 3. 部署架构建议

```
                 ┌──────────────────────────────────────────┐
   公网 80/443 ──▶│  nginx（反代 + 静态 + 限流 + gzip）        │
                 │  · /            → /var/www/webgis/dist    │
                 │  · /api/        → 127.0.0.1:3001          │
                 │  · limit_req / client_max_body_size       │
                 └───────────────┬──────────────────────────┘
                                 │
                    ┌────────────▼─────────────┐
                    │  Node (Express :3001)     │
                    │  systemd / PM2 守护       │
                    │  SQLite（3 个 .db 文件）   │
                    └───────────────────────────┘
```

### 3.1 关键点

1. **Node 只监听回环**：`app.listen(PORT, '127.0.0.1')`，公网只开 nginx
2. **前端走构建产物**：`npm run build` → `dist/`，交给 nginx（开启 gzip/brotli + 强缓存哈希资源）
3. **进程守护**：systemd 或 PM2，配置 `Restart=always`、内存上限 `--max-old-space-size=1024`
4. **SQLite 备份**：三个 `.db` 文件定时 `VACUUM INTO` 或直接复制（写少读多，风险低）
5. **安全组**：仅放行 80/443（以及你的 SSH 端口），绝不放行 3001

---

## 4. 加固清单（按优先级，可逐项执行）

| 优先级 | 改动 | 落点 | 预计工作量 |
| :--- | :--- | :--- | :--- |
| P0 | 上传接口挂 `requireAuth`（建议再加 `requireAdmin`） | `server/index.js:149,161` | 10 分钟 |
| P0 | 上传限制收紧：`fileSize: 20MB`、`files: 5` | `server/index.js:38` | 5 分钟 |
| P0 | JSON 上限 50MB → 2MB（体检接口单独放宽） | `server/index.js:41` | 5 分钟 |
| P0 | 引入轻量限流：登录 5 次/分钟/IP，写接口 30 次/分钟/IP，上传 3 次/分钟/IP | 新增中间件 | 1 小时 |
| P0 | nginx 层限流 + `client_max_body_size` | nginx 配置 | 30 分钟 |
| P1 | sessions 表加 `expires_at`（如 7 天）+ 启动与定时清理 | `server/scripts/user-db.mjs` | 1 小时 |
| P1 | 登录失败计数（同账号 5 次锁 15 分钟） | `server/index.js` | 1 小时 |
| P1 | 上传目录定时清理（保留 24 小时） | 新增定时任务 | 30 分钟 |
| P1 | `xlsx` 升级到官方修复版 / 换 `exceljs` | `package.json` | 视回归测试而定 |
| P2 | 安全响应头（X-Frame-Options、X-Content-Type-Options、CSP） | nginx 或 helmet | 30 分钟 |
| P2 | `roads.json` 改启动时一次性载入并缓存 | 视使用位置 | 30 分钟 |

---

## 5. 测试数据方案

现状：非遗 185 项（`server/data/heritage.geojson`，97 KB）、商品与订单量级很小，**不足以暴露并发与分页问题**。

建议补三类数据（可写成 `server/scripts/seed-demo.mjs` 一键生成）：

| 数据类型 | 目标量 | 用途 |
| :--- | :--- | :--- |
| 非遗点位 | 1 000 ~ 5 000 条（在山东境内按地市随机撒点 + 合理分类） | 压测地图渲染、聚合、缓冲区统计 |
| 用户 | 200 ~ 500 个（含 1 个 admin） | 压测登录/鉴权 |
| 订单 / 评论 / 点赞 | 每用户 5~20 条 | 压测列表分页、SQLite 写入串行化 |

> 注意：`server/data/*.db` 已被 gitignore，造数据只影响本机/服务器实例，不会进仓库。

---

## 6. 压测建议

1. **先压未加固版本**留基线：`autocannon` 或 `k6` 打 `GET /api/shop/products`、`GET /api/shop/orders`
2. **重点压写接口**：`POST /api/shop/orders`（含事务扣库存），观察 SQLite 串行化后的 QPS 拐点
3. **单独压上传接口**：确认加固后 100 MB / 高频请求被正确拒绝（429 / 413）
4. **观察指标**：CPU、内存、事件循环延迟（`--trace-event-categories`）、5xx 比例
5. 压测在**服务器本机或同地域**进行，避免把公网带宽误判为服务瓶颈
