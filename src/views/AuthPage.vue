<template>
  <div class="auth-page">
    <!-- ============ Section 1: 首屏左右分栏（天象星轨/经纬罗盘几何特效 + 平台亮点 + 白玉温润卡片） ============ -->
    <section
      class="hero-section"
      :style="{
        backgroundImage: `linear-gradient(135deg, rgba(248, 244, 234, 0.94) 0%, rgba(240, 233, 218, 0.88) 50%, rgba(246, 240, 228, 0.95) 100%), url(${HD_ASSETS.heroBg})`,
      }"
    >
      <!-- 背景：齐鲁九宫经纬网与天象星轨罗盘几何特效 -->
      <div class="geometric-astrolabe" aria-hidden="true">
        <svg class="astrolabe-svg" viewBox="0 0 600 600" fill="none">
          <!-- 空间经纬刻度圈与星轨 -->
          <circle cx="300" cy="300" r="280" stroke="rgba(180, 134, 31, 0.16)" stroke-width="1.5" stroke-dasharray="4 8" />
          <circle cx="300" cy="300" r="246" stroke="rgba(160, 53, 38, 0.12)" stroke-width="1" />
          <circle cx="300" cy="300" r="208" stroke="rgba(180, 134, 31, 0.22)" stroke-width="1.5" stroke-dasharray="14 6 2 6" class="spin-slow" />
          <circle cx="300" cy="300" r="162" stroke="rgba(160, 53, 38, 0.18)" stroke-width="1" stroke-dasharray="6 12" class="spin-reverse" />
          <circle cx="300" cy="300" r="110" stroke="rgba(180, 134, 31, 0.28)" stroke-width="1" />

          <!-- 经纬十字坐标轴 -->
          <line x1="20" y1="300" x2="580" y2="300" stroke="rgba(180, 134, 31, 0.2)" stroke-width="1" stroke-dasharray="6 6" />
          <line x1="300" y1="20" x2="300" y2="580" stroke="rgba(180, 134, 31, 0.2)" stroke-width="1" stroke-dasharray="6 6" />

          <!-- 八卦/天极几何方阵 -->
          <rect x="230" y="230" width="140" height="140" stroke="rgba(160, 53, 38, 0.15)" stroke-width="1" transform="rotate(45 300 300)" class="spin-slow" />
          <rect x="250" y="250" width="100" height="100" stroke="rgba(180, 134, 31, 0.18)" stroke-width="1" />

          <!-- 齐鲁地理中心点 -->
          <circle cx="300" cy="300" r="5" fill="#a03526" />
          <circle cx="300" cy="300" r="14" stroke="#a03526" stroke-width="1" opacity="0.3" class="pulse-ring" />
        </svg>
      </div>

      <div class="hero-container">
        <!-- 左侧：非遗平台深度介绍、经纬基准与统计指标 -->
        <div class="hero-left">
          <div class="hero-badge shimmer-badge">
            <span class="badge-dot"></span>
            国家文化数字化战略实践 · 齐鲁非遗时空云台
          </div>

          <!-- 空间基准经纬标签 -->
          <div class="geo-coord-pill">
            <span class="coord-label">❖ 齐鲁基准</span>
            <span class="coord-val">N 36°39′ / E 117°00′</span>
            <span class="coord-sep">·</span>
            <span class="coord-proj">CGCS2000 / WGS84 双基准</span>
          </div>

          <h1 class="hero-title">
            山东非遗<br />
            <span class="title-highlight">一张图走读齐鲁千年</span>
          </h1>

          <p class="hero-desc">
            汇聚齐鲁大地 <b>185+</b> 项国家级与省级非遗瑰宝。突破传统静态名录壁垒，依托 WebGIS 空间信息模型与时空知识图谱，贯通全域地理、文脉源流、高铁智能文旅与文创活化生态。
          </p>

          <!-- 核心统计指标（宣纸白玉质感卡片） -->
          <div class="stats-bar">
            <div class="stat-item card-lift" v-for="(s, idx) in stats" :key="idx">
              <div class="stat-value">{{ s.num }}</div>
              <div class="stat-name">{{ s.label }}</div>
            </div>
          </div>

          <!-- 平台亮点标签 -->
          <div class="platform-tags">
            <span class="p-tag">❖ 全息时空切片</span>
            <span class="p-tag">❖ Turf.js 拓扑计算</span>
            <span class="p-tag">❖ 12306 智能文旅接驳</span>
            <span class="p-tag">❖ 齐鲁文创活化闭环</span>
          </div>

          <div class="scroll-down-hint" @click="scrollToFeatures">
            <span>探索非遗精选画廊与系统支柱</span>
            <span class="arrow-down">↓</span>
          </div>
        </div>

        <!-- 右侧：国风典雅温润登录/注册卡片 -->
        <div class="hero-right">
          <div class="scholar-auth-card">
            <div class="card-header">
              <div class="card-logo">❖ 遗蕴齐鲁</div>
              <p class="card-subtitle">
                齐风鲁韵 · 数字化时空档案馆
                <span class="blinking-cursor"></span>
              </p>
            </div>

            <!-- 登录 / 注册 模式切换（Google 药丸胶囊轮廓） -->
            <div class="mode-tabs">
              <button
                type="button"
                class="tab-btn"
                :class="{ active: mode === 'login' }"
                @click="switchMode('login')"
              >
                用户登录
              </button>
              <button
                type="button"
                class="tab-btn"
                :class="{ active: mode === 'register' }"
                @click="switchMode('register')"
              >
                快速注册
              </button>
            </div>

            <!-- 登录表单 -->
            <template v-if="mode === 'login'">
              <el-form
                ref="loginFormRef"
                :model="loginForm"
                :rules="loginRules"
                size="large"
                @submit.prevent="onLogin"
                class="auth-form"
              >
                <el-form-item prop="account">
                  <el-input
                    v-model="loginForm.account"
                    placeholder="用户名或邮箱"
                    clearable
                    :prefix-icon="User"
                    @keyup.enter="onLogin"
                  />
                </el-form-item>
                <el-form-item prop="password">
                  <el-input
                    v-model="loginForm.password"
                    type="password"
                    placeholder="请输入密码"
                    show-password
                    :prefix-icon="Key"
                    @keyup.enter="onLogin"
                  />
                </el-form-item>

                <el-button
                  type="primary"
                  class="submit-btn shimmer-btn"
                  :loading="submitting"
                  @click="onLogin"
                >
                  <span>登 录</span>
                  <span class="btn-arrow">→</span>
                </el-button>
              </el-form>

              <!-- 演示快捷入口 -->
              <div class="demo-account-bar">
                <span>演示账号：<b>admin / admin123</b></span>
                <el-button
                  size="small"
                  text
                  type="warning"
                  :loading="setupLoading"
                  @click="onSetupAdmin"
                >
                  一键填入
                </el-button>
              </div>
            </template>

            <!-- 注册表单 -->
            <template v-else>
              <el-form
                ref="regFormRef"
                :model="regForm"
                :rules="regRules"
                size="large"
                @submit.prevent="onRegister"
                class="auth-form"
              >
                <el-form-item prop="username">
                  <el-input
                    v-model="regForm.username"
                    placeholder="用户名（2-20 位）"
                    clearable
                    :prefix-icon="User"
                    @keyup.enter="onRegister"
                  />
                </el-form-item>
                <el-form-item prop="email">
                  <el-input
                    v-model="regForm.email"
                    placeholder="电子邮箱"
                    clearable
                    :prefix-icon="Message"
                    @keyup.enter="onRegister"
                  />
                </el-form-item>
                <el-form-item prop="password">
                  <el-input
                    v-model="regForm.password"
                    type="password"
                    placeholder="密码（6-20 位，支持 !?.- 等符号）"
                    show-password
                    :prefix-icon="Key"
                    @keyup.enter="onRegister"
                  />
                </el-form-item>
                <el-form-item prop="confirmPassword">
                  <el-input
                    v-model="regForm.confirmPassword"
                    type="password"
                    placeholder="请再次输入密码确认"
                    show-password
                    :prefix-icon="Key"
                    @keyup.enter="onRegister"
                  />
                </el-form-item>

                <el-button
                  type="primary"
                  class="submit-btn shimmer-btn"
                  :loading="submitting"
                  @click="onRegister"
                >
                  <span>注册并开启探索</span>
                  <span class="btn-arrow">→</span>
                </el-button>
              </el-form>
            </template>

            <!-- 游客模式直达入口 -->
            <div class="guest-gate">
              <el-button text class="guest-btn" @click="onGuestEnter">
                暂不登录，先去逛逛 →
              </el-button>
            </div>

            <div class="back-nav" v-if="from?.path && from.path !== '/login'">
              <el-link type="info" :underline="false" @click="goBack">← 返回前一页面</el-link>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ Section 2: 传世守望 · 齐鲁非遗精选画廊（真实高精摄影） ============ -->
    <section class="gallery-section" ref="featuresRef">
      <div class="gallery-container">
        <div class="sec-title-wrap">
          <div class="sec-subtitle">HERITAGE MASTERPIECES</div>
          <h2 class="sec-title">传世守望 · 齐鲁非遗瑰宝精选</h2>
          <p class="sec-desc">真实高精镜头下的匠人温度，点击卡片即刻溯源非遗历史与地理空间分布</p>
        </div>

        <div class="gallery-grid">
          <div
            class="gallery-card card-lift"
            v-for="(item, idx) in galleryItems"
            :key="idx"
            @click="onGuestEnter"
          >
            <div class="gallery-cover-wrap">
              <img :src="item.image" :alt="item.name" class="gallery-img" loading="lazy" />
              <div class="gallery-badges">
                <span class="badge-level">❖ {{ item.level }}</span>
                <span class="badge-city">{{ item.city }}</span>
              </div>
              <div class="gallery-category-tag">{{ item.category }}</div>
            </div>
            <div class="gallery-body">
              <h3 class="gallery-title">{{ item.name }}</h3>
              <p class="gallery-quote">“{{ item.quote }}”</p>
              <p class="gallery-desc">{{ item.desc }}</p>
              <div class="gallery-action">
                <span>在空间地图中定位</span>
                <span class="action-arrow">→</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ Section 3: 核心技术支柱（深度文字说明与空间能力解析） ============ -->
    <section class="pillars-section">
      <div class="pillars-container">
        <div class="sec-title-wrap">
          <div class="sec-subtitle">GIS & SPATIAL COMPUTING</div>
          <h2 class="sec-title">四大数字支柱 · 赋能文脉活化</h2>
          <p class="sec-desc">以地理空间为轴，构建“展示、推演、分析、转化”全链条数字化科研体系</p>
        </div>

        <div class="pillars-grid">
          <div class="pillar-card card-lift" v-for="(p, i) in pillarList" :key="i">
            <div class="pillar-header">
              <div class="pillar-num">0{{ i + 1 }}</div>
              <div class="pillar-tag">{{ p.tag }}</div>
            </div>
            <h3 class="pillar-title">{{ p.name }}</h3>
            <p class="pillar-concept">{{ p.concept }}</p>
            <div class="pillar-divider"></div>
            <ul class="pillar-features">
              <li v-for="(f, fi) in p.features" :key="fi">
                <span class="feature-dot">❖</span>
                <span>{{ f }}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ Section 4: 文化收尾横幅 ============ -->
    <section
      class="closing-section"
      :style="{
        backgroundImage: `linear-gradient(rgba(143, 35, 23, 0.88), rgba(74, 20, 14, 0.94)), url(${HD_ASSETS.cultureBanner})`,
      }"
    >
      <div class="closing-container">
        <div class="category-cloud">
          <span v-for="c in categories" :key="c" class="cat-pill">{{ c }}</span>
        </div>
        <h2 class="closing-heading">千年齐鲁文脉 · 方寸地图之间</h2>
        <p class="closing-sub">
          16 地市全域覆盖 · 185+ 传世名录 · 400+ 传承基地 · 走读齐鲁匠人的千年守望
        </p>
        <div class="closing-actions">
          <el-button type="warning" size="large" round class="closing-cta shimmer-btn" @click="scrollToTop">
            <span>立即登录体验</span>
            <span class="btn-arrow">↑</span>
          </el-button>
          <el-button type="info" plain size="large" round class="closing-guest" @click="onGuestEnter">
            <span>游客快捷进入地图 →</span>
          </el-button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { User, Key, Message } from '@element-plus/icons-vue';
