// 逻辑层：登录态 store（token + 用户 + 角色），登录门禁与顶栏共用
import { defineStore } from 'pinia';
import * as authApi from '@/data/api/auth';
import { AUTH_TOKEN_KEY } from '@/data/http';
import type { UserInfo } from '@/data/api/auth';

interface StoredIdentity {
  token: string;
  user: UserInfo;
}

function loadStored(): StoredIdentity | null {
  try {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return null;
    const raw = localStorage.getItem('webgis_user');
    if (!raw) return null;
    const user = JSON.parse(raw) as UserInfo;
    return { token, user };
  } catch {
    return null;
  }
}

export const useUserStore = defineStore('user', {
  state: () => {
    const stored = loadStored();
    return {
      token: stored?.token ?? ('' as string),
      user: stored?.user ?? (null as UserInfo | null),
      checked: false as boolean, // 是否已完成启动时 me 校验
    };
  },
  getters: {
    isLoggedIn: (s) => !!s.token && !!s.user,
    isAdmin: (s) => s.user?.role === 'admin',
    displayName: (s) => s.user?.username ?? '',
  },
  actions: {
    persist(token: string, user: UserInfo) {
      this.token = token;
      this.user = user;
      localStorage.setItem(AUTH_TOKEN_KEY, token);
      localStorage.setItem('webgis_user', JSON.stringify(user));
    },
    clear() {
      this.token = '';
      this.user = null;
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem('webgis_user');
    },
    async login(account: string, password: string) {
      const { token, user } = await authApi.login({ account, password });
      this.persist(token, user);
      return user;
    },
    async register(payload: { username: string; email: string; password: string }) {
      const { token, user } = await authApi.register(payload);
      this.persist(token, user);
      return user;
    },
    async logout() {
      try {
        await authApi.logout();
      } catch {
        /* 忽略网络错误 */
      }
      this.clear();
    },
    /** 启动时或刷新后：携带 token 询问后端当前用户，校验会话有效性 */
    async bootstrap() {
      this.checked = false;
      if (!this.token) {
        this.checked = true;
        return;
      }
      try {
        const u = await authApi.fetchMe();
        if (!u) {
          this.clear();
        } else {
          // 与后端一致（role 可能变化）
          this.user = { ...this.user, ...u };
          localStorage.setItem('webgis_user', JSON.stringify(this.user));
        }
      } catch {
        // 网络异常不强制登出，保留本地会话避免干扰地图
      } finally {
        this.checked = true;
      }
    },
  },
});
