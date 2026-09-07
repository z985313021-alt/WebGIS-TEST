<template>
  <el-container class="app-root">
    <el-header class="top-nav">
      <div class="brand">WebGIS 实习平台</div>
      <el-menu mode="horizontal" :router="true" :default-active="route.path" class="nav-menu">
        <el-menu-item index="/">地图主页</el-menu-item>
        <el-menu-item index="/data">数据管理</el-menu-item>
        <el-menu-item index="/analysis">空间分析</el-menu-item>
        <el-menu-item index="/chart">图表可视化</el-menu-item>
        <el-menu-item index="/travel">旅游路线</el-menu-item>
        <el-menu-item index="/shop">🛍️ 文创商城</el-menu-item>
        <el-menu-item index="/about">关于</el-menu-item>
      </el-menu>

      <div class="user-area">
        <!-- 未登录：显示登录按钮（正常情况下由守卫导向登录页） -->
        <template v-if="!user.isLoggedIn">
          <el-button size="small" type="primary" @click="$router.push('/login')">登录 / 注册</el-button>
        </template>
        <template v-else>
          <el-badge :value="cartN" :hidden="!cartN" class="cart-link">
            <el-link type="primary" :underline="false" @click="$router.push('/shop')">🛒</el-link>
          </el-badge>
          <el-dropdown trigger="click" @command="onCommand">
            <span class="who">
              <span class="avatar">{{ avatarText }}</span>
              <span class="u-name">{{ user.displayName }}</span>
              <el-tag size="small" :type="user.isAdmin ? 'warning' : 'info'" class="role-tag">
                {{ user.isAdmin ? '管理员' : '用户' }}
              </el-tag>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="orders">📦 我的订单</el-dropdown-item>
                <el-dropdown-item v-if="user.isAdmin" command="admin">🧑‍💼 文创后台</el-dropdown-item>
                <el-dropdown-item divided command="pwd">🔑 修改密码</el-dropdown-item>
                <el-dropdown-item divided command="logout">↪ 退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </template>
      </div>
    </el-header>
    <el-main class="main-area">
      <router-view />
    </el-main>
  </el-container>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage, ElMessageBox, ElNotification } from 'element-plus';
import { useUserStore } from '@/services/stores/userStore';
import { useCartStore } from '@/services/stores/cartStore';
import * as authApi from '@/data/api/auth';

const route = useRoute();
const user = useUserStore();
const cartS = useCartStore();

const avatarText = computed(() => (user.displayName || '?').slice(0, 1).toUpperCase());
const cartN = computed(() => cartS.count);

function onCommand(cmd: string) {
  if (cmd === 'orders') window.location.href = '/orders';
  else if (cmd === 'admin') window.location.href = '/admin-shop';
  else if (cmd === 'pwd') changePwd();
  else if (cmd === 'logout') doLogout();
}

async function changePwd() {
  if (!user.user) return;
  try {
    const { value: oldPwd } = await ElMessageBox.prompt('请输入当前密码', '修改密码', { inputType: 'password' });
    const { value: newPwd } = await ElMessageBox.prompt('请输入新密码（至少 6 位）', '修改密码', { inputType: 'password' });
    await authApi.changePassword(String(oldPwd), String(newPwd));
    ElMessage.success('密码已更新');
  } catch (e: any) {
    if (!['cancel', 'close'].includes(e)) ElMessage.error(e.response?.data?.msg || '操作失败');
  }
}

async function doLogout() {
  try {
    await ElMessageBox.confirm('确定要退出登录吗？', '退出', { type: 'warning' });
  } catch { return; }
  await user.logout();
  ElNotification({ title: '已退出', message: '欢迎再次登录', type: 'success', duration: 1200 });
  window.location.href = '/login';
}

onMounted(async () => {
  if (!user.checked) await user.bootstrap();
  if (user.isLoggedIn) cartS.refresh();
});
</script>

<style scoped>
.app-root { height: 100%; }
.top-nav { display: flex; align-items: center; background: #001529; padding: 0 16px; gap: 6px; }
.brand { color: #fff; font-weight: 700; font-size: 17px; margin-right: 14px; white-space: nowrap; }
.nav-menu { flex: 1; background: transparent; border-bottom: none; min-width: 0; }
.nav-menu :deep(.el-menu-item) { color: #ccc; }
.nav-menu :deep(.el-menu-item.is-active) { color: #fff; background: #1890ff33; }
.user-area { display: flex; align-items: center; gap: 14px; margin-left: 10px; flex: none; }
.cart-link { font-size: 18px; }
.cart-link .el-link { font-size: 19px; }
.who { display: inline-flex; align-items: center; gap: 8px; cursor: pointer; color: #fff; }
.avatar {
  width: 26px; height: 26px; border-radius: 50%;
  background: linear-gradient(135deg, #1890ff, #1d5a63); color: #fff;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 700;
}
.u-name { max-width: 90px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 14px; }
.role-tag { transform: scale(0.85); }
.main-area { padding: 0; height: calc(100% - 60px); }

@media (max-width: 980px) {
  .nav-menu { display: none; }
}

/* ===== 非遗国潮 · 顶栏（朱砂红主调 + 描金点缀）===== */
.top-nav {
  background:
    linear-gradient(90deg, #8f2317 0%, #a33021 46%, #7f1f14 100%);
  border-bottom: 1px solid #d4a84e;
  box-shadow: 0 2px 12px rgba(97, 25, 15, 0.35);
}
.brand { color: #f9edc8; font-family: var(--zi-font-serif); letter-spacing: 0.1em; }
.brand::before {
  content: "❖ ";
  color: #e9c86a;
}
.nav-menu :deep(.el-menu-item) { color: #f2e4c4; }
.nav-menu :deep(.el-menu-item:hover) { background: rgba(255, 255, 255, 0.12); color: #fff; }
.nav-menu :deep(.el-menu-item.is-active) {
  color: #fff;
  background: linear-gradient(180deg, rgba(212, 168, 78, 0.45), rgba(212, 168, 78, 0.08));
  border-bottom-color: #f0d48a;
}
.user-area .el-link { color: #f0d48a; }
.who { color: #f7edda; }
.avatar {
  width: 26px; height: 26px; border-radius: 50%;
  background: linear-gradient(135deg, #7a120a, #b0371f), #c9a24a;
  background-blend-mode: overlay;
  color: #fff;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 700;
  box-shadow: 0 0 0 1.5px rgba(240, 212, 138, 0.7), 0 1px 4px rgba(0, 0, 0, 0.3);
}
</style>
