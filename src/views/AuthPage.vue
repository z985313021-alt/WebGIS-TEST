<template>
  <div class="auth-page">
    <div class="deco deco-1"></div>
    <div class="deco deco-2"></div>
    <div class="deco deco-3"></div>

    <div class="auth-card">
      <!-- 左侧品牌区（平台信息浏览） -->
      <div class="brand-panel">
        <div class="brand-eyebrow">山东 · 非物质文化遗产数字地图</div>
        <div class="brand-logo">🗺️</div>
        <h1 class="brand-title">遗蕴齐鲁</h1>
        <p class="brand-lead">让散落在齐鲁大地的非遗，汇成一张可以“逛”的数字图谱 —— 看、查、算、买，一站完成。</p>

        <ul class="brand-list">
          <li>
            <span class="bl-ico">🗺️</span>
            <b>一张图看懂非遗</b>
            <span class="bl-desc">185+ 项国家级 / 省级非遗按图索骥，覆盖全省。</span>
          </li>
          <li>
            <span class="bl-ico">🧮</span>
            <b>能筛能算能分析</b>
            <span class="bl-desc">按类别 · 地市 · 批次筛选，叠加空间分析与统计图表。</span>
          </li>
          <li>
            <span class="bl-ico">🧭</span>
            <b>规划非遗之旅</b>
            <span class="bl-desc">一键生成路线，串联沿途遗产点与行程建议。</span>
          </li>
          <li>
            <span class="bl-ico">🛍️</span>
            <b>把匠心带回家</b>
            <span class="bl-desc">选购由非遗衍生的文创好物，支持在线下单。</span>
          </li>
        </ul>

        <div class="cat-wrap">
          <div class="cat-title">听山东 · 十大非遗门类，正一一走上地图</div>
          <div class="cat-row">
            <span>民间文学</span><span>传统音乐</span><span>传统舞蹈</span><span>传统戏剧</span><span>曲艺</span>
            <span>游艺与杂技</span><span>传统美术</span><span>传统技艺</span><span>传统医药</span><span>民俗</span>
          </div>
        </div>

        <blockquote class="brand-quote">
          非遗不在橱窗里——<br />在你长大的老城南、在你听过的乡音里。
        </blockquote>
        <div class="brand-note">— 免费注册 · 即刻云赏齐鲁非遗 —</div>
      </div>

      <!-- 右侧表单区 -->
      <div class="form-panel">
        <el-tabs v-model="mode" class="mode-tabs" stretch>
          <el-tab-pane label="登 录" name="login" />
          <el-tab-pane label="注 册" name="register" />
        </el-tabs>
        <template v-if="mode === 'login'">
          <el-form ref="loginFormRef" :model="loginForm" :rules="loginRules" size="large" @submit.prevent="onLogin">
            <el-form-item prop="account">
              <el-input v-model="loginForm.account" placeholder="用户名或邮箱" clearable />
            </el-form-item>
            <el-form-item prop="password">
              <el-input v-model="loginForm.password" type="password" placeholder="密码" show-password @keyup.enter="onLogin" />
            </el-form-item>
            <el-button type="primary" class="submit-btn" :loading="submitting" @click="onLogin">登 录</el-button>
          </el-form>
          <p class="foot-tip">还没有账号？点击上方 <b>“注册”</b> 快速创建一个。</p>
          <div class="demo-row">
            <span>没有账号？可用演示管理员：<b>admin / admin123</b></span>
            <el-button size="small" text type="primary" :loading="setupLoading" @click="onSetupAdmin">
              一键创建并填入
            </el-button>
          </div>
        </template>

        <template v-else>
          <el-form ref="regFormRef" :model="regForm" :rules="regRules" size="large" @submit.prevent>
            <el-form-item prop="username">
              <el-input v-model="regForm.username" placeholder="用户名（2-20 位），作为登录账号" clearable prefix-icon="User" />
            </el-form-item>
            <el-form-item prop="email">
              <el-input v-model="regForm.email" placeholder="邮箱" clearable prefix-icon="Message" />
            </el-form-item>
            <el-form-item prop="password">
              <el-input v-model="regForm.password" type="password" placeholder="密码（6-20 位，需含字母与数字）" show-password prefix-icon="Lock" />
            </el-form-item>
            <el-form-item prop="confirmPassword">
              <el-input v-model="regForm.confirmPassword" type="password" placeholder="再次输入密码" show-password prefix-icon="Lock" />
            </el-form-item>
            <el-button type="primary" class="submit-btn" :loading="submitting" @click="onRegister">注册并进入系统</el-button>
          </el-form>
        </template>

        <div class="back-home" v-if="from?.path && from.path !== '/login'">
          <el-link type="info" :underline="false" @click="goBack">← 返回之前页面</el-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { useUserStore } from '@/services/stores/userStore';
