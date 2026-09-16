// 数据层：非遗与商品热度榜 API
import http from '../http';

/** 非遗榜排序维度：综合热度 / 点赞 / 评论 / 关联订单 */
export type HeritageMetric = 'heat' | 'likes' | 'comments' | 'orders';
/** 商品榜排序维度：销量 / 订单数 / 销售额 */
export type ProductMetric = 'sales' | 'orders' | 'revenue';

export interface HeritageRankItem {
  id: number;
  name: string;
  category: string;
  city: string;
  district: string;
  photo: string | null;
  likes: number;
  comments: number;
  orders: number;
  /** 综合热度 = 点赞×1 + 评论×3 + 关联订单×5 */
  heat: number;
}

export interface ProductRankItem {
  id: number;
  name: string;
  subtitle: string;
  price: number;
  image: string | null;
  stock: number;
  onSale: number;
  heritageId: number | null;
  sales: number;
  orders: number;
  revenue: number;
}

export interface RankOverview {
  likes: number;
  comments: number;
  orders: number;
  revenue: number;
  rankedHeritage: number;
  heritageTotal: number;
  productTotal: number;
}

export async function fetchRankOverview(): Promise<RankOverview> {
  const { data } = await http.get<RankOverview & { ok: boolean }>('/rank/overview');
  return data;
}

export async function fetchHeritageRank(metric: HeritageMetric = 'heat', limit = 20): Promise<HeritageRankItem[]> {
  const { data } = await http.get<{ ok: boolean; items: HeritageRankItem[] }>('/rank/heritage', {
    params: { metric, limit },
  });
  return data.items ?? [];
}

export async function fetchProductRank(metric: ProductMetric = 'sales', limit = 20): Promise<ProductRankItem[]> {
  const { data } = await http.get<{ ok: boolean; items: ProductRankItem[] }>('/rank/products', {
    params: { metric, limit },
  });
  return data.items ?? [];
}
