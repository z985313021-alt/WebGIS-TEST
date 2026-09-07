// 数据层：个人资料 + 收货地址簿 API
import http from '../http';
import type { UserInfo } from './auth';

export interface AddressItem {
  id: number;
  receiver: string;
  phone: string;
  region: string;
  detail: string;
  isDefault: boolean;
  createdAt?: string;
}

export interface ProfilePayload {
  nickname?: string;
  phone?: string;
  avatarUrl?: string;
}

/** 读取当前登录用户资料（含昵称/手机/头像） */
export async function fetchProfile(): Promise<UserInfo> {
  const { data } = await http.get<{ ok: boolean; profile: UserInfo }>('/profile/me');
  return data.profile;
}

/** 更新资料：只传要改的字段 */
export async function updateProfile(payload: ProfilePayload): Promise<UserInfo> {
  const { data } = await http.put<{ ok: boolean; profile: UserInfo }>('/profile/me', payload);
  return data.profile;
}

/** 列出当前用户的收货地址（默认在前） */
export async function listAddresses(): Promise<AddressItem[]> {
  const { data } = await http.get<{ ok: boolean; items: AddressItem[] }>('/addresses');
  return data.items;
}

/** 新增收货地址 */
export async function createAddress(payload: Omit<AddressItem, 'id' | 'createdAt'>): Promise<AddressItem[]> {
  const { data } = await http.post<{ ok: boolean; items: AddressItem[] }>('/addresses', payload);
  return data.items;
}

/** 更新收货地址（可只传要改字段） */
export async function updateAddress(id: number, payload: Partial<Omit<AddressItem, 'id' | 'createdAt'>>): Promise<AddressItem[]> {
  const { data } = await http.put<{ ok: boolean; items: AddressItem[] }>(`/addresses/${id}`, payload);
  return data.items;
}

/** 设为默认地址 */
export async function setDefaultAddress(id: number): Promise<AddressItem[]> {
  const { data } = await http.post<{ ok: boolean; items: AddressItem[] }>(`/addresses/${id}/default`);
  return data.items;
}

/** 删除地址 */
export async function deleteAddress(id: number): Promise<AddressItem[]> {
  const { data } = await http.delete<{ ok: boolean; items: AddressItem[] }>(`/addresses/${id}`);
  return data.items;
}
