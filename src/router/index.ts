import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: () => import('@/views/HomeMap.vue') },
    { path: '/data', name: 'data', component: () => import('@/views/DataManage.vue') },
    { path: '/analysis', name: 'analysis', component: () => import('@/views/Analysis.vue') },
    { path: '/chart', name: 'chart', component: () => import('@/views/ChartView.vue') },
    { path: '/about', name: 'about', component: () => import('@/views/About.vue') },
  ],
});

export default router;
