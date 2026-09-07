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

// 响应拦截：401 时清除本地会话并尝试跳转登录
http.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response && err.response.status === 401) {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      // 仅当非登录接口自身 401 时跳转（避免登录失败也跳转死循环）
      const url = String(err.config?.url || '');
      if (!url.includes('/auth/login') && !url.includes('/auth/register') && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  },
);

export default http;
