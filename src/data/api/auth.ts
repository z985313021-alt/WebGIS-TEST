// 数据层：用户认证 API（注册 / 登录 / 会话 / 改密 / 管理）
import http from '../http';

export interface UserInfo {
  id: number;
  username: string;
  email: string;
  role: 'user' | 'admin';
  createdAt?: string;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  account: string; // 用户名 或 邮箱
  password: string;
}

function readSession(data: any): { token: string; user: UserInfo } {
  return { token: data.token, user: data.user };
}

/** 注册新用户（成功即自动签发会话） */
export async function register(payload: RegisterPayload): Promise<{ token: string; user: UserInfo }> {
  const { data } = await http.post<{ ok: boolean; token: string; user: UserInfo }>('/auth/register', payload);
  return readSession(data);
}

/** 登录：账号 = 用户名或邮箱 */
export async function login(payload: LoginPayload): Promise<{ token: string; user: UserInfo }> {
  const { data } = await http.post<{ ok: boolean; token: string; user: UserInfo }>('/auth/login', payload);
  return readSession(data);
}

/** 获取当前登录用户（未登录返回 user=null） */
export async function fetchMe(): Promise<UserInfo | null> {
  const { data } = await http.get<{ ok: boolean; user: UserInfo | null }>('/auth/me');
  return data.user;
}

/** 退出登录（使后端 token 失效） */
export async function logout(): Promise<void> {
  await http.post('/auth/logout');
}

/** 修改密码 */
export async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
  await http.post('/auth/change-password', { oldPassword, newPassword });
}

/** 引导：确保存在一个 admin（幂等，可作为一键初始化演示账号） */
export async function ensureAdmin(payload: { username: string; email: string; password: string }) {
  const { data } = await http.post<{ ok: boolean; created: boolean; user: UserInfo }>('/setup/admin', payload);
  return data;
}

/** 管理者：列出全部用户 */
export async function adminListUsers(): Promise<UserInfo[]> {
  const { data } = await http.get<{ ok: boolean; users: UserInfo[] }>('/auth/users');
  return data.users;
}

/** 管理者：设置角色 */
export async function adminSetRole(id: number, role: string) {
  const { data } = await http.post<{ ok: boolean; user: UserInfo }>(`/auth/users/${id}/role`, { role });
  return data.user;
}
