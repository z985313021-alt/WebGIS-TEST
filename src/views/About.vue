<template>
  <div class="about-page">
    <!-- 未登录时的顶栏：免登录浏览后返回登录 -->
    <header v-if="!userStore.isLoggedIn" class="guest-bar">
      <a class="guest-back" @click.prevent="tryLogin()" href="#">← 返回登录</a>
      <span class="guest-tip">正在以访客身份浏览平台介绍</span>
      <a class="guest-login" @click.prevent="tryLogin()" href="#">登录 / 注册体验完整功能 →</a>
    </header>

    <!-- ============ Hero ============ -->
    <section class="hero">
      <div class="hero-bg" aria-hidden="true">
        <span class="orb orb-1"></span>
        <span class="orb orb-2"></span>
        <span class="orb orb-3"></span>
      </div>
      <div class="hero-inner">
        <div class="hero-badge shimmer-badge">
          <span class="badge-dot"></span>
          齐风鲁韵 · 数字化时空平台系统架构
        </div>
        <h1 class="hero-title">齐风鲁韵 · 一张图走读千年</h1>
        <p class="hero-sub">
          以现代 WebGIS 空间地理信息模型为骨架，汇聚齐鲁 16 地市 185+ 项国家级与省级非物质文化遗产。
          贯通时空切片演进、拓扑缓冲区分析、12306 智能高铁文旅接驳与齐鲁文创活态传承生态。
        </p>
        <div class="hero-actions">
          <el-button type="primary" size="large" round class="hero-cta shimmer-btn" @click="go('/')">
            <span>进入全景地图体验</span>
            <span class="btn-arrow">→</span>
          </el-button>
          <el-button size="large" round plain class="hero-sub-btn" @click="scrollTo('#features')">
            <span>浏览核心模块与架构</span>
          </el-button>
        </div>

        <div class="hero-stats">
          <div class="stat card-lift">
            <div class="stat-num">185+</div>
            <div class="stat-label">项传世非遗名录</div>
          </div>
          <div class="stat card-lift">
            <div class="stat-num">16</div>
            <div class="stat-label">齐鲁地市 100% 覆盖</div>
          </div>
          <div class="stat card-lift">
            <div class="stat-num">6</div>
            <div class="stat-label">大核心业务模块</div>
          </div>
          <div class="stat card-lift">
            <div class="stat-num">3</div>
            <div class="stat-label">层解耦时空架构</div>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ 核心模块 ============ -->
    <section id="features" class="section">
      <div class="sec-title-wrap">
        <div class="sec-subtitle">PLATFORM CORE MODULES</div>
        <h2 class="section-title">核心业务功能</h2>
        <p class="section-desc">六大专业模块各司其职，无缝协作构成齐鲁非遗空间数字化闭环</p>
      </div>

      <div class="feature-grid">
        <div
          v-for="f in features"
          :key="f.title"
          class="feature-card reveal card-lift"
          :style="{ '--fc': f.accent }"
          @click="go(f.to)"
        >
          <div class="feature-icon" :style="{ background: f.color }">
            <component :is="f.iconComponent" class="f-icon-svg" />
          </div>
          <h3 class="feature-title">{{ f.title }}</h3>
          <p class="feature-brief">{{ f.brief }}</p>
          <ul class="feature-list">
            <li v-for="point in f.points" :key="point">
              <span class="p-bullet">❖</span>
              <span>{{ point }}</span>
            </li>
          </ul>
          <div class="feature-cta">
            <span>前往体验</span>
            <span class="f-arrow">→</span>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ 技术架构全景 ============ -->
    <section class="section section-arch">
      <div class="sec-title-wrap">
        <div class="sec-subtitle">SYSTEM ARCHITECTURE</div>
        <h2 class="section-title">三层时空架构与数据流向</h2>
        <p class="section-desc">模块清晰解耦，底层数据、核心算法与上层交互视窗高效协作</p>
      </div>

      <div class="arch-topology-wrap">
        <div v-for="(layer, li) in architectureLayers" :key="li" class="arch-layer-box reveal card-lift">
          <div class="layer-badge-col">
            <div class="layer-seq">LAYER 0{{ li + 1 }}</div>
            <div class="layer-title">{{ layer.title }}</div>
            <div class="layer-dir">{{ layer.dir }}</div>
          </div>
          <div class="layer-content-col">
            <p class="layer-desc">{{ layer.desc }}</p>
            <div class="layer-chips">
              <span v-for="c in layer.chips" :key="c" class="layer-chip">❖ {{ c }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="tech-tags-wrap">
        <div class="tech-title">核心技术选型：</div>
        <div class="tech-tags">
          <span v-for="t in tech" :key="t" class="tech-tag">{{ t }}</span>
        </div>
      </div>
    </section>

    <!-- ============ 快速上手 ============ -->
    <section class="section section-alt">
      <div class="sec-title-wrap">
        <div class="sec-subtitle">QUICK DEPLOYMENT</div>
        <h2 class="section-title">快速部署与启动</h2>
        <p class="section-desc">工程标准统一，轻量高效，开箱即用</p>
      </div>

      <div class="steps">
        <div v-for="(s, i) in steps" :key="s.title" class="step reveal card-lift">
          <div class="step-no">0{{ i + 1 }}</div>
          <h3 class="step-title">{{ s.title }}</h3>
          <p class="step-desc">{{ s.desc }}</p>
          <pre class="step-code"><code>{{ s.code }}</code></pre>
        </div>
      </div>

      <div class="tips">
        <div v-for="t in tips" :key="t.title" class="tip reveal">
          <div class="tip-icon-box">
            <el-icon><InfoFilled /></el-icon>
          </div>
          <div>
            <div class="tip-title">{{ t.title }}</div>
            <div class="tip-desc">{{ t.desc }}</div>
          </div>
        </div>
      </div>
    </section>

    <footer class="about-footer">
      <div class="footer-seal">❖</div>
      <p class="footer-text">遗蕴齐鲁 · 齐风鲁韵空间数字化平台 · Vue 3 + OpenLayers + ECharts · 文脉永续</p>
      <p class="footer-sub">传承齐鲁工匠精神 · 赋能数字人文科研与文旅实践</p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue';
import { useRouter, type RouteLocationRaw } from 'vue-router';
import { useUserStore } from '@/services/stores/userStore';
import {
  MapLocation,
  FolderOpened,
  Compass,
  TrendCharts,
  Van,
  ShoppingBag,
  InfoFilled,
} from '@element-plus/icons-vue';

const router = useRouter();
const userStore = useUserStore();

function tryLogin() {
  router.push({ path: '/login' });
}

const features = [
  {
    iconComponent: MapLocation,
    accent: '#a03526',
    color: 'linear-gradient(135deg, #a03526, #6b1f15)',
    title: '地图主页',
    brief: '基于 OpenLayers 的 60FPS 矢量交互地图，直观呈现全省非遗的空间分布。',
    points: [
      '类别 / 地市 / 批次 / 关键词多维精准筛选',
      '点位空间聚类（Cluster）与图层平滑聚合',
      '时空演变动态滑块，时间轴回溯历史扩散',
      '一键全域定位齐鲁 16 地市宏观视角',
    ],
    to: '/',
  },
  {
    iconComponent: FolderOpened,
    accent: '#3c6a50',
    color: 'linear-gradient(135deg, #3c6a50, #284735)',
    title: '数据管理',
    brief: '支持个人与机构空间数据上传，经标准化转换体检后叠加到地图展示。',
    points: [
      '支持 GeoJSON / Shapefile / Excel 格式导入',
      '全自动坐标系转换与几何拓扑体检（越界/空值排查）',
      '数据要素一键加载至地图视窗并自动缩放居中',
    ],
    to: '/data',
  },
  {
    iconComponent: Compass,
    accent: '#b4861f',
    color: 'linear-gradient(135deg, #b4861f, #815e12)',
    title: '空间分析',
    brief: '内置专业 GIS 拓扑分析算法，定量挖掘非遗空间集聚与扩散特征。',
    points: [
      '高精度测距 / 测面空间几何量算',
      'Turf.js 多级同心缓冲区（5km/10km/20km）要素统计',
      '任意多边形套合圈选与非遗要素重叠分析',
      '空间密度核热力推演与集聚趋势呈现',
    ],
    to: { path: '/', query: { tool: 'analysis' } },
  },
  {
    iconComponent: TrendCharts,
    accent: '#7a3548',
    color: 'linear-gradient(135deg, #7a3548, #4d1d2b)',
    title: '图表可视化',
    brief: 'ECharts 多维时空看板联动，点击图表即可反查并联动地图过滤。',
    points: [
      '10 大文化门类分布饼图与比例切片',
      '齐鲁 16 地市非遗数量横向柱图与排名',
      '五大申报批次历史演进趋势图',
      '点击图表柱体实现时空地图反向筛选联动',
    ],
    to: '/chart',
  },
  {
    iconComponent: Van,
    accent: '#2f5b77',
    color: 'linear-gradient(135deg, #2f5b77, #1d3b4e)',
    title: '旅游路线规划',
    brief: '12306 智能高铁与公路路网拓扑接驳，定制沉浸式非遗寻访路书。',
    points: [
      '京沪、济青高铁干线枢纽实时接驳关联',
      '沿途代表性非遗工坊与传习基地智能推荐',
      '多节点途经规划与自驾/研学行程生成',
    ],
    to: '/travel',
  },
  {
    iconComponent: ShoppingBag,
    accent: '#8a4b27',
    color: 'linear-gradient(135deg, #8a4b27, #5c3017)',
    title: '齐鲁文创活化',
    brief: '每件器物均溯源至特定非遗项目与代表性传承人，手作精工，活化传承。',
    points: [
      '器物溯源至国家级/省级代表性传承人工坊',
      '纯手工精湛工艺鉴赏与文化背景考证',
      '文旅研学文创产品在线定制与支持',
    ],
    to: '/shop',
  },
];

const architectureLayers = [
  {
    title: '表现与交互视窗层 (Presentation Layer)',
    dir: 'src/views · src/components',
    desc: '面向用户的现代 WebGIS 单页交互视窗，具备流畅的无形变透明度淡入淡出体验。',
    chips: [
      'OpenLayers 60FPS 矢量地图渲染',
      'ECharts 多维时空数据联动看板',
      'Element Plus 国风白玉组件库',
      '游客免登录沉浸式浏览模式',
    ],
  },
  {
    title: '业务逻辑与算法中枢层 (Service & Logic Layer)',
    dir: 'src/services · src/stores',
    desc: '核心计算中枢，解耦全局状态并驱动 GIS 空间几何计算与文旅算法。',
    chips: [
      'Turf.js 空间拓扑计算引擎（缓冲区/相交/测面）',
      'Pinia 统一状态中心（useMapStore / useDataStore）',
      '12306 高铁枢纽与沿途节点拓扑路书规划',
      'Axios 统一拦截与游客鉴权免扰机制',
    ],
  },
  {
    title: '数据集成与地理底座层 (Data & Storage Layer)',
    dir: 'src/data · backend/src',
    desc: '多源异构空间地理信息集成与后端代理网关，确保空间基准统一与数据严密。',
    chips: [
      '天地图 WMTS 权威国家地理信息底图',
      'CGCS2000 / WGS84 空间基准坐标转换',
      'GeoJSON / Shapefile / Excel 空间体检引擎',
      'Express RESTful API 与数据安全持久化',
    ],
  },
];

const steps = [
  { title: '安装项目依赖', desc: '基于 npm 或 pnpm 构建依赖包拓扑', code: 'npm install' },
  { title: '启动前端开发服务', desc: 'Vite 高速启动开发服务器，默认端口 8000', code: 'npm run dev' },
  { title: '启动后端 API 服务', desc: '提供天地图代理网关与空间数据转换', code: 'npm run server' },
];

const tips = [
  { title: '从地图主页开始', desc: '在地图主页左侧「非遗筛选」面板筛选，点击任意点位即可弹窗查看非遗历史详情。' },
  { title: '图表时空联动', desc: '在图表页点击柱状图或饼图切片，系统将自动携带条件返回地图并完成精确定位。' },
  { title: '导入私有空间数据', desc: '数据管理页支持 GeoJSON / SHP / Excel，完成空间体检后可一键叠加到齐鲁大地图。' },
];

const tech = [
  'Vue 3 (Composition API)',
  'TypeScript',
  'Vite 6',
  'OpenLayers 9',
  'ECharts 5',
  'Element Plus',
  'Pinia',
  'Vue Router 4',
  'Turf.js (Spatial Analysis)',
  'Express & Node.js',
  'CGCS2000 / WGS84',
];

let observer: IntersectionObserver | null = null;

function go(to: RouteLocationRaw) {
  router.push(to);
}

function scrollTo(selector: string) {
  document.querySelector(selector)?.scrollIntoView({ behavior: 'smooth' });
}

onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          observer?.unobserve(e.target);
        }
      });
    },
    { threshold: 0.12 },
  );
  document.querySelectorAll('.reveal').forEach((el) => observer?.observe(el));
});