import { useUserStore } from '@/services/stores/userStore';
import * as authApi from '@/data/api/auth';
import { HD_ASSETS } from '@/data/sources/assets';

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();

const mode = ref<'login' | 'register'>('login');
const submitting = ref(false);
const setupLoading = ref(false);

const from = (route.query.from ? { path: String(route.query.from) } : null) as { path: string } | null;

const loginFormRef = ref<FormInstance>();
const regFormRef = ref<FormInstance>();
const loginForm = reactive({ account: '', password: '' });
const regForm = reactive({ username: '', email: '', password: '', confirmPassword: '' });

const featuresRef = ref<HTMLElement | null>(null);

// 登录表单规则
const loginRules: FormRules = {
  account: [{ required: true, message: '请输入用户名或邮箱', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
};

// 注册表单规则（放宽特殊字符限制）
const regRules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9_\u4e00-\u9fa5]{2,20}$/, message: '2-20 位字母、数字、下划线或中文', trigger: 'blur' },
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    {
      validator: (_r: any, v: string, cb: any) => {
        if (!v) return cb(new Error('请输入密码'));
        // 密码需 6-20 位，支持字母、数字及常规特殊符号如 !?.-@#$%&*
        if (v.length < 6 || v.length > 20 || !/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d_@#$%&*!?.-]{6,20}$/.test(v)) {
          return cb(new Error('密码需 6-20 位，且包含字母与数字（支持 !?.- 等符号）'));
        }
        cb();
      },
      trigger: 'blur',
    },
  ],
  confirmPassword: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    {
      validator: (_r, v: string, cb) => (v !== regForm.password ? cb(new Error('两次输入的密码不一致')) : cb()),
      trigger: 'blur',
    },
  ],
};

