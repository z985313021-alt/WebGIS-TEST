// 逻辑层：购物车数量（供顶栏徽标实时联动）
import { defineStore } from 'pinia';
import * as shopApi from '@/data/api/shop';

export const useCartStore = defineStore('cart', {
  state: () => ({ count: 0 as number, items: [] as shopApi.CartItem[] }),
  getters: {
    totalQty: (s) => s.items.reduce((sum, i) => sum + i.qty, 0),
    totalPrice: (s) => s.items.reduce((sum, i) => sum + i.price * i.qty, 0),
  },
  actions: {
    async refresh() {
      try {
        const items = await shopApi.fetchCart();
        this.items = items;
        this.count = items.reduce((s, i) => s + i.qty, 0);
      } catch {
        this.count = 0;
      }
    },
    setCount(n: number) { this.count = n; },
    clear() { this.count = 0; this.items = []; },
  },
});