onBeforeUnmount(() => {
  observer?.disconnect();
});
</script>

<style scoped>
.about-page {
  min-height: 100%;
  background: var(--zi-bg, #f4eddc);
  color: var(--zi-ink, #2b2218);
  overflow-x: hidden;
}

/* ===== 访客顶栏 ===== */
.guest-bar {
  position: sticky;
  top: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 24px;
  background: rgba(244, 237, 220, 0.96);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(180, 134, 31, 0.32);
}
.guest-bar .guest-back,
.guest-bar .guest-login { cursor: pointer; }
.guest-back { color: #8f2317; font-weight: 600; text-decoration: none; font-size: 13px; }
.guest-login {
  color: #fff;
  background: #8f2317;
  border-radius: 999px;
  padding: 5px 14px;
  font-size: 12px;
  text-decoration: none;
  font-weight: 600;
  transition: background 0.2s;
}
.guest-login:hover {
  background: #a03526;
}
.guest-tip { color: #6d5b45; font-size: 13px; }

/* ---------- Hero ---------- */
.hero {
  position: relative;
  padding: 64px 24px 52px;
  text-align: center;
  overflow: hidden;
}
.hero-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.hero-bg::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 50% -15%, rgba(180, 134, 31, 0.16), transparent 60%);
}
.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(28px);
  opacity: 0.35;
  animation: floatOrb 12s ease-in-out infinite;
}
.orb-1 {
  width: 280px;
  height: 280px;
  top: -70px;
  left: 6%;
  background: radial-gradient(circle, rgba(160, 53, 38, 0.4), transparent 70%);
}
.orb-2 {
  width: 240px;
  height: 240px;
  top: 30px;
  right: 8%;
  background: radial-gradient(circle, rgba(180, 134, 31, 0.35), transparent 70%);
  animation-delay: -4s;
}
.orb-3 {
  width: 180px;
  height: 180px;
  bottom: -40px;
  left: 36%;
  background: radial-gradient(circle, rgba(60, 106, 80, 0.3), transparent 70%);
  animation-delay: -7s;
}
@keyframes floatOrb {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-16px) scale(1.05); }
}

