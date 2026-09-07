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
        <div class="hero-badge">
          <span class="badge-dot"></span>
          遗蕴齐鲁 · 平台介绍
        </div>
        <h1 class="hero-title">山东非遗，一张图走读千年</h1>
        <p class="hero-sub">
          这是个以山东非物质文化遗产为核心的数字地图平台：把 185+ 项名录与传承人
          落到一张地图上，支持按地市 / 类别 / 批次浏览、空间分析、图表联动与旅行路线规划。
          在这里，非遗不再是名录里的名字，而是可看、可查、可逛的大地图。
        </p>
        <div class="hero-actions">
          <el-button type="primary" size="large" round @click="go('/')">🚀 进入地图体验</el-button>
          <el-button size="large" round plain @click="scrollTo('#features')">了解功能</el-button>
        </div>
        <div class="hero-stats">
          <div class="stat">
            <div class="stat-num">4</div>
            <div class="stat-label">核心模块</div>
          </div>
          <div class="stat">
            <div class="stat-num">4</div>
            <div class="stat-label">空间分析工具</div>
          </div>
          <div class="stat">
            <div class="stat-num">3</div>
            <div class="stat-label">数据格式支持</div>
          </div>
          <div class="stat">
            <div class="stat-num">3</div>
            <div class="stat-label">三层架构</div>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ 核心功能 ============ -->
    <section id="features" class="section">
      <h2 class="section-title">核心功能</h2>
      <p class="section-desc">四大模块各司其职，组合使用效果更佳 · 点击卡片直接前往</p>
      <div class="feature-grid">
        <div
          v-for="f in features"
          :key="f.title"
          class="feature-card reveal"
          :style="{ '--fc': f.accent }"
          @click="go(f.to)"
        >
          <div class="feature-icon" :style="{ background: f.color }">{{ f.icon }}</div>
          <h3 class="feature-title">{{ f.title }}</h3>
          <p class="feature-brief">{{ f.brief }}</p>
          <ul class="feature-list">
            <li v-for="point in f.points" :key="point">{{ point }}</li>
          </ul>
          <div class="feature-cta">前往体验 →</div>
        </div>
      </div>
    </section>

    <!-- ============ 快速上手 ============ -->
    <section class="section section-alt">
      <h2 class="section-title">快速上手</h2>
      <p class="section-desc">三个步骤，一分钟把系统跑起来</p>
      <div class="steps">
        <div v-for="(s, i) in steps" :key="s.title" class="step reveal">
          <div class="step-no">{{ i + 1 }}</div>
          <h3 class="step-title">{{ s.title }}</h3>
          <p class="step-desc">{{ s.desc }}</p>
          <pre class="step-code"><code>{{ s.code }}</code></pre>
        </div>
      </div>

      <div class="tips">
        <div v-for="t in tips" :key="t.title" class="tip reveal">
          <span class="tip-icon">💡</span>
          <div>
            <div class="tip-title">{{ t.title }}</div>
            <div class="tip-desc">{{ t.desc }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ 技术架构 ============ -->
    <section class="section">
      <h2 class="section-title">技术架构</h2>
      <p class="section-desc">三层分离 + 前后端协作，结构清晰、易于扩展</p>
      <div class="arch-grid">
        <div v-for="a in arch" :key="a.name" class="arch-card reveal">
          <div class="arch-name">{{ a.name }}</div>
          <div class="arch-dir">{{ a.dir }}</div>
          <div class="arch-desc">{{ a.desc }}</div>
        </div>
      </div>
      <div class="tech-tags">
        <span v-for="t in tech" :key="t" class="tech-tag reveal">{{ t }}</span>
      </div>
    </section>

    <footer class="about-footer">
      <p>遗蕴齐鲁 · 山东非遗数字地图 · Vue3 + OpenLayers + ECharts · 愿与你同行 🗺️</p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue';
import { useRouter, type RouteLocationRaw } from 'vue-router';
import { useUserStore } from '@/services/stores/userStore';

const router = useRouter();
const userStore = useUserStore();
function tryLogin() {
  router.push({ path: '/login' });
}

const features: Array<{
  icon: string;
  accent: string;
  color: string;
  title: string;
  brief: string;
  points: string[];
  to: RouteLocationRaw;
}> = [
  {
    icon: '🗺️',
    accent: '#a03526',
    color: 'linear-gradient(135deg, #a03526, #3f7a6f)',
    title: '地图主页',
    brief: '基于 OpenLayers 的交互式地图，直观呈现山东非遗的空间分布。',
    points: [
      '类别 / 地市 / 批次 / 关键词多维筛选',
      '点击点位或列表项查看非遗详情',
      '时空演变滑块，按批次播放演进',
      '一键定位山东全景',
    ],
    to: '/',
  },
  {
    icon: '📁',
    accent: '#4c7a3f',
    color: 'linear-gradient(135deg, #4c7a3f, #7fae6d)',
    title: '数据管理',
    brief: '上传自己的空间数据，转换体检后叠加到地图展示。',
    points: [
      '支持 GeoJSON / Shapefile / Excel',
      '自动转换 + 数据体检（越界 / 缺坐标 / 空值）',
      '一键加载到地图并跳转定位',
    ],
    to: '/data',
  },
  {
    icon: '📐',
    accent: '#7a3548',
    color: 'linear-gradient(135deg, #7a3548, #b98a9a)',
    title: '空间分析',
    brief: '内置四项常用空间分析工具，探索数据背后的规律。',
    points: [
      '测距 / 测面量算',
      '缓冲区分析：半径内非遗统计',
      '叠加统计：绘制多边形统计点位',
      '寻访路线：行程单 + 沿途推荐',
    ],
    to: { path: '/', query: { tool: 'analysis' } },
  },
  {
    icon: '📊',
    accent: '#b4861f',
    color: 'linear-gradient(135deg, #b4861f, #d9ab3f)',
    title: '图表可视化',
    brief: 'ECharts 多图联动，点击图表即可反查筛选。',
    points: [
      '类别分布饼图',
      '地市排行（点击筛选）',
      '申报批次趋势',
      '热门类别 TOP5（点击筛选）',
    ],
    to: '/chart',
  },
];

const steps = [
  { title: '安装依赖', desc: '首次使用先安装项目依赖（只需一次）', code: 'npm install' },
  { title: '启动前端', desc: '开发服务器默认端口 8000', code: 'npm run dev' },
  { title: '启动后端（可选）', desc: '提供天地图代理与数据转换接口', code: 'npm run server' },
];

const tips = [
  { title: '从地图开始', desc: '在地图主页左侧「非遗筛选」面板筛选，点击点位即可查看详情。' },
  { title: '图表反查筛选', desc: '在图表页点击柱状图或饼图，可设置筛选并跳回地图联动展示。' },
  { title: '上传自己的数据', desc: '数据管理页支持 shp / geojson / excel，体检通过后一键加载到地图。' },
];

const arch = [
  {
    name: '显示层',
    dir: 'src/views · src/components',
    desc: '页面与组件：地图容器、可折叠面板、图表卡片',
  },
  {
    name: '逻辑层',
    dir: 'src/services',
    desc: '地图业务适配器、空间分析（Turf.js）、Pinia 状态管理',
  },
  {
    name: '数据层',
    dir: 'src/data',
    desc: '接口请求与数据源适配：天地图 / GeoJSON / SHP / Excel',
  },
];

const tech = [
  'Vue 3',
  'TypeScript',
  'Vite',
  'OpenLayers',
  'ECharts',
  'Element Plus',
  'Pinia',
  'Vue Router',
  'Turf.js',
  'Express',
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
  background: linear-gradient(180deg, #f4ecda 0%, #f7f9fc 26%, #ffffff 52%);
  overflow: hidden;
}

/* ---------- Hero ---------- */
.hero {
  position: relative;
  padding: 72px 24px 56px;
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
  background: radial-gradient(ellipse at 50% -20%, rgba(24, 144, 255, 0.16), transparent 60%);
}
.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(6px);
  opacity: 0.55;
  animation: float 8s ease-in-out infinite;
}
.orb-1 {
  width: 240px;
  height: 240px;
  top: -60px;
  left: 8%;
  background: radial-gradient(circle at 30% 30%, rgba(24, 144, 255, 0.35), transparent 70%);
}
.orb-2 {
  width: 200px;
  height: 200px;
  top: 24px;
  right: 10%;
  background: radial-gradient(circle at 60% 40%, rgba(54, 207, 201, 0.32), transparent 70%);
  animation-delay: -3s;
}
.orb-3 {
  width: 160px;
  height: 160px;
  bottom: -40px;
  left: 32%;
  background: radial-gradient(circle at 50% 50%, rgba(114, 46, 209, 0.22), transparent 70%);
  animation-delay: -5s;
}
@keyframes float {
  0%,
  100% {
    transform: translateY(0) scale(1);
  }
  50% {
    transform: translateY(-18px) scale(1.06);
  }
}

.hero-inner {
  position: relative;
  z-index: 1;
  max-width: 860px;
  margin: 0 auto;
}
.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border-radius: 999px;
  background: rgba(24, 144, 255, 0.1);
  border: 1px solid rgba(24, 144, 255, 0.25);
  color: #a03526;
  font-size: 13px;
  font-weight: 600;
  animation: rise 0.7s ease both;
}
.badge-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #a03526;
  animation: pulse 1.6s ease-in-out infinite;
}
@keyframes pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(24, 144, 255, 0.5);
  }
  50% {
    box-shadow: 0 0 0 6px rgba(24, 144, 255, 0);
  }
}
.hero-title {
  font-size: 42px;
  line-height: 1.2;
  margin: 18px 0 12px;
  background: linear-gradient(120deg, #a03526, #7a3548);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: rise 0.8s 0.08s ease both;
}
.hero-sub {
  font-size: 15px;
  color: #5a6472;
  line-height: 1.9;
  max-width: 640px;
  margin: 0 auto 26px;
  animation: rise 0.8s 0.16s ease both;
}
.hero-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
  animation: rise 0.8s 0.24s ease both;
}
.hero-stats {
  display: flex;
  justify-content: center;
  gap: 44px;
  flex-wrap: wrap;
  margin-top: 42px;
  animation: rise 0.8s 0.32s ease both;
}
.stat {
  text-align: center;
}
.stat-num {
  font-size: 28px;
  font-weight: 800;
  color: #a03526;
}
.stat-label {
  font-size: 12px;
  color: #8a94a6;
  margin-top: 2px;
}
@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(18px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

/* ---------- Sections ---------- */
.section {
  max-width: 1100px;
  margin: 0 auto;
  padding: 48px 24px 8px;
}
.section-title {
  text-align: center;
  font-size: 26px;
  margin-bottom: 6px;
}
.section-desc {
  text-align: center;
  color: #8a94a6;
  font-size: 14px;
  margin-bottom: 32px;
}

/* ---------- Feature cards ---------- */
.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 18px;
}
.feature-card {
  position: relative;
  background: #fff;
  border: 1px solid #eadfc6;
  border-radius: 14px;
  padding: 22px 20px 18px;
  cursor: pointer;
  overflow: hidden;
  transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
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
  transform: translateY(-6px);
  box-shadow: 0 14px 30px rgba(24, 144, 255, 0.14);
  border-color: rgba(24, 144, 255, 0.3);
}
.feature-card:hover::before {
  opacity: 1;
}
.feature-icon {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  color: #fff;
  margin-bottom: 14px;
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.14);
}
.feature-title {
  font-size: 17px;
  margin-bottom: 6px;
}
.feature-brief {
  font-size: 13px;
  color: #6b7280;
  line-height: 1.7;
  margin-bottom: 10px;
}
.feature-list {
  list-style: none;
  padding: 0;
  margin: 0 0 14px;
}
.feature-list li {
  font-size: 12.5px;
  color: #4b5563;
  padding: 3px 0 3px 18px;
  position: relative;
}
.feature-list li::before {
  content: '✓';
  position: absolute;
  left: 0;
  color: #4c7a3f;
  font-weight: 700;
}
.feature-cta {
  font-size: 13px;
  color: #a03526;
  font-weight: 600;
  opacity: 0.85;
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.feature-card:hover .feature-cta {
  opacity: 1;
  transform: translateX(4px);
}

/* ---------- Steps ---------- */
.steps {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 18px;
}
.step {
  background: #fff;
  border: 1px solid #eadfc6;
  border-radius: 14px;
  padding: 22px 20px;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}
.step:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 24px rgba(24, 144, 255, 0.1);
}
.step-no {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: linear-gradient(135deg, #a03526, #3f7a6f);
  color: #fff;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
  font-size: 16px;
}
.step-title {
  font-size: 16px;
  margin-bottom: 6px;
}
.step-desc {
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 10px;
}
.step-code {
  background: #2a3a31;
  color: #c99b3f;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 12px;
  overflow-x: auto;
  margin: 0;
}

/* ---------- Tips ---------- */
.tips {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 14px;
  margin-top: 28px;
}
.tip {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  background: #fff;
  border: 1px dashed #d8cba6;
  border-radius: 12px;
  padding: 16px;
  transition: border-color 0.25s ease, background 0.25s ease;
}
.tip:hover {
  border-color: #a03526;
  background: #f7f1e0;
}
.tip-icon {
  font-size: 20px;
}
.tip-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 4px;
}
.tip-desc {
  font-size: 12.5px;
  color: #6b7280;
  line-height: 1.7;
}

