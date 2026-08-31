// 数据层：唯一允许配置 axios 的地方
import axios from 'axios';

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api',
  timeout: 30000,
});

export default http;
