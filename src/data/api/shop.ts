// 数据层：文创商城 API
import http from '../http';

export interface Product {
  id: number;
  heritageId: number | null;
  category: string;
  name: string;
  subtitle: string;
  price: number;
  stock: number;
  image: string | null;
  description: string;
  onSale: number;
}
export interface CategoryCnt { category: string; c: number; }
export interface CartItem { productId: number; qty: number; name: string; subtitle: string; price: number; image: string | null; stock: number; }
export interface OrderItem { productName: string; price: number; qty: number; image: string | null; }
export interface Order {
  orderNo: string; id: number; status: string; statusCn: string;
  receiver: string; phone: string; address: string; total: number;
  trackingNo: string; remark: string; createdAt: string;
  paidAt?: string | null; shippedAt?: string | null; doneAt?: string | null;
  username?: string; items: OrderItem[];
}

export async function fetchProducts(category = ''): Promise<Product[]> {
  const { data } = await http.get<{ ok: boolean; products: Product[] }>('/shop/products', { params: category ? { category } : {} });
  return data.products;
}
export async function fetchCategories(): Promise<CategoryCnt[]> {
  const { data } = await http.get<{ ok: boolean; categories: CategoryCnt[] }>('/shop/categories');
  return data.categories;
}

// 购物车
export async function fetchCart(): Promise<CartItem[]> {
  const { data } = await http.get<{ ok: boolean; items: CartItem[] }>('/shop/cart');
  return data.items;
}
export async function setCart(productId: number, qty: number): Promise<CartItem[]> {
  const { data } = await http.post<{ ok: boolean; items: CartItem[] }>('/shop/cart', { productId, qty });
  return data.items;
}
export async function removeCart(productId: number): Promise<CartItem[]> {
  const { data } = await http.delete<{ ok: boolean; items: CartItem[] }>(`/shop/cart/${productId}`);
  return data.items;
}

// 订单（用户）
export async function submitOrder(payload: { receiver: string; phone: string; address: string; remark?: string }): Promise<Order> {
  const { data } = await http.post<{ ok: boolean; order: Order }>('/shop/orders', payload);
  return data.order;
}
export async function fetchMyOrders(): Promise<Order[]> {
  const { data } = await http.get<{ ok: boolean; orders: Order[] }>('/shop/orders');
  return data.orders;
}
export async function payOrder(orderNo: string): Promise<void> {
  await http.post(`/shop/orders/${orderNo}/pay`);
}
export async function cancelOrder(orderNo: string): Promise<void> {
  await http.post(`/shop/orders/${orderNo}/cancel`);
}
export async function confirmOrder(orderNo: string): Promise<void> {
  await http.post(`/shop/orders/${orderNo}/confirm`);
}

// 订单（管理员）
export async function adminFetchOrders(): Promise<{ orders: Order[]; stat: Record<string, number> }> {
  const { data } = await http.get<{ ok: boolean; orders: Order[]; stat: Record<string, number> }>('/shop/orders/admin');
  return data;
}
export async function adminShip(orderNo: string, trackingNo: string): Promise<void> {
  await http.post(`/shop/orders/${orderNo}/ship`, { trackingNo });
}

// 商品管理（管理员）
export async function adminAddProduct(p: Partial<Product> & { name: string; price: number }): Promise<Product> {
  const { data } = await http.post<{ ok: boolean; product: Product }>('/shop/products', p);
  return data.product;
}
export async function adminUpdateProduct(id: number, patch: Partial<Product>): Promise<Product> {
  const { data } = await http.put<{ ok: boolean; product: Product }>(`/shop/products/${id}`, patch);
  return data.product;
}
export async function adminDeleteProduct(id: number): Promise<void> {
  await http.delete(`/shop/products/${id}`);
}

// 非遗列表（后台关联/管理用）
export async function fetchHeritageList(): Promise<{ id: number; name: string; category: string; city: string; photo: string | null }[]> {
  const { data } = await http.get<{ ok: boolean; items: any[] }>('/shop/heritage');
  return data.items;
}
