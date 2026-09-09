<template>
  <el-container class="app-root">
    <el-header v-if="route.path !== '/screen'" class="top-nav">
      <div class="brand-wrap" @click="router.push('/')">
        <span class="brand-stamp">齐鲁</span>
        <span class="brand-title">遗蕴齐鲁</span>
        <span class="brand-sub">山东省非物质文化遗产空间数字化平台</span>
      </div>
      <el-button class="nav-toggle" text @click="drawerOpen = true">
        <span class="hamburger">☰</span>
      </el-button>
      <el-menu mode="horizontal" :router="true" :default-active="route.path" class="nav-menu">
        <el-menu-item index="/">地图主页</el-menu-item>
        <el-menu-item index="/data">数据管理</el-menu-item>
        <el-menu-item index="/analysis">空间分析</el-menu-item>
        <el-menu-item index="/chart">图表可视化</el-menu-item>
        <el-menu-item index="/screen">态势大屏</el-menu-item>
        <el-menu-item index="/travel">旅游路线</el-menu-item>
        <el-menu-item index="/shop">文创商城</el-menu-item>
        <el-menu-item index="/about">关于</el-menu-item>
      </el-menu>

      <div class="user-area">
        <!-- 未登录 / 游客：显示登录按钮 -->
        <template v-if="!user.isLoggedIn">
          <el-button size="small" type="primary" class="btn-login-rect" @click="router.push('/login')">
            登录 / 注册
          </el-button>
        </template>
        <template v-else>
          <el-badge :value="cartN" :hidden="!cartN" class="cart-link">
            <el-link type="primary" :underline="false" @click="router.push('/shop')">
              <el-icon :size="18"><ShoppingCart /></el-icon>
            </el-link>
          </el-badge>
          <el-dropdown trigger="click" @command="onCommand">
            <span class="who">
              <span class="avatar-square">{{ avatarText }}</span>
              <span class="u-name">{{ user.displayName }}</span>
              <el-tag size="small" :type="user.isAdmin ? 'warning' : 'info'" class="role-tag">
                {{ user.isAdmin ? '管理员' : '用户' }}
              </el-tag>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">
                  <el-icon><User /></el-icon> 个人中心
                </el-dropdown-item>
                <el-dropdown-item command="orders">
                  <el-icon><Box /></el-icon> 我的订单
                </el-dropdown-item>
                <el-dropdown-item v-if="user.isAdmin" command="admin">
                  <el-icon><Setting /></el-icon> 文创后台
                </el-dropdown-item>
                <el-dropdown-item divided command="pwd">
                  <el-icon><Key /></el-icon> 修改密码
                </el-dropdown-item>
                <el-dropdown-item divided command="logout">
                  <el-icon><SwitchButton /></el-icon> 退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </template>
      </div>
    </el-header>
    <!-- 窄屏抽屉导航 -->
    <el-drawer v-model="drawerOpen" direction="ltr" size="240px" :with-header="false" class="nav-drawer">
      <div class="drawer-brand">❖ 遗蕴齐鲁</div>
      <el-menu :router="true" :default-active="route.path" @select="drawerOpen = false" class="drawer-menu">
        <el-menu-item index="/">
          <el-icon class="di-icon"><MapLocation /></el-icon> 地图主页
        </el-menu-item>
        <el-menu-item index="/data">
          <el-icon class="di-icon"><DataAnalysis /></el-icon> 数据管理
        </el-menu-item>
        <el-menu-item index="/analysis">
          <el-icon class="di-icon"><Guide /></el-icon> 空间分析
        </el-menu-item>
        <el-menu-item index="/chart">
          <el-icon class="di-icon"><TrendCharts /></el-icon> 图表可视化
        </el-menu-item>
        <el-menu-item index="/screen">
          <el-icon class="di-icon"><Platform /></el-icon> 态势大屏
        </el-menu-item>
        <el-menu-item index="/travel">
          <el-icon class="di-icon"><Van /></el-icon> 旅游路线
        </el-menu-item>
        <el-menu-item index="/shop">
          <el-icon class="di-icon"><ShoppingBag /></el-icon> 文创商城
        </el-menu-item>
        <el-menu-item index="/about">
          <el-icon class="di-icon"><Reading /></el-icon> 关于
        </el-menu-item>
      </el-menu>
    </el-drawer>
    <el-main class="main-area" :class="{ 'with-nav-offset': route.path !== '/' && route.path !== '/screen' }">
      <router-view v-slot="{ Component }">
        <transition name="page" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </el-main>
  </el-container>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox, ElNotification } from 'element-plus';
import {
  User,
  ShoppingCart,
  ShoppingBag,
  MapLocation,
  DataAnalysis,
  TrendCharts,
  Platform,
  Van,
  Guide,
  Reading,
  Setting,
  Key,
  SwitchButton,
  Box,
} from '@element-plus/icons-vue';
import { useUserStore } from '@/services/stores/userStore';
import { useCartStore } from '@/services/stores/cartStore';
import * as authApi from '@/data/api/auth';

