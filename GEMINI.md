# 遗蕴齐鲁 WebGIS 开发与设计规约

本项目为「齐风鲁韵」山东非物质文化遗产空间数字化平台，所有开发与重构任务均须严格遵守以下规约。

## 1. 国风设计语言与视觉规范 (Design System Tokens)
- **色调与纸韵**：
  - 底色：宣纸色 `--zi-bg: #f4eddc`，卡片白玉/温润纸色 `--zi-paper: #fbf8ef` 或 `#fffdf5`。
  - 主文墨色：文人书卷墨黑 `--zi-ink: #3a3125` / `#2b2218`，正文次级 `#6d5b45`。
  - 传统点缀色：朱砂红 `--zi-red: #8f2317` / `#a03526`，古铜赭金 `--zi-gold: #b4861f` / `#d4a84e`，松柏绿 `--zi-green: #3c6a50`。
- **排版与卡片标头**：
  - 严禁在正式 GIS 卡片、表格及图表标题中使用口语化或粗糙的 emoji 字符（如 🚄、💴、🛤️、📥、🌐、📋 等）。
  - 统一采用古典文印符号 `❖` 或 Element Plus 矢量图标（如 `<el-icon><Van /></el-icon>`）作为标头修饰。
  - 标题字系优先采用华文中宋/宋体 (`"STSong", "Songti SC", "SimSun", serif`) 彰显齐鲁古韵。

## 2. WebGIS 与 Canvas 动画稳定性底线 (Map & Canvas Stability)
- **严禁使用形变动画**：
  - 绝对禁止在包覆 OpenLayers 地图视口、ECharts 画布的 `<router-view>` 或外层容器过渡中使用 `transform: scale(...)` 或 `translateY(...)`。
  - 形变动画会导致 OpenLayers 投影计算跳动、切片重绘撕裂及 Canvas 模糊。
  - 页面与弹窗过渡统一使用轻量平滑的纯透明度交叉淡入：`transition: opacity 200ms ease-out`。

## 3. SPA 工程架构与路由门禁规范 (SPA & Architecture)
- **SPA 路由跳转**：
  - 严禁在应用内部使用 `window.location.href = ...` 触发全页刷新，必须使用 `router.push(...)` 保持 SPA 单页状态。
  - 严禁将业务对象挂载到 `window.__*` 全局命名空间，地图与数据状态统一由 Pinia store（`useMapStore` / `useDataStore`）或 Vue `provide/inject` 集中管理。
- **游客免登录浏览 (Guest Mode)**：
  - 路由守卫 `guard.ts` 须开放公开展示页面的游客浏览权限（包括地图主页 `/`、空间分析 `/?tool=analysis`、图表可视化 `/chart`、旅游路线 `/travel`、数据管理 `/data`、文创商城 `/shop` 及非遗详情 `/heritage/:id`）。
  - 仅在涉及用户持久化数据、结账下单或管理员权限时要求拦截并引导登录。