// 切换模式：自动清除红色报错信息
function switchMode(targetMode: 'login' | 'register') {
  mode.value = targetMode;
  loginFormRef.value?.clearValidate();
  regFormRef.value?.clearValidate();
}

// 统计亮点
const stats = [
  { num: '185+', label: '非遗名录' },
  { num: '16', label: '齐鲁地市' },
  { num: '10', label: '文化门类' },
  { num: '4', label: '空间核心' },
];

// 齐鲁非遗精选画廊展示数据（真实高精摄影 + 传世诗赋 + 文化名录）
const galleryItems = [
  {
    name: '潍坊风筝制作技艺',
    category: '传统技艺',
    city: '潍坊市',
    level: '国家级非遗',
    desc: '银线引长风，巧扎纸鸢舞碧霄。潍坊风筝结构严密，绘工典雅，融汇民间木版年画彩绘，享誉海内外。',
    quote: '草长莺飞二月天，拂堤杨柳醉春烟',
    image: HD_ASSETS.galleryWeifangKite,
  },
  {
    name: '琉璃烧制技艺',
    category: '传统技艺',
    city: '淄博市',
    level: '国家级非遗',
    desc: '炉火千度淬晶莹，五色斑斓凝温润。淄博博山琉璃秉承千年炉火，鸡油黄、松石绿天下无双。',
    quote: '炉火凝晶玉，五色绚流光',
    image: HD_ASSETS.galleryZiboGlass,
  },
  {
    name: '泰山皮影戏',
    category: '传统戏剧',
    city: '泰安市',
    level: '人类非遗',
    desc: '隔帐陈千古，十指做弄影。泰山皮影独创“十不闲”绝技，一人操持全部乐器与说唱，生旦净丑跃然影窗。',
    quote: '一口道尽千古事，双手对舞百万兵',
    image: HD_ASSETS.galleryTaishanShadow,
  },
  {
    name: '杨家埠木版年画',
    category: '传统美术',
    city: '潍坊市',
    level: '国家级非遗',
    desc: '勾描雕版刷木墨，红绿朱黄染丰年。线条遒劲简练，色彩热烈浓郁，饱含齐鲁乡土质朴深情。',
    quote: '丹青印福瑞，纸上染吉庆',
    image: HD_ASSETS.galleryYangjiabuPrint,
  },
  {
    name: '鲁锦织造技艺',
    category: '传统技艺',
    city: '菏泽 / 济宁',
    level: '国家级非遗',
    desc: '七十二道纯手工工艺，提花织锦巧夺天工。以天然纯棉精织而成，纹饰吉祥古雅，温润舒展。',
    quote: '唧唧复唧唧，经纬织锦华',
    image: HD_ASSETS.galleryLujinBrocade,
  },
  {
    name: '高密剪纸',
    category: '传统美术',
    city: '高密市',
    level: '国家级非遗',
    desc: '一把剪刀裁岁月，万象风华现纸间。剪法洗练拙朴中见灵动，与扑灰年画、茂腔并称高密四宝。',
    quote: '巧手运神剪，灵秀赋纸间',
    image: HD_ASSETS.galleryGaomiPapercut,
  },
];

