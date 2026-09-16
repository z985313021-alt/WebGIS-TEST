# 部署说明（阿里云 2C2G）

配套文件：
- `nginx-webgis.conf` —— nginx 站点配置（静态托管 dist + /api 反代 + 限流 + 安全头）
- `webgis-api.service` —— systemd 单元（后端守护、崩溃自启、日志落盘）
- `deploy.sh` —— 服务器上的部署/更新脚本

安全与容量评估见 `docs/DEPLOYMENT.md`。

---

## 0. 前置条件

| 项 | 要求 | 检查命令 |
| :--- | :--- | :--- |
| Node.js | **≥ 22.5**（项目用 `node:sqlite`，低版本无此内置模块） | `node -v` |
| nginx | 任意近期版本 | `nginx -v` |
| git | 用于拉取代码 | `git --version` |
| 内存 | 2 GB 够用；Node 上限建议 1 GB | `free -h` |

> 若尚未安装 Node，推荐用 NodeSource 或 nvm 装 Node 22 LTS：
> `curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs`

## 1. 拉代码与初始化

```bash
sudo mkdir -p /opt/webgis /var/log/webgis
sudo chown -R $USER:$USER /opt/webgis
git clone https://github.com/z985313021-alt/WebGIS-TEST.git /opt/webgis
cd /opt/webgis
git checkout dev
npm ci                 # 含 devDependencies，构建需要
npm run build          # 产出 dist/
```

## 2. 配置后端环境变量

```bash
cp .env.example .env
vi .env                # 填入下面这些
```

```ini
PORT=3001
TIANDITU_TK=你的天地图 tk
AMAP_WEB_KEY=高德 Web 服务 Key
AMAP_JS_KEY=高德 JS Key
AMAP_SECURITY_CODE=高德安全密钥
```

> `.env` 已在 `.gitignore` 中，不会进仓库；权限收紧到 `chmod 600 .env`。
> 首次启动时后端会自动建库（users.db / shop.db / interact.db）并把 185 项非遗灌入，
> 无需手工导入。需要演示数据可另外执行 `node server/scripts/seed-demo.mjs`。

## 3. 安装 systemd 单元与 nginx 站点

```bash
sudo cp deploy/webgis-api.service /etc/systemd/system/
sudo mkdir -p /opt/webgis/server/uploads
sudo chown -R www-data:www-data /opt/webgis/server/data /opt/webgis/server/uploads
# 若用专用用户，把 User= 改成同一个：
# sudo useradd -r -s /usr/sbin/nologin webgis

sudo systemctl daemon-reload
sudo systemctl enable --now webgis-api
systemctl status webgis-api --no-pager
```

nginx：把限流区定义放进 `/etc/nginx/nginx.conf` 的 `http {}` 块：

```nginx
limit_req_zone $binary_remote_addr zone=webgis_api:10m rate=20r/s;
limit_req_zone $binary_remote_addr zone=webgis_tiles:10m rate=80r/s;
```

再启用站点：

```bash
sudo cp deploy/nginx-webgis.conf /etc/nginx/sites-available/webgis
sudo ln -sf /etc/nginx/sites-available/webgis /etc/nginx/sites-enabled/webgis
sudo rm -f /etc/nginx/sites-enabled/default     # 避免默认站点抢占 80
sudo nginx -t && sudo systemctl reload nginx
```

## 4. 安全组

阿里云控制台只放行 **80 / 443**（以及你的 SSH 端口）。**3001 绝不放公网** —— Node 只监听回环，外部无法直连。

## 5. 日常更新

```bash
sudo bash /opt/webgis/deploy/deploy.sh          # 拉 dev + 构建 + 重启
sudo bash /opt/webgis/deploy/deploy.sh --api-only   # 只重启后端
```

## 6. 常用排查

```bash
systemctl status webgis-api          # 服务状态
journalctl -u webgis-api -n 100      # 服务日志（若未配置 append 日志）
tail -f /var/log/webgis/api.log      # 应用日志
sudo nginx -t                        # nginx 配置自检
curl -fsS http://127.0.0.1:3001/api/tianditu/status   # 后端健康检查
curl -I http://127.0.0.1/            # 前端是否由 nginx 正常返回
```

常见问题：
- **页面空白 / 404**：`dist/` 没构建或 nginx root 路径不对；`try_files` 是否回退到 index.html
- **接口 502**：后端没起来（`systemctl status webgis-api`），或端口不是 3001
- **地图没底图**：`.env` 里天地图 tk 没填 —— 前端会自动回退 OSM，属预期行为
- **上传报 413**：nginx `client_max_body_size` 与后端 multer 上限不一致

## 7. 数据备份

三个 SQLite 文件是全部业务数据（users/shop/interact），建议定时备份：

```bash
0 3 * * * sqlite3 /opt/webgis/server/data/shop.db ".backup '/var/backups/shop-\$(date +\%F).db'"
```