const route = useRoute();
const router = useRouter();
const user = useUserStore();
const cartS = useCartStore();

const avatarText = computed(() => (user.displayName || '?').slice(0, 1).toUpperCase());
const cartN = computed(() => cartS.count);

const drawerOpen = ref(false);
watch(() => route.path, () => { drawerOpen.value = false; });

function onCommand(cmd: string) {
  if (cmd === 'profile') router.push('/profile');
  else if (cmd === 'orders') router.push('/orders');
  else if (cmd === 'admin') router.push('/admin-shop');
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
  router.push('/login');
}

onMounted(async () => {
  if (!user.checked) await user.bootstrap();
  if (user.isLoggedIn) cartS.refresh();
});
</script>

<style scoped>
.app-root {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: var(--zi-bg, #f4eddc);
}

/* ===== 规范化顶部主导航栏（50px 固钉结构，宣纸牙白底色 + 金茶细线） ===== */
.top-nav {
  height: 50px !important;
  line-height: 50px;
  background: #fffdf8;
  border-bottom: 1px solid #e2d6be;
  box-shadow: 0 1px 3px rgba(43, 34, 24, 0.05);
  padding: 0 16px;
  display: flex;
  align-items: center;
  position: relative;
  z-index: 100;
  flex: none;
}

.brand-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  margin-right: 20px;
  user-select: none;
  flex: none;
}

.brand-stamp {
  background: #8f2317;
  color: #fffdf5;
  font-family: var(--zi-font-serif, "STSong", "Songti SC", serif);
  font-size: 11px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 2px;
  letter-spacing: 1px;
  line-height: 1.2;
}

.brand-title {
  color: #2b2218;
  font-family: var(--zi-font-serif, "STSong", "Songti SC", serif);
  letter-spacing: 0.08em;
  font-weight: 700;
  font-size: 16px;
  line-height: 1;
}

.brand-sub {
  color: #8a7862;
  font-size: 11px;
  letter-spacing: 0.03em;
  font-family: var(--zi-font-sans, system-ui, sans-serif);
  margin-left: 4px;
}

.nav-menu {
  flex: 1;
  background: transparent !important;
  border-bottom: none !important;
  min-width: 0;
  height: 50px;
}
.nav-menu :deep(.el-menu-item) {
  color: #5a4b3c;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.03em;
  height: 50px;
  line-height: 50px;
  padding: 0 14px;
  border-bottom: 2px solid transparent !important;
  transition: color 150ms ease-out, border-color 150ms ease-out;
}
.nav-menu :deep(.el-menu-item:hover) {
  background: rgba(143, 35, 23, 0.04) !important;
  color: #8f2317;
}
.nav-menu :deep(.el-menu-item.is-active) {
  color: #8f2317 !important;
  background: transparent !important;
  border-bottom: 2px solid #8f2317 !important;
  font-weight: 600;
}

.user-area {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
  flex: none;
}

/* 规范的4px圆角矩形登录按钮 */
.btn-login-rect {
  height: 28px;
  padding: 0 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  background: #8f2317;
  border-color: #8f2317;
  color: #ffffff;
}
.btn-login-rect:hover {
  background: #a82e1d;
  border-color: #a82e1d;
}

.cart-link {
  display: inline-flex;
  align-items: center;
}
.cart-link .el-link {
  color: #5a4b3c;
}
.cart-link .el-link:hover {
  color: #8f2317;
}

.who {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: #2b2218;
  padding: 2px 6px;
  border-radius: 3px;
  transition: background 0.15s;
}
.who:hover {
  background: rgba(43, 34, 24, 0.05);
}
.avatar-square {
  width: 26px;
  height: 26px;
  border-radius: 3px;
  background: #8f2317;
  color: #fffdf5;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
}
.u-name {
  max-width: 90px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  color: #3a3125;
}
.role-tag {
  border-radius: 2px;
  transform: scale(0.85);
}

.nav-toggle {
  display: none;
  color: #3a3125;
  padding: 0 6px;
}
.hamburger {
  font-size: 18px;
  line-height: 1;
}

/* 页面内容主体：50px 顶栏下方全占满 */
.main-area {
  padding: 0;
  flex: 1;
  height: calc(100vh - 50px);
  min-height: 0;
  overflow: auto;
  position: relative;
}

/* 窄屏抽屉导航 */
.nav-drawer {
  background: #fffdf8 !important;
}
.drawer-brand {
  font-family: var(--zi-font-serif, "STSong", serif);
  font-size: 16px;
  color: #8f2317;
  padding: 16px;
  font-weight: bold;
  border-bottom: 1px solid #e2d6be;
}
.drawer-menu {
  border-right: none;
  background: transparent;
}
.di-icon {
  margin-right: 8px;
  font-size: 15px;
}

@media (max-width: 980px) {
  .nav-menu { display: none; }
  .nav-toggle { display: inline-flex; }
  .brand-title { font-size: 15px; }
  .brand-sub { display: none; }
  .u-name, .role-tag { display: none; }
  .user-area { gap: 8px; margin-left: auto; }
}
</style>