/* ---------- Architecture ---------- */
.arch-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 18px;
  margin-bottom: 30px;
}
.arch-card {
  background: #fff;
  border-radius: 14px;
  padding: 20px;
  border: 1px solid #eadfc6;
  text-align: center;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}
.arch-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 24px rgba(24, 144, 255, 0.1);
}
.arch-name {
  font-size: 16px;
  font-weight: 700;
  color: #a03526;
  margin-bottom: 4px;
}
.arch-dir {
  font-size: 12px;
  color: #8a94a6;
  font-family: Consolas, Monaco, monospace;
  margin-bottom: 8px;
}
.arch-desc {
  font-size: 12.5px;
  color: #4b5563;
  line-height: 1.7;
}
.tech-tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  padding-bottom: 8px;
}
.tech-tag {
  padding: 6px 14px;
  border-radius: 999px;
  background: #fff;
  border: 1px solid #e6dbc0;
  font-size: 12.5px;
  color: #4b5563;
  transition: all 0.25s ease;
}
.tech-tag:hover {
  border-color: #a03526;
  color: #a03526;
  background: #f0e7cd;
  transform: translateY(-2px);
}

/* ---------- Scroll reveal ---------- */
.reveal {
  opacity: 0;
  transform: translateY(26px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}
.reveal.visible {
  opacity: 1;
  transform: none;
}

.about-footer {
  text-align: center;
  padding: 44px 16px 48px;
  color: #8a94a6;
  font-size: 13px;
}

/* ===== 非遗国潮 · 对比度修正（冷灰字 -> 暖墨，浅底可读性）===== */
.hero-badge {
  background: rgba(184, 134, 31, 0.14);
  border-color: rgba(184, 134, 31, 0.35);
}
.hero-sub { color: #5a4a33; }
.stat-label { color: #6c5f47; }
.section-desc { color: #6c5f47; }
.feature-brief { color: #4f4634; }
.feature-list li { color: #4a3f2e; }
.feature-cta { opacity: 1; }
.about-footer { color: #6c5f47; }
.hero-bg::before {
  background: radial-gradient(ellipse at 50% -20%, rgba(184, 134, 31, 0.14), transparent 62%);
}
.orb-1 { background: radial-gradient(circle at 30% 30%, rgba(184, 134, 31, 0.30), transparent 70%); }
.orb-2 { background: radial-gradient(circle at 60% 40%, rgba(63, 122, 111, 0.26), transparent 70%); }
.orb-3 { background: radial-gradient(circle at 50% 50%, rgba(122, 53, 72, 0.22), transparent 70%); }

/* ===== 访客顶栏（免登录浏览 About 时返回登录）===== */
.guest-bar {
  position: sticky;
  top: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 22px;
  background: var(--zi-bg, #f4ecda);
  border-bottom: 1px solid #d9c9a0;
}
.guest-bar .guest-back,
.guest-bar .guest-login { cursor: pointer; }
.guest-back { color: #6c2c1c; font-weight: 600; text-decoration: none; }
.guest-login {
  color: #fff;
  background: #8f2317;
  border-radius: 4px;
  padding: 6px 12px;
  font-size: 13px;
  text-decoration: none;
}
.guest-tip { color: #6c5f47; font-size: 13px; }
</style>
