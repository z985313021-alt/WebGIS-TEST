import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: () => import('@/views/HomeMap.vue') },
    { path: '/data', name: 'data', component: () => import('@/views/DataManage.vue') },
    // 空间分析已整合进地图主页（?tool=analysis 自动打开分析面板）
    { path: '/analysis', redirect: () => ({ path: '/', query: { tool: 'analysis' } }) },
    { path: '/chart', name: 'chart', component: () => import('@/views/ChartView.vue') },
    { path: '/about', name: 'about', component: () => import('@/views/About.vue') },
  ],
});

export default router;
