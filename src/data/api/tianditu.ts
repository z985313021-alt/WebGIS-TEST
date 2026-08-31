// 数据层：天地图相关 API 请求（唯一允许请求后端的地方）
import http from '@/data/http';

export interface TiandituStatus {
  configured: boolean;
}

/** 查询后端天地图 tk 是否已配置（决定前端用 WMTS 还是 OSM 兜底） */
export async function fetchTiandituStatus(): Promise<TiandituStatus> {
  const { data } = await http.get<TiandituStatus>('/tianditu/status');
  return data;
}
