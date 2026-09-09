// 数据层：唯一允许配置 axios 的地方
import axios from 'axios';

export const AUTH_TOKEN_KEY = 'webgis_token';

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api',
  timeout: 30000,
});

// 请求拦截：自动附带登录 token
http.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 响应拦截：401 时清除本地会话并由路由守卫/软导航引导登录
http.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response && err.response.status === 401) {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      const isGuest = typeof localStorage !== 'undefined' && localStorage.getItem('webgis_guest') === '1';
      const url = String(err.config?.url || '');
      // 游客模式或登录/注册接口不强制跳登录页
      if (!isGuest && !url.includes('/auth/login') && !url.includes('/auth/register') && !url.includes('/cart')) {
        import('@/router').then(({ default: router }) => {
          if (router.currentRoute.value.path !== '/login') {
            router.push('/login');
          }
        });
      }
    }
    return Promise.reject(err);
  },
);

export default http;
