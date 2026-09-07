// 路由守卫：登录门禁 + 管理员校验
import type { Router } from 'vue-router';
import type { Pinia } from 'pinia';
import { useUserStore } from '@/services/stores/userStore';

export function installAuthGuard(router: Router, pinia: Pinia) {
  router.beforeEach(async (to) => {
    const user = useUserStore(pinia);

    // 首次导航时校验收到的会话（确保 /me 拉取角色最新、token 有效）
    if (!user.checked) await user.bootstrap();

    // 开放浏览页（匿名与登录都能访问，不重定向）：如平台介绍 /about
    if (to.meta.anonView) return true;

    // 已登录用户访问登录/注册页 → 回首页
    if (to.meta.public) {
      if (user.isLoggedIn) return { path: '/' };
      return true;
    }

    // 受保护页面：未登录 → 登录页（携带来源）
    if (to.meta.requiresAuth && !user.isLoggedIn) {
      const from = to.fullPath && to.path !== '/' ? to.fullPath : undefined;
      return { path: '/login', query: from ? { from } : {} };
    }

    // 仅管理员页面
    if (to.meta.adminOnly && !user.isAdmin) {
      return { path: '/', query: {} };
    }

    return true;
  });
}