// 四大数字时空支柱（专业 WebGIS 架构与文化赋能深度阐释）
const pillarList = [
  {
    tag: '时空演绎',
    name: '全息时空切片引擎',
    concept: '打通 2006 至 2021 五大批次演进历程，时间轴拖拽式推演，动态还原齐鲁非遗随历史保护政策的地理扩散图谱。',
    features: [
      '五批次申报时间轴连续拖拽播放',
      '地市级时空切片与历史演变热力',
      '国家级 / 省级多层级保护等级穿透',
    ],
  },
  {
    tag: '空间拓扑',
    name: 'Turf.js 空间计算引擎',
    concept: '集成专业 GIS 拓扑算法，毫秒级生成多级同心缓冲区（5km/10km/20km），量化揭示黄河与大运河沿岸非遗空间集聚。',
    features: [
      '多级同心圆缓冲区与要素实时统计',
      '多边形圈选测面测距与空间重叠率',
      '点位空间聚类（Cluster）与密度核热力',
    ],
  },
  {
    tag: '智慧文旅',
    name: '12306 智能文旅接驳',
    concept: '接驳京沪、济青高铁等骨干交通枢纽，算法智能串联沿途非遗传承工坊与自驾路网，定制沉浸式文化打卡路书。',
    features: [
      '高铁枢纽至非遗工坊末梢接驳规划',
      '沿途非遗打卡点智能拓扑推荐',
      '一键生成自驾/研学行程路书与高精出图',
    ],
  },
  {
    tag: '文态活化',
    name: '齐鲁文创活化生态',
    concept: '器物直连代表性传承人工坊，打通“地图探索 - 空间导航 - 工艺溯源 - 文创研学”闭环，让古老技艺活化于当代生活。',
    features: [
      '每件器物精准反向溯源非遗大师与原产地',
      '非遗工坊实景研学体验预约预订',
      '匠心手作白玉卡片式沉浸鉴赏与交互',
    ],
  },
];

