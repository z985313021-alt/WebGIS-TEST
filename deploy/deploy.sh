#!/usr/bin/env bash
# 遗蕴齐鲁 · 一键部署/更新脚本（在服务器上执行）
# 用法：sudo bash deploy.sh            # 拉取 dev、安装依赖、构建前端、重启后端
#      sudo bash deploy.sh --api-only # 只重启后端，不重新构建前端
set -euo pipefail

APP_DIR="/opt/webgis"
BRANCH="dev"
NODE_BIN="${NODE_BIN:-/usr/bin/node}"

echo "==> 进入 ${APP_DIR}"
cd "${APP_DIR}"

if [[ "${1:-}" != "--api-only" ]]; then
  echo "==> 拉取 ${BRANCH} 分支"
  git fetch origin "${BRANCH}"
  git checkout "${BRANCH}"
  git pull --ff-only origin "${BRANCH}"

  echo "==> 安装依赖（含 devDependencies，构建需要）"
  npm ci

  echo "==> 构建前端 → dist/"
  npm run build

  echo "==> dist 产物已更新（nginx root 指向该目录，无需重启 nginx）"
fi

echo "==> 重启后端服务"
systemctl restart webgis-api
sleep 2
systemctl is-active webgis-api && echo "后端已启动" || { echo "后端启动失败，查看：journalctl -u webgis-api -n 50"; exit 1; }

echo "==> 健康检查"
curl -fsS http://127.0.0.1:3001/api/tianditu/status >/dev/null && echo "接口正常" || echo "接口无响应，请检查日志"

echo "完成。"