import * as authApi from '@/data/api/auth';

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

const loginRules: FormRules = {
  account: [{ required: true, message: '请输入用户名或邮箱', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
};
const regRules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9_\u4e00-\u9fa5]{2,20}$/, message: '2-20 位字母、数字、下划线或中文', trigger: 'blur' },
  ],
  email: [{ required: true, message: '请输入邮箱', trigger: 'blur' }, { type: 'email', message: '邮箱格式不正确', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }, { validator: (_r: any, v: string, cb: any) => { if (!v) return cb(new Error('请输入密码')); if (v.length < 6 || v.length > 20 || !/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d_@#$%&*]{6,20}$/.test(v)) return cb(new Error('密码需 6-20 位且需同时包含字母与数字')); cb(); }, trigger: 'blur' }],
  confirmPassword: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    { validator: (_r, v: string, cb) => (v !== regForm.password ? cb(new Error('两次输入的密码不一致')) : cb()), trigger: 'blur' },
  ],
};

function goHome() {
  router.push(from && from.path.startsWith('/') ? from.path : '/');
}
function goBack() {
  router.back();
}

async function onLogin() {
  if (!loginFormRef.value) return;
  const ok = await loginFormRef.value.validate().catch(() => false);
  if (!ok) return;
  submitting.value = true;
  try {
    await userStore.login(loginForm.account.trim(), loginForm.password);
    ElMessage.success('登录成功，欢迎回来！');
    goHome();
  } catch (e: any) {
    ElMessage.error(e.response?.data?.msg || '登录失败');
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
    ElMessage.success('管理员演示账号已就绪：admin / admin123，可直接登录');
    loginForm.account = 'admin';
    loginForm.password = 'admin123';
    mode.value = 'login';
    if (loginFormRef.value) loginFormRef.value.clearValidate();
  } catch (e: any) {
    ElMessage.error(e.response?.data?.msg || '初始化失败');
  } finally {
    setupLoading.value = false;
  }
}
</script>

<style scoped>

.auth-page{position:relative;min-height:100vh;display:block;text-align:left;overflow-x:hidden;
  padding:clamp(46px,7vh,90px) clamp(22px,5vw,110px) 130px;
  background:
    radial-gradient(1100px 560px at 12% -6%,#fef7e0 0%,transparent 58%),
    linear-gradient(158deg,#f6edda 0%,#e4d3ac 60%,#dac697 100%);}
.deco{position:fixed;border-radius:50%;filter:blur(96px);pointer-events:none;opacity:.5;z-index:0}
.deco-1{width:560px;height:560px;top:-170px;right:-150px;background:rgba(190,90,45,.28)}
.deco-2{width:480px;height:480px;bottom:-190px;left:-150px;background:rgba(120,90,40,.22)}
.deco-3{width:300px;height:300px;top:44%;left:10%;background:rgba(66,108,84,.22);opacity:.3}

.login-wrap{position:relative;z-index:1;margin:0 auto;width:100%}
.auth-card{position:relative;z-index:1;margin:0 auto;width:100%;max-width:1360px;
  display:grid;grid-template-columns:minmax(0,1fr) clamp(350px,27vw,412px);
  column-gap:clamp(36px,6vw,104px);align-items:start;}

/* ---- LEFT : browse infos ---- */
.brand-panel{min-width:0;color:#3a2418;padding:2px 0 20px}
.brand-eyebrow{display:inline-block;margin:0 0 20px;border:1px solid #cdb37a;border-radius:999px;
  color:#9c5a20;background:rgba(255,236,205,.42);padding:6px 16px;font-size:12.5px;letter-spacing:.2em}
.brand-logo{font-size:46px;line-height:1;margin:0 0 13px}
.brand-title{font-size:clamp(36px,4.6vw,58px);color:#431f10;font-weight:800;letter-spacing:.04em;line-height:1.14;margin:0 0 18px}
.brand-lead{max-width:56ch;font-size:16.5px;line-height:2;color:#6a5236;margin:0 0 38px}

.brand-list{list-style:none;margin:0 0 30px;padding:0;display:grid;gap:18px;
  grid-template-columns:repeat(auto-fill,minmax(min(100%,330px),1fr))}
.brand-list li{margin:0;padding:20px;border:1px solid #e6d6ac;border-radius:14px;background:#fffdf5;
  box-shadow:0 6px 18px rgba(120,84,30,.07)}
.brand-list li .bl-ico{font-size:24px;line-height:1;display:block;margin-bottom:12px}
.brand-list li b{display:block;font-size:16.5px;color:#4a2716;font-weight:700;margin-bottom:8px}
.brand-list li .bl-desc{font-size:13.5px;line-height:1.75;color:#6b5638;display:block;margin:0}

.cat-wrap{margin:0 0 28px}
.cat-title{font-size:14px;color:#5c4527;font-weight:700;letter-spacing:.08em;margin:0 0 13px}
.cat-row{display:flex;flex-wrap:wrap;gap:9px}
.cat-row span{border:1px solid #dcc8a0;background:#fffdf6;border-radius:999px;padding:6px 14px;font-size:12.5px;color:#6a4f2a}
.brand-quote{margin:6px 0 32px;padding:18px 22px;border-left:5px solid #b93b22;background:#f6e6c7;border-radius:0 14px 14px 0;font-size:15.5px;line-height:2;color:#6b462a;font-style:italic}
.brand-note{margin:28px 0 0;color:#7a623c;font-size:13px;letter-spacing:.08em;text-align:center}

/* demo admin */
.demo-tip{margin:0;border:1px dashed #c8ad72;background:rgba(255,244,208,.5);padding:14px 16px;border-radius:12px}
.demo-tip .demo-title{color:#9c5a20;font-weight:700;margin:0 0 6px}
.demo-tip .demo-line{color:#7a6130}
.demo-tip .setup-btn{margin-top:10px}

/* ---- RIGHT : login card (sticky float) ---- */
.form-panel{position:sticky;top:clamp(20px,7vh,58px);width:100%;box-sizing:border-box;
  padding:30px 30px 26px;background:#fffdf4;border:1px solid #e7d8b2;border-radius:20px;
  box-shadow:0 34px 80px rgba(78,40,15,.30)}
.mode-tabs{margin-bottom:6px}
.mode-tabs :deep(.el-tabs__item){font-weight:600;letter-spacing:.2em}
.mode-tabs :deep(.el-tabs__item.is-active){color:#b22618}
.mode-tabs :deep(.el-tabs__active-bar){background-color:#b22618}
.mode-tabs :deep(.el-tabs__nav-wrap::after){height:1px;background:#e7d8b2}
.form-panel .el-form{background:transparent}
.form-panel .el-form-item{margin-bottom:20px}
.form-panel .submit-btn{width:100%;font-weight:600;border-radius:10px}
.form-panel .foot-tip{margin:16px 0 0;text-align:center;font-size:13px;color:#8a7752;line-height:1.8}
.demo-row{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-top:16px;padding-top:14px;border-top:1px dashed #dfcf9f;font-size:12.5px;color:#7a623c;line-height:1.6}
.demo-row b{color:#9c5a20}
.demo-row .el-button{height:auto;min-height:0;padding:2px 4px}
.back-home{text-align:center;margin-top:14px}
.back-home .el-link{color:#a76a34}

@media (max-width:1020px){
  .auth-card{grid-template-columns:minmax(0,1fr);row-gap:26px}
  .form-panel{position:static;top:auto}
  .brand-title{font-size:38px}
  .auth-page{padding:20px 16px 70px}
}

</style>
