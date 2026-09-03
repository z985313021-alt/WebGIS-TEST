<template>
  <div class="register-page">
    <el-card class="register-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>📝 注册账号</span>
        </div>
      </template>

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
    </el-card>
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
  display: flex;
  justify-content: center;
  padding: 48px 16px;
}
.register-card {
  width: 100%;
  max-width: 460px;
}
.card-header {
  font-size: 16px;
  font-weight: 600;
}
.submit-btn {
  width: 100%;
}
.tip {
  text-align: center;
  color: #888;
  font-size: 13px;
}
</style>