.hero-inner {
  position: relative;
  z-index: 1;
  max-width: 900px;
  margin: 0 auto;
}
.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  border-radius: 999px;
  background: rgba(160, 53, 38, 0.08);
  border: 1px solid rgba(160, 53, 38, 0.28);
  color: #8f2317;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 16px;
  backdrop-filter: blur(8px);
}
.badge-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #8f2317;
  animation: pulseDot 2.2s infinite ease-in-out;
}
@keyframes pulseDot {
  0%, 100% { transform: scale(1); opacity: 0.9; }
  50% { transform: scale(1.4); opacity: 0.5; }
}

.hero-title {
  font-family: var(--zi-font-serif, "Noto Serif SC", "Songti SC", serif);
  font-size: 42px;
  line-height: 1.25;
  font-weight: 700;
  margin: 0 0 16px;
  color: #2b2218;
  letter-spacing: 0.04em;
}
.hero-sub {
  font-size: 15px;
  color: #5c4f3e;
  line-height: 1.85;
  max-width: 720px;
  margin: 0 auto 28px;
}
.hero-actions {
  display: flex;
  justify-content: center;
  gap: 14px;
  flex-wrap: wrap;
}
.hero-cta {
  background: linear-gradient(135deg, #9a281c 0%, #7e1e13 100%) !important;
  border: none !important;
  padding: 10px 28px !important;
  font-weight: 600 !important;
  font-size: 15px !important;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 6px 18px -2px rgba(154, 40, 28, 0.35);
  transition: all 220ms var(--zi-ease-spring, cubic-bezier(0.16, 1, 0.3, 1)) !important;
}
.hero-cta:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px -2px rgba(154, 40, 28, 0.45);
}
.btn-arrow {
  display: inline-block;
  transition: transform 200ms var(--zi-ease-spring, cubic-bezier(0.16, 1, 0.3, 1));
}
.hero-cta:hover .btn-arrow {
  transform: translateX(4px);
}
.hero-sub-btn {
  border-color: rgba(180, 134, 31, 0.5) !important;
  color: #6d5b45 !important;
  background: rgba(255, 253, 245, 0.8) !important;
  padding: 10px 24px !important;
  font-size: 15px !important;
}
.hero-sub-btn:hover {
  border-color: #8f2317 !important;
  color: #8f2317 !important;
}

