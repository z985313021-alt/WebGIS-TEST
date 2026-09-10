<template>
  <div class="auth-page">
    <div class="deco deco-1"></div>
    <div class="deco deco-2"></div>
    <div class="deco deco-3"></div>

    <div class="auth-card">
      <!-- 左侧品牌区 -->
      <div class="brand-panel">
        <div class="brand-logo">🗺️</div>
        <div class="brand-name">WebGIS 实习平台</div>
        <div class="brand-slogan">山东省非物质文化遗产数字地图 · 文创商城</div>
        <ul class="brand-features">
          <li>📍 全省 185+ 非遗项目精准落图</li>
          <li>🗂️ 类别 · 地市 · 批次多维筛选与空间分析</li>
          <li>🛍️ 逛文创 · 选购心仪非遗周边</li>
        </ul>
        <div class="demo-tip">
          <div class="demo-title">✨ 演示账号（一键初始化）</div>
          <div class="demo-line">管理员：<b>admin</b> / <b>admin123</b></div>
          <el-button size="small" type="primary" plain class="setup-btn" :loading="setupLoading" @click="onSetupAdmin">
            点我创建“管理员”演示账号
          </el-button>
        </div>
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
              <el-input v-model="regForm.password" type="password" placeholder="密码（至少 6 位）" show-password prefix-icon="Lock" />
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
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }, { min: 6, message: '密码至少 6 位', trigger: 'blur' }],
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
.auth-page {
  position: relative;
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  overflow: hidden;
  background: linear-gradient(135deg, #0d1b2e 0%, #16365c 50%, #1d5a63 100%);
}
.deco { position: absolute; border-radius: 50%; filter: blur(90px); opacity: 0.35; pointer-events: none; }
.deco-1 { width: 460px; height: 460px; background: #2b6cb0; top: -140px; right: -100px; }
.deco-2 { width: 400px; height: 400px; background: #1abc9c; bottom: -160px; left: -120px; }
.deco-3 { width: 220px; height: 220px; background: #e67e22; top: 40%; left: 12%; opacity: 0.16; }

.auth-card {
  position: relative;
  display: flex;
  width: 100%;
  max-width: 900px;
  min-height: 560px;
  border-radius: 16px;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.38);
  animation: rise 0.5s ease both;
}
@keyframes rise { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }

.brand-panel {
  width: 42%;
  padding: 40px 30px;
  color: #fff;
  background: linear-gradient(160deg, #12305f 0%, #1a4a7a 100%);
  display: flex;
  flex-direction: column;
}
.brand-logo { font-size: 42px; margin-bottom: 10px; }
.brand-name { font-size: 22px; font-weight: 700; margin-bottom: 6px; }
.brand-slogan { font-size: 13px; opacity: 0.85; margin-bottom: 24px; }
.brand-features { list-style: none; padding: 0; margin: 0 0 24px; }
.brand-features li { font-size: 13px; line-height: 1.6; padding: 8px 0; border-top: 1px solid rgba(255, 255, 255, 0.12); }
.demo-tip {
  margin-top: auto;
  padding: 14px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px dashed rgba(255, 255, 255, 0.35);
  font-size: 12.5px;
}
.demo-title { color: #ffd97a; margin-bottom: 6px; font-weight: 600; }
.demo-line { line-height: 1.7; margin-bottom: 8px; }
.setup-btn { --el-button-bg-color: rgba(255,255,255,0.14); --el-button-border-color: rgba(255,255,255,0.6); }

.form-panel {
  flex: 1;
  padding: 30px 36px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.mode-tabs :deep(.el-tabs__nav-wrap::after) { height: 1px; background: #eee; }
.mode-tabs :deep(.el-tabs__item) { font-size: 16px; font-weight: 600; }
.submit-btn { width: 100%; margin-top: 2px; }
.foot-tip { text-align: center; color: #999; font-size: 13px; margin-top: 14px; }
.back-home { text-align: center; margin-top: 12px; }

@media (max-width: 720px) {
  .brand-panel { display: none; }
  .form-panel { padding: 24px 20px; }
}
</style>
