#!/bin/sh
# 一次性配置（macOS/Linux 队友用）：启用项目自带 Git 钩子
git config core.hooksPath .githooks && echo "[OK] 已启用项目 Git 钩子（保护 main）"
