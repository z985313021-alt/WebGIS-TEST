import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    // 公开：登录 / 注册（登录后才能进入系统）
    { path: '/login', name: 'login', component: () => import('@/views/AuthPage.vue'), meta: { public: true } },
    { path: '/register', name: 'register', component: () => import('@/views/AuthPage.vue'), meta: { public: true } },

    // 受保护：系统内核
    // 新主页（门户型）：门类印章墙 + 地图 + 按需展开的统计图表
    { path: '/', name: 'home', component: () => import('@/views/HomeOverview.vue'), meta: { requiresAuth: true } },
    { path: '/data', name: 'data', component: () => import('@/views/DataManage.vue'), meta: { requiresAuth: true } },
    { path: '/heritage/:id', name: 'heritage-detail', component: () => import('@/views/HeritageDetail.vue'), meta: { requiresAuth: true } },
    // 分析工作台：原地图主页整体迁入（名录/空间分析/图层态势/时空演变 + 统计透视）
    { path: '/analysis', name: 'analysis', component: () => import('@/views/HomeMap.vue'), meta: { requiresAuth: true } },
    { path: '/screen', name: 'screen', component: () => import('@/views/BigScreen.vue'), meta: { requiresAuth: true } },
    { path: '/about', name: 'about', component: () => import('@/views/About.vue'), meta: { anonView: true } },
    { path: '/travel', name: 'travel', component: () => import('@/views/TravelRoute.vue'), meta: { requiresAuth: true } },

    // 文创商城
    { path: '/shop', name: 'shop', component: () => import('@/views/Shop.vue'), meta: { requiresAuth: true } },
    { path: '/orders', name: 'orders', component: () => import('@/views/MyOrders.vue'), meta: { requiresAuth: true } },
    { path: '/profile', name: 'profile', component: () => import('@/views/Profile.vue'), meta: { requiresAuth: true } },
    { path: '/admin-shop', name: 'admin-shop', component: () => import('@/views/AdminShop.vue'), meta: { requiresAuth: true, adminOnly: true } },
  ],
});

// 便于 guard 使用（防止与 vue-router 强耦合时循环引用，此处仅记录角色来源）
export default router;
