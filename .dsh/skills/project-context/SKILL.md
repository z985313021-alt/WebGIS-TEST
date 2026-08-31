# Skill: project-context（项目上下文）

## 适用场景
任何开发任务开始前，先读取本技能以建立项目整体认知。

## 项目一句话
基于 Vue3 的通用 WebGIS 可视化平台实习项目，OpenLayers 为主、Cesium 为辅，强调
数据层 / 逻辑层 / 显示层严格分离，开发过程全程在飞书留痕，使用 Git/GitHub 协作。

## 核心约束（必守）
1. **三层分离**：
   - 数据层 `src/data/`：API 请求、数据源适配、仓储。不直接操作 DOM / 不直接调地图 API 渲染。
   - 逻辑层 `src/services/` + Pinia stores：地图业务、空间分析、状态。不直接写 axios（交给数据层）。
   - 显示层 `src/views/` + `src/components/`：只消费逻辑层暴露的状态与方法，渲染 UI。
2. **引擎抽象**：显示层与逻辑层只依赖地图抽象接口（如 `MapAdapter`），不直接 import `ol` 的渲染细节散落各处。
3. **飞书留痕**：每次修改/调试/尝试方法/遇到问题/创新点，必须写开发日志（见 feishu-log 技能）。
4. **可折叠 UI**：面板（图层/分析/图表）默认可选展示，不抢占地图主体。

## 技术栈
Vue3 + Vite + TS / Pinia / Element Plus / OpenLayers（主）/ Cesium（辅，后期）/
天地图 WMTS（底图）/ Node+Express（后端）/ ECharts（图表）/ Git+GitHub / 飞书（日志）。

## 关键路径
- 主文档：`docs/DEV_PLAN.md`（决策表、清单、排期、待确认项）
- 技能索引：`.dsh/skills/SKILLS.md`
- 待确认：天地图 tk、飞书 app 凭证、Cesium 范围
