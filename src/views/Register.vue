<template>
  <div class="register-page">
    <div class="deco deco-1"></div>
    <div class="deco deco-2"></div>
    <div class="deco deco-3"></div>

    <div class="register-card">
      <!-- 左侧品牌区：填充页面，避免留白 -->
      <div class="brand-panel">
        <div class="brand-logo">🗺️</div>
        <div class="brand-name">WebGIS 实习平台</div>
        <div class="brand-slogan">山东省非物质文化遗产数字地图</div>
        <ul class="brand-features">
          <li>📍 全省 185+ 非遗项目精准落图</li>
          <li>🗂️ 类别 · 地市 · 批次多维筛选</li>
          <li>📊 空间分析 & 图表可视化</li>
        </ul>
      </div>

      <!-- 右侧表单区 -->
      <div class="form-panel">
        <div class="card-header">📝 注册账号</div>
        <el-form ref="formRef" :model="form" :rules="rules" label-width="80px" size="large" @submit.prevent>
          <el-form-item label="用户名" prop="username">
            <el-input v-model="form.username" placeholder="2-20 位字母、数字、下划线或中文" maxlength="20" clearable />
          </el-form-item>

          <el-form-item label="邮箱" prop="email">
            <el-input v-model="form.email" placeholder="用于登录和找回账号" maxlength="64" clearable />
          </el-form-item>

          <el-form-item label="密码" prop="password">
            <el-input v-model="form.password" type="password" placeholder="至少 6 位" show-password />
          </el-form-item>

          <el-form-item label="确认密码" prop="confirmPassword">
            <el-input v-model="form.confirmPassword" type="password" placeholder="再次输入密码" show-password />
          </el-form-item>

          <el-form-item>
            <el-button type="primary" :loading="submitting" class="submit-btn" @click="onSubmit">
              注册
            </el-button>
          </el-form-item>
        </el-form>

        <div class="tip">已有账号？<el-link type="primary" :underline="false" @click="$router.push('/')">返回首页</el-link></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { useRouter } from 'vue-router';
import { register } from '@/data/api/auth';

const router = useRouter();

const formRef = ref<FormInstance>();
const submitting = ref(false);

const form = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
});

const rules: FormRules = {
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
    { min: 6, message: '密码至少 6 位', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    {
      validator: (_rule, value: string, callback) => {
        if (value !== form.password) callback(new Error('两次输入的密码不一致'));
        else callback();
      },
      trigger: 'blur',
    },
  ],
};

async function onSubmit() {
  if (!formRef.value) return;
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;

  submitting.value = true;
  try {
    const user = await register({
      username: form.username.trim(),
      email: form.email.trim(),
      password: form.password,
    });
    ElMessage.success(`注册成功，欢迎 ${user.username}！`);
    router.push('/');
  } catch (e: any) {
    ElMessage.error(e.response?.data?.msg || e.message || '注册失败');
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.register-page {
  position: relative;
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  overflow: hidden;
  background: linear-gradient(135deg, #0d1b2e 0%, #16365c 50%, #1d5a63 100%);
}
.deco {
  position: absolute;
  border-radius: 50%;
  filter: blur(90px);
  opacity: 0.35;
  pointer-events: none;
}
.deco-1 { width: 460px; height: 460px; background: #2b6cb0; top: -140px; right: -100px; }
.deco-2 { width: 400px; height: 400px; background: #1abc9c; bottom: -160px; left: -120px; }
.deco-3 { width: 220px; height: 220px; background: #e67e22; top: 40%; left: 12%; opacity: 0.18; }

.register-card {
  position: relative;
  display: flex;
  width: 100%;
  max-width: 860px;
  min-height: 520px;
  border-radius: 16px;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.35);
}

.brand-panel {
  width: 40%;
  padding: 44px 32px;
  color: #fff;
  background: linear-gradient(160deg, #12305f 0%, #1a4a7a 100%);
  display: flex;
  flex-direction: column;
}
.brand-logo { font-size: 40px; margin-bottom: 12px; }
.brand-name { font-size: 22px; font-weight: 700; margin-bottom: 6px; }
.brand-slogan { font-size: 13px; opacity: 0.85; margin-bottom: 28px; }
.brand-features { list-style: none; padding: 0; margin: 0; }
.brand-features li {
  font-size: 13px;
  line-height: 1.6;
  padding: 8px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
}

.form-panel {
  flex: 1;
  padding: 40px 36px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.card-header {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 24px;
  color: #1f2d3d;
}
.submit-btn {
  width: 100%;
}
.tip {
  text-align: center;
  color: #888;
  font-size: 13px;
  margin-top: 8px;
}

@media (max-width: 768px) {
  .brand-panel { display: none; }
  .form-panel { padding: 28px 20px; }
}
</style>