const categories = ['民间文学', '传统音乐', '传统舞蹈', '传统戏剧', '曲艺', '游艺与杂技', '传统美术', '传统技艺', '传统医药', '民俗'];

function goBack() {
  router.back();
}

function goHome() {
  router.push(from && from.path.startsWith('/') ? from.path : '/');
}

// 游客模式入口
function onGuestEnter() {
  userStore.enterGuestMode();
  ElMessage.success('已开启游客免登录浏览模式，欢迎体验！');
  goHome();
}

async function onLogin() {
  if (!loginFormRef.value) return;
  const ok = await loginFormRef.value.validate().catch(() => false);
  if (!ok) return;
  submitting.value = true;
  try {
    await userStore.login(loginForm.account.trim(), loginForm.password);
    ElMessage.success('登录成功，欢迎探索遗蕴齐鲁！');
    goHome();
  } catch (e: any) {
    ElMessage.error(e.response?.data?.msg || '登录失败，请检查账号与密码');
  } finally {
    submitting.value = false;
  }
}

async function onRegister() {
  if (!regFormRef.value) return;
  const ok = await regFormRef.value.validate().catch(() => false);
  if (!ok) return;
  submitting.value = true;
  try {
    const user = await userStore.register({
      username: regForm.username.trim(),
      email: regForm.email.trim(),
      password: regForm.password,
    });
    ElMessage.success(`注册成功，欢迎 ${user.username}！`);
    goHome();
  } catch (e: any) {
    ElMessage.error(e.response?.data?.msg || '注册失败');
  } finally {
    submitting.value = false;
  }
}

async function onSetupAdmin() {
  setupLoading.value = true;
  try {
    await authApi.ensureAdmin({ username: 'admin', email: 'admin@webgis.test', password: 'admin123' });
    ElMessage.success('管理员演示账号已就绪：admin / admin123');
    loginForm.account = 'admin';
    loginForm.password = 'admin123';
    switchMode('login');
  } catch (e: any) {
    ElMessage.error(e.response?.data?.msg || '初始化演示账号失败');
  } finally {
    setupLoading.value = false;
  }
}

function scrollToFeatures() {
  if (featuresRef.value) {
    featuresRef.value.scrollIntoView({ behavior: 'smooth' });
  } else {
    const main = document.querySelector('.main-area');
    if (main) main.scrollTo({ top: 780, behavior: 'smooth' });
    else window.scrollTo({ top: 780, behavior: 'smooth' });
  }
}