.hero-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  max-width: 800px;
  margin: 44px auto 0;
}
.stat {
  background: rgba(255, 253, 245, 0.92);
  border: 1px solid rgba(212, 168, 78, 0.35);
  border-radius: 14px;
  padding: 18px 12px;
  text-align: center;
  box-shadow: 0 4px 14px rgba(90, 60, 20, 0.05);
  transition: transform 0.25s ease;
}
.stat-num {
  font-family: var(--zi-font-serif, serif);
  font-size: 28px;
  font-weight: 800;
  color: #8f2317;
}
.stat-label {
  font-size: 12px;
  color: #7a6b54;
  margin-top: 4px;
}

/* ---------- Sections ---------- */
.section {
  max-width: 1160px;
  margin: 0 auto;
  padding: 64px 24px 24px;
}
.sec-title-wrap {
  text-align: center;
  margin-bottom: 44px;
}
.sec-subtitle {
  font-size: 11px;
  letter-spacing: 0.16em;
  color: #8f2317;
  font-weight: 700;
  margin-bottom: 8px;
}
.section-title {
  font-family: var(--zi-font-serif, serif);
  font-size: 30px;
  color: #2b2218;
  margin: 0 0 10px;
  font-weight: 700;
}
.section-desc {
  font-size: 14px;
  color: #6d5b45;
  margin: 0;
}

