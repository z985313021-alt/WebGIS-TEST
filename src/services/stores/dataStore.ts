// 逻辑层：非遗数据状态（筛选 + 选中）
import { defineStore } from 'pinia';
import { loadHeritage, type HeritageItem } from '@/data/sources/heritage';

export const useDataStore = defineStore('data', {
  state: () => ({
    items: [] as HeritageItem[],
    loaded: false,
    selectedId: null as number | null,
    filterCategories: [] as string[],
    filterCity: null as string | null,
    filterBatch: null as number | null,
    keyword: '',
  }),
  getters: {
    selected(state): HeritageItem | null {
      return state.items.find((i) => i.id === state.selectedId) ?? null;
    },
    // 全部筛选条件组合后的可见要素
    filteredItems(state): HeritageItem[] {
      return state.items.filter((i) => {
        if (state.filterCategories.length > 0 && !state.filterCategories.includes(i.category)) return false;
        if (state.filterCity && i.city !== state.filterCity) return false;
        if (state.filterBatch != null && i.batch !== state.filterBatch) return false;
        if (state.keyword) {
          const kw = state.keyword.trim();
          if (!i.name.includes(kw) && !(i.district || '').includes(kw)) return false;
        }
        return true;
      });
    },
    // 每个类别的数量（图例/统计用）
    categoryCounts(state): Record<string, number> {
      const counts: Record<string, number> = {};
      for (const i of state.items) counts[i.category] = (counts[i.category] || 0) + 1;
      return counts;
    },
    cityOptions(state): string[] {
      return [...new Set(state.items.map((i) => i.city))].sort();
    },
  },
  actions: {
    init() {
      if (this.loaded) return;
      this.items = loadHeritage();
      this.loaded = true;
    },
    select(id: number | null) {
      this.selectedId = id;
    },
    resetFilters() {
      this.filterCategories = [];
      this.filterCity = null;
      this.filterBatch = null;
      this.keyword = '';
    },
  },
});