function scrollToTop() {
  const main = document.querySelector('.main-area');
  if (main) {
    main.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  background: var(--zi-bg, #f4eddc);
  color: var(--zi-ink, #3a3125);
  overflow-x: hidden;
}

/* ================= 首屏：左右对称温润国风区 ================= */
.hero-section {
  min-height: calc(100vh - 60px);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  box-sizing: border-box;
  position: relative;
  overflow: hidden;
}

/* 齐鲁经纬罗盘与天象星轨几何特效 */
.geometric-astrolabe {
  position: absolute;
  top: -80px;
  left: 2%;
  width: 680px;
  height: 680px;
  pointer-events: none;
  z-index: 0;
  opacity: 0.75;
}
.astrolabe-svg {
  width: 100%;
  height: 100%;
}
@keyframes spinSlow {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@keyframes spinReverse {
  from { transform: rotate(360deg); }
  to { transform: rotate(0deg); }
}
@keyframes pulseRing {
  0%, 100% { transform: scale(1); opacity: 0.3; }
  50% { transform: scale(1.8); opacity: 0.7; }
}
.spin-slow {
  transform-origin: 300px 300px;
  animation: spinSlow 80s linear infinite;
}
.spin-reverse {
  transform-origin: 300px 300px;
  animation: spinReverse 50s linear infinite;
}
.pulse-ring {
  transform-origin: 300px 300px;
  animation: pulseRing 3.5s ease-in-out infinite;
}

.hero-container {
  width: 100%;
  max-width: 1160px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 56px;
  position: relative;
  z-index: 1;
}

/* 左侧信息 */
.hero-left {
  flex: 1;
  max-width: 580px;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 18px;
  border-radius: 999px;
  background: rgba(160, 53, 38, 0.08);
  border: 1px solid rgba(160, 53, 38, 0.25);
  color: #8f2317;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.05em;
  margin-bottom: 14px;
  backdrop-filter: blur(8px);
}
@keyframes pulseDot {
  0%, 100% { transform: scale(1); opacity: 0.9; }
  50% { transform: scale(1.35); opacity: 0.5; }
}
.badge-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #8f2317;
  animation: pulseDot 2.4s infinite ease-in-out;
}

/* 空间基准经纬标签 */
.geo-coord-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 999px;
  background: rgba(180, 134, 31, 0.1);
  border: 1px solid rgba(180, 134, 31, 0.32);
  font-family: "Consolas", "Courier New", monospace;
  font-size: 11px;
  color: #836420;
  margin-bottom: 18px;
  backdrop-filter: blur(4px);
}
.coord-label {
  font-weight: 700;
  color: #8f2317;
}
.coord-sep {
  opacity: 0.5;
}
.coord-proj {
  color: #6a5d4c;
}

.hero-title {
  font-family: var(--zi-font-serif, "Noto Serif SC", "Songti SC", serif);
  font-size: 44px;
  line-height: 1.25;
  font-weight: 700;
  margin: 0 0 18px;
  letter-spacing: 0.04em;
  color: #2b2218;
}
.title-highlight {
  color: #8f2317;
  background: linear-gradient(180deg, #9a281c 0%, #6e1a10 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-desc {
  font-size: 15px;
  line-height: 1.75;
  color: #5c4f3e;
  margin-bottom: 28px;
}

/* 统计横条：宣纸白玉质感 */
.stats-bar {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 26px;
}
.stat-item {
  background: rgba(255, 253, 244, 0.92);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(212, 168, 78, 0.38);
  border-radius: 14px;
  padding: 14px 10px;
  text-align: center;
  box-shadow: 0 4px 14px rgba(90, 60, 20, 0.05);
  transition: transform 0.25s var(--zi-ease-spring, cubic-bezier(0.16, 1, 0.3, 1));
}
.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #8f2317;
  font-family: var(--zi-font-serif, serif);
}
.stat-name {
  font-size: 12px;
  color: #7a6b54;
  margin-top: 4px;
}

/* 平台亮点标签 */
.platform-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 28px;
}
.p-tag {
  font-size: 12px;
  color: #6a5a44;
  background: rgba(240, 232, 214, 0.85);
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid rgba(180, 134, 31, 0.25);
  transition: all 200ms var(--zi-ease-spring, cubic-bezier(0.16, 1, 0.3, 1));
}
.p-tag:hover {
  background: rgba(255, 253, 244, 0.95);
  border-color: rgba(180, 134, 31, 0.6);
  transform: translateY(-1px);
}

.scroll-down-hint {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #8a7b66;
  cursor: pointer;
  transition: color 0.2s;
}
.scroll-down-hint:hover {
  color: #8f2317;
}
.arrow-down {
  font-size: 14px;
  transition: transform 0.2s;
}
.scroll-down-hint:hover .arrow-down {
  transform: translateY(2px);
}

/* 右侧白玉国风卡片 */
.hero-right {
  width: 420px;
  flex-shrink: 0;
}
.scholar-auth-card {
  background: rgba(255, 253, 245, 0.94);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 22px;
  padding: 32px 28px;
  box-shadow: 0 18px 44px -6px rgba(100, 60, 20, 0.09), 0 4px 14px -2px rgba(100, 60, 20, 0.04);
  border: 1px solid rgba(212, 168, 78, 0.45);
  position: relative;
  overflow: hidden;
}
.scholar-auth-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #9a281c 0%, #d4a84e 50%, #9a281c 100%);
}

.card-header {
  text-align: center;
  margin-bottom: 22px;
}
.card-logo {
  font-family: var(--zi-font-serif, serif);
  font-size: 24px;
  font-weight: 700;
  color: #8f2317;
  letter-spacing: 0.08em;
}
.card-subtitle {
  font-size: 12px;
  color: #8a7a60;
  margin: 5px 0 0;
}

/* Google / Antigravity 汲取：药丸轮廓选项卡切换 */
.mode-tabs {
  display: flex;
  background: rgba(234, 225, 205, 0.65);
  border-radius: 999px;
  padding: 4px;
  margin-bottom: 22px;
  border: 1px solid rgba(212, 168, 78, 0.28);
}
.tab-btn {
  flex: 1;
  border: none;
  background: transparent;
  padding: 9px 0;
  font-size: 14px;
  font-weight: 600;
  color: #6d5b45;
  border-radius: 999px;
  cursor: pointer;
  transition: all 220ms var(--zi-ease-spring, cubic-bezier(0.16, 1, 0.3, 1));
}
.tab-btn:hover:not(.active) {
  background: rgba(255, 255, 255, 0.55);
  color: #2b2218;
}
.tab-btn.active {
  background: #9a281c;
  color: #fffaf0;
  box-shadow: 0 4px 14px -2px rgba(154, 40, 28, 0.38);
}

