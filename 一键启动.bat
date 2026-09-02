@echo off
chcp 65001 >nul
title WebGIS 非遗地图 - 一键启动
cd /d D:\git\WebGIS-TEST

echo ============================================
echo   WebGIS 非遗地图 一键启动
echo   将打开两个窗口：
echo     ① 后端 API   (端口 3001)
echo     ② 前端页面   (端口 8000)
echo ============================================
echo.

start "后端 server (3001)" cmd /k "cd /d D:\git\WebGIS-TEST && npm run server"
start "前端 dev (8000)" cmd /k "cd /d D:\git\WebGIS-TEST && npm run dev"

echo 启动中，请稍候 5~10 秒...
echo 页面地址: http://localhost:8000
echo.
pause
