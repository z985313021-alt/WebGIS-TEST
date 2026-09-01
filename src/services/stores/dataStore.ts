// 逻辑层：非遗数据状态（筛选 + 选中 + 时空演变 + 用户上传数据集）
import { defineStore } from 'pinia';
import { loadHeritage, type HeritageItem } from '@/data/sources/heritage';

export interface UserDataset {
  id: number;
  name: string;
  geojson: object;
  health?: Record<string, unknown>;
  addedAt: string;
}

export const useDataStore = defineStore('data', {
  state: () => ({
    items: [] as HeritageItem[],
    loaded: false,
    selectedId: null as number | null,
    filterCategories: [] as string[],
    filterCity: null as string | null,
    filterBatch: null as number | null,
    /** 时空演变：批次上限（null=不限，1=只显示第一批，2=第一~二批...） */
    filterBatchMax: null as number | null,
    keyword: '',
    userDatasets: [] as UserDataset[],
    nextDatasetId: 1,
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
        if (state.filterBatchMax != null && (i.batch == null || i.batch > state.filterBatchMax)) return false;
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
    // 批次分布（时空演变统计）
    batchCounts(state): Record<number, number> {
      const counts: Record<number, number> = {};
      for (const i of state.items) {
        if (i.batch != null) counts[i.batch] = (counts[i.batch] || 0) + 1;
      }
      return counts;
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
      this.filterBatchMax = null;
      this.keyword = '';
    },
    /** 添加用户上传的数据集（用于地图叠加显示） */
    addUserDataset(name: string, geojson: object, health?: Record<string, unknown>) {
      const ds: UserDataset = {
        id: this.nextDatasetId++,
        name,
        geojson,
        health,
        addedAt: new Date().toLocaleString(),
      };
      this.userDatasets.push(ds);
      return ds.id;
    },
    removeUserDataset(id: number) {
      this.userDatasets = this.userDatasets.filter((d) => d.id !== id);
    },
  },
});