.auth-form :deep(.el-input__wrapper) {
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 0 0 1px #d6cbb8 inset;
  transition: all 180ms ease;
}
.auth-form :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1.5px #8f2317 inset, 0 0 0 3px rgba(143, 35, 23, 0.12);
}

.submit-btn {
  width: 100%;
  height: 44px;
  background: linear-gradient(135deg, #9a281c 0%, #7e1e13 100%) !important;
  border: none !important;
  border-radius: 999px !important;
  font-size: 15px !important;
  font-weight: 600 !important;
  letter-spacing: 0.05em;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 6px;
  box-shadow: 0 6px 18px -2px rgba(154, 40, 28, 0.35);
  transition: all 200ms var(--zi-ease-spring, cubic-bezier(0.16, 1, 0.3, 1)) !important;
}
.submit-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 24px -2px rgba(154, 40, 28, 0.45);
  filter: brightness(1.04);
}
.submit-btn:active {
  transform: scale(0.98);
}
.btn-arrow {
  display: inline-block;
  transition: transform 200ms var(--zi-ease-spring, cubic-bezier(0.16, 1, 0.3, 1));
  font-size: 16px;
}
.submit-btn:hover .btn-arrow {
  transform: translateX(4px);
}

.demo-account-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 14px;
  padding: 8px 12px;
  background: #fdf8ed;
  border-radius: 6px;
  font-size: 12px;
  color: #8f6517;
  border: 1px dashed #deb866;
}

.guest-gate {
  text-align: center;
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid #ebdcc5;
}
.guest-btn {
  color: #8f2317;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.guest-btn:hover {
  color: #b0371f;
  text-decoration: underline;
}

.back-nav {
  text-align: center;
  margin-top: 8px;
}

/* ================= Section 2: 齐鲁非遗精选摄影画廊 ================= */
.gallery-section {
  padding: 76px 24px;
  background: #f7f1e1;
  border-top: 1px solid #dccfa6;
}
.gallery-container {
  max-width: 1160px;
  margin: 0 auto;
}
.sec-title-wrap {
  text-align: center;
  margin-bottom: 48px;
}
.sec-subtitle {
  font-size: 11px;
  letter-spacing: 0.16em;
  color: #8f2317;
  font-weight: 700;
  margin-bottom: 8px;
}
.sec-title {
  font-family: var(--zi-font-serif, serif);
  font-size: 32px;
  color: #2b2218;
  margin: 0 0 10px;
}
.sec-desc {
  font-size: 14px;
  color: #6e604f;
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}
.gallery-card {
  background: #fffdf5;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 18px rgba(90, 60, 20, 0.06);
  border: 1px solid rgba(180, 134, 31, 0.28);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  transition: transform 0.35s cubic-bezier(0.2, 0, 0, 1), box-shadow 0.35s ease, border-color 0.35s ease;
}
.gallery-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 14px 32px -4px rgba(143, 35, 23, 0.14);
  border-color: rgba(180, 134, 31, 0.6);
}
.gallery-cover-wrap {
  height: 200px;
  overflow: hidden;
  position: relative;
  background: #ebe0cd;
}
.gallery-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.45s cubic-bezier(0.2, 0, 0, 1);
}
.gallery-card:hover .gallery-img {
  transform: scale(1.06);
}
.gallery-badges {
  position: absolute;
  top: 12px;
  left: 12px;
  display: flex;
  gap: 6px;
}
.badge-level {
  background: rgba(143, 35, 23, 0.92);
  color: #fce8ad;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 6px;
  backdrop-filter: blur(4px);
}
.badge-city {
  background: rgba(43, 34, 24, 0.78);
  color: #fff;
  font-size: 11px;
  padding: 3px 9px;
  border-radius: 6px;
  backdrop-filter: blur(4px);
}
.gallery-category-tag {
  position: absolute;
  bottom: 10px;
  right: 12px;
  background: rgba(255, 253, 245, 0.92);
  color: #6d5b45;
  font-size: 11px;
  padding: 2px 10px;
  border-radius: 999px;
  border: 1px solid rgba(180, 134, 31, 0.25);
  backdrop-filter: blur(4px);
}
.gallery-body {
  padding: 20px;
  flex: 1;
  display: flex;
  flex-direction: column;
}
.gallery-title {
  font-family: var(--zi-font-serif, serif);
  font-size: 18px;
  color: #2b2218;
  font-weight: 700;
  margin: 0 0 6px;
}
.gallery-quote {
  font-size: 12px;
  color: #8f2317;
  font-style: italic;
  margin: 0 0 10px;
  letter-spacing: 0.02em;
}
.gallery-desc {
  font-size: 13px;
  line-height: 1.6;
  color: #6a5d4c;
  margin: 0 0 16px;
  flex: 1;
}
.gallery-action {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 600;
  color: #8f2317;
  padding-top: 12px;
  border-top: 1px dashed rgba(180, 134, 31, 0.22);
}
.action-arrow {
  transition: transform 0.2s var(--zi-ease-spring, cubic-bezier(0.16, 1, 0.3, 1));
}
.gallery-card:hover .action-arrow {
  transform: translateX(4px);
}