/* ---------- Feature cards ---------- */
.feature-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 22px;
}
.feature-card {
  position: relative;
  background: #fffdf5;
  border: 1px solid rgba(180, 134, 31, 0.25);
  border-radius: 16px;
  padding: 24px 22px 20px;
  cursor: pointer;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(90, 60, 20, 0.05);
  display: flex;
  flex-direction: column;
  transition: transform 0.3s cubic-bezier(0.2, 0, 0, 1), box-shadow 0.3s ease, border-color 0.3s ease;
}
.feature-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--fc, #a03526);
  opacity: 0;
  transition: opacity 0.3s ease;
}
.feature-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 12px 28px rgba(143, 35, 23, 0.12);
  border-color: rgba(180, 134, 31, 0.55);
}
.feature-card:hover::before {
  opacity: 1;
}
.feature-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  margin-bottom: 16px;
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.12);
}
.f-icon-svg {
  width: 24px;
  height: 24px;
}
.feature-title {
  font-family: var(--zi-font-serif, serif);
  font-size: 18px;
  color: #2b2218;
  margin: 0 0 8px;
  font-weight: 700;
}
.feature-brief {
  font-size: 13px;
  color: #6d5b45;
  line-height: 1.65;
  margin-bottom: 14px;
}
.feature-list {
  list-style: none;
  padding: 0;
  margin: 0 0 18px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.feature-list li {
  font-size: 12px;
  color: #5c4f3e;
  line-height: 1.45;
  display: flex;
  align-items: flex-start;
  gap: 6px;
}
.p-bullet {
  color: #8f2317;
  font-size: 10px;
  margin-top: 1px;
}
.feature-cta {
  font-size: 12px;
  color: #8f2317;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 12px;
  border-top: 1px dashed rgba(180, 134, 31, 0.25);
}
.f-arrow {
  transition: transform 0.2s ease;
}
.feature-card:hover .f-arrow {
  transform: translateX(4px);
}

/* ---------- Architecture Topology ---------- */
.arch-topology-wrap {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 32px;
}
.arch-layer-box {
  background: #ffffff;
  border: 1px solid rgba(180, 134, 31, 0.28);
  border-radius: 14px;
  padding: 22px 24px;
  box-shadow: 0 4px 14px rgba(90, 60, 20, 0.04);
  display: flex;
  gap: 28px;
  align-items: center;
  transition: transform 0.25s ease, border-color 0.25s ease;
}
.arch-layer-box:hover {
  transform: translateY(-3px);
  border-color: rgba(180, 134, 31, 0.55);
}
.layer-badge-col {
  width: 260px;
  flex-shrink: 0;
}
.layer-seq {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.1em;
  color: #8f2317;
  margin-bottom: 4px;
}
.layer-title {
  font-family: var(--zi-font-serif, serif);
  font-size: 16px;
  font-weight: 700;
  color: #2b2218;
  margin-bottom: 4px;
}
.layer-dir {
  font-family: Consolas, Monaco, monospace;
  font-size: 11px;
  color: #8a7a60;
}
.layer-content-col {
  flex: 1;
}
.layer-desc {
  font-size: 13px;
  color: #6d5b45;
  line-height: 1.6;
  margin: 0 0 10px;
}
.layer-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.layer-chip {
  background: rgba(244, 237, 220, 0.7);
  border: 1px solid rgba(180, 134, 31, 0.25);
  color: #5c4f3e;
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 6px;
}

.tech-tags-wrap {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  padding-top: 10px;
}
.tech-title {
  font-size: 13px;
  font-weight: 700;
  color: #6d5b45;
}
.tech-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.tech-tag {
  padding: 4px 12px;
  border-radius: 999px;
  background: #fffdf5;
  border: 1px solid rgba(180, 134, 31, 0.25);
  font-size: 12px;
  color: #6d5b45;
  transition: all 0.2s ease;
}
.tech-tag:hover {
  border-color: #8f2317;
  color: #8f2317;
  background: rgba(160, 53, 38, 0.05);
}

/* ---------- Steps ---------- */
.section-alt {
  border-top: 1px solid rgba(180, 134, 31, 0.2);
}
.steps {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}
.step {
  background: #ffffff;
  border: 1px solid rgba(180, 134, 31, 0.25);
  border-radius: 14px;
  padding: 22px 20px;
  box-shadow: 0 4px 14px rgba(90, 60, 20, 0.04);
  transition: transform 0.25s ease;
}
.step:hover {
  transform: translateY(-4px);
}
.step-no {
  font-family: var(--zi-font-serif, serif);
  font-size: 24px;
  font-weight: 800;
  color: rgba(180, 134, 31, 0.5);
  margin-bottom: 8px;
}
.step-title {
  font-family: var(--zi-font-serif, serif);
  font-size: 16px;
  font-weight: 700;
  color: #2b2218;
  margin: 0 0 6px;
}
.step-desc {
  font-size: 13px;
  color: #6d5b45;
  margin: 0 0 12px;
}
.step-code {
  background: #2b2218;
  color: #d4a84e;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 12px;
  font-family: Consolas, monospace;
  overflow-x: auto;
  margin: 0;
}

/* ---------- Tips ---------- */
.tips {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-top: 28px;
}
.tip {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  background: #fffdf5;
  border: 1px dashed rgba(180, 134, 31, 0.38);
  border-radius: 12px;
  padding: 16px;
  transition: border-color 0.25s ease;
}
.tip:hover {
  border-color: #8f2317;
}
.tip-icon-box {
  color: #8f2317;
  font-size: 18px;
  margin-top: 2px;
}
.tip-title {
  font-size: 14px;
  font-weight: 700;
  color: #2b2218;
  margin-bottom: 4px;
}
.tip-desc {
  font-size: 12.5px;
  color: #6d5b45;
  line-height: 1.6;
}

/* ---------- Footer ---------- */
.about-footer {
  text-align: center;
  padding: 56px 16px 60px;
  border-top: 1px solid rgba(180, 134, 31, 0.25);
  margin-top: 48px;
}
.footer-seal {
  font-size: 20px;
  color: #8f2317;
  margin-bottom: 12px;
}
.footer-text {
  font-family: var(--zi-font-serif, serif);
  font-size: 15px;
  color: #2b2218;
  font-weight: 600;
  margin: 0 0 6px;
}
.footer-sub {
  font-size: 12.5px;
  color: #8a7a60;
  margin: 0;
}

/* ---------- Scroll reveal ---------- */
.reveal {
  opacity: 0;
  transform: translateY(22px);
  transition: opacity 0.55s ease, transform 0.55s ease;
}
.reveal.visible {
  opacity: 1;
  transform: none;
}

@media (max-width: 960px) {
  .hero-stats {
    grid-template-columns: repeat(2, 1fr);
  }
  .feature-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .arch-layer-box {
    flex-direction: column;
    align-items: flex-start;
    gap: 14px;
  }
  .layer-badge-col {
    width: 100%;
  }
  .steps {
    grid-template-columns: 1fr;
  }
  .tips {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .hero-title {
    font-size: 30px;
  }
  .feature-grid {
    grid-template-columns: 1fr;
  }
  .hero-stats {
    grid-template-columns: 1fr;
  }
}
</style>
