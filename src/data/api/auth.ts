// 数据层：用户注册 API
import http from '../http';

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
}

export interface UserInfo {
  id: number;
  username: string;
  email: string;
  createdAt: string;
}

/** 注册新用户，成功返回用户信息 */
export async function register(payload: RegisterPayload): Promise<UserInfo> {
  const { data } = await http.post<{ ok: boolean; user: UserInfo }>('/auth/register', payload);
  return data.user;
}