/* ================= Section 3: 四大数字时空支柱 ================= */
.pillars-section {
  padding: 80px 24px;
  background: #fbf8ef;
  border-top: 1px solid rgba(180, 134, 31, 0.25);
}
.pillars-container {
  max-width: 1160px;
  margin: 0 auto;
}
.pillars-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}
.pillar-card {
  background: #ffffff;
  border-radius: 16px;
  padding: 26px 20px;
  box-shadow: 0 4px 16px rgba(90, 60, 20, 0.05);
  border: 1px solid rgba(180, 134, 31, 0.25);
  display: flex;
  flex-direction: column;
  transition: transform 0.3s cubic-bezier(0.2, 0, 0, 1), box-shadow 0.3s ease, border-color 0.3s ease;
}
.pillar-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 12px 28px rgba(143, 35, 23, 0.1);
  border-color: rgba(180, 134, 31, 0.55);
}
.pillar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.pillar-num {
  font-family: var(--zi-font-serif, serif);
  font-size: 26px;
  font-weight: 800;
  color: rgba(180, 134, 31, 0.45);
}
.pillar-tag {
  background: rgba(160, 53, 38, 0.08);
  color: #8f2317;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 999px;
  border: 1px solid rgba(160, 53, 38, 0.2);
}
.pillar-title {
  font-family: var(--zi-font-serif, serif);
  font-size: 18px;
  color: #2b2218;
  margin: 0 0 10px;
  font-weight: 700;
}
.pillar-concept {
  font-size: 13px;
  line-height: 1.65;
  color: #6d5b45;
  margin: 0 0 16px;
  flex: 1;
}
.pillar-divider {
  height: 1px;
  background: linear-gradient(90deg, rgba(180, 134, 31, 0.35), transparent);
  margin-bottom: 14px;
}
.pillar-features {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.pillar-features li {
  font-size: 12px;
  color: #5c4f3e;
  display: flex;
  align-items: flex-start;
  gap: 6px;
  line-height: 1.45;
}
.feature-dot {
  color: #8f2317;
  font-size: 10px;
  margin-top: 1px;
}

/* ================= Section 4: 文化收尾横幅 ================= */
.closing-section {
  padding: 80px 24px;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  color: #fff;
  text-align: center;
}
.closing-container {
  max-width: 840px;
  margin: 0 auto;
}
.category-cloud {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-bottom: 26px;
}
.cat-pill {
  font-size: 12px;
  color: #fce8ad;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(252, 232, 173, 0.35);
  padding: 5px 14px;
  border-radius: 20px;
  backdrop-filter: blur(6px);
}
.closing-heading {
  font-family: var(--zi-font-serif, serif);
  font-size: 36px;
  font-weight: 700;
  letter-spacing: 0.05em;
  margin: 0 0 14px;
  text-shadow: 0 2px 10px rgba(0,0,0,0.4);
}
.closing-sub {
  font-size: 15px;
  color: #ece1d0;
  margin-bottom: 32px;
}
.closing-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
}
.closing-cta {
  background: #d4a84e;
  color: #5c180f;
  font-weight: 700;
  border: none;
  padding: 10px 26px;
}
.closing-guest {
  border-color: rgba(255, 255, 255, 0.6);
  color: #fff;
  padding: 10px 24px;
}
.closing-guest:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: #fff;
}

@media (max-width: 1024px) {
  .hero-container {
    flex-direction: column;
    gap: 36px;
  }
  .hero-left {
    max-width: 100%;
    text-align: center;
  }
  .geo-coord-pill {
    margin: 0 auto 18px;
  }
  .stats-bar {
    grid-template-columns: repeat(2, 1fr);
  }
  .platform-tags {
    justify-content: center;
  }
  .hero-right {
    width: 100%;
    max-width: 420px;
  }
  .gallery-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .pillars-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .hero-title {
    font-size: 30px;
  }
  .gallery-grid {
    grid-template-columns: 1fr;
  }
  .pillars-grid {
    grid-template-columns: 1fr;
  }
  .closing-actions {
    flex-direction: column;
  }
}
</style>
