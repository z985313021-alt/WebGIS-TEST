import { defineStore } from 'pinia';
import { loadHeritage, type HeritageItem } from '@/data/sources/heritage';

export { type HeritageItem } from '@/data/sources/heritage';

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
    /** 飞行目标（非遗要素或经纬度坐标），MapContainer 消费后清除 */
    pendingFlyTo: null as { id?: number; coord?: [number, number]; zoom: number } | null,
    filterBatch: null as number | null,
    /** 时空演变：批次上限（null=不限，1=只显示第一批，2=第一~二批...） */
    filterBatchMax: null as number | null,
    keyword: '',
    userDatasets: [] as UserDataset[],
    nextDatasetId: 1,
    /** 待缩放到的用户数据集ID（数据管理页加载图层后设置，MapContainer消费后清除） */
    pendingZoomToDatasetId: null as number | null,
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
    setPendingZoomToDataset(id: number | null) {
    this.pendingZoomToDatasetId = id;
  },
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

    /** 导出全量 185+ 项齐鲁非遗标准 GeoJSON */
    exportHeritageGeoJSON() {
      this.init();
      const featureCollection = {
        type: 'FeatureCollection',
        crs: {
          type: 'name',
          properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' },
        },
        features: this.items.map((item) => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [item.lng, item.lat],
          },
          properties: {
            id: item.id,
            name: item.name,
            category: item.category,
            city: item.city,
            district: item.district,
            batch: item.batch,
            batchLabel: item.batch ? `第${item.batch}批` : '省级',
            level: '国家级与省级代表性名录',
            protectUnit: item.protectUnit || item.area || '',
          },
        })),
      };

      const blob = new Blob([JSON.stringify(featureCollection, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `齐鲁非遗全域空间数据集_WGS84_${new Date().toISOString().slice(0, 10)}.geojson`;
      a.click();
      URL.revokeObjectURL(url);
    },

    /** 导出全量 185+ 项齐鲁非遗 Excel 表格 */
    exportHeritageExcel() {
      this.init();
      import('xlsx').then((XLSX) => {
        const rows = this.items.map((item, idx) => ({
          序号: idx + 1,
          非遗项目名称: item.name,
          所属门类: item.category,
          所属地市: item.city,
          区县地址: item.district || item.city,
          公布批次: item.batch ? `第${item.batch}批` : '省级',
          经度_WGS84: item.lng,
          纬度_WGS84: item.lat,
          保护单位: item.protectUnit || item.area || '',
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '齐鲁非遗名录');
        XLSX.writeFile(wb, `齐鲁非遗全域空间名录_${new Date().toISOString().slice(0, 10)}.xlsx`);
      });
    },

    /** 导出全量 185+ 项齐鲁非遗 CSV 表格 */
    exportHeritageCsv() {
      this.init();
      const headers = ['序号', '非遗项目名称', '所属门类', '所属地市', '区县地址', '公布批次', '经度_WGS84', '纬度_WGS84', '保护单位'];
      const rows = this.items.map((item, idx) => [
        idx + 1,
        `"${(item.name || '').replace(/"/g, '""')}"`,
        `"${(item.category || '').replace(/"/g, '""')}"`,
        `"${(item.city || '').replace(/"/g, '""')}"`,
        `"${(item.district || item.city || '').replace(/"/g, '""')}"`,
        `"${item.batch ? `第${item.batch}批` : '省级'}"`,
        item.lng,
        item.lat,
        `"${(item.protectUnit || item.area || '').replace(/"/g, '""')}"`,
      ]);
      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `齐鲁非遗全域空间名录_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    },

    /** 载入预置齐鲁非遗专题空间图层仓储 */
    loadPreloadedThematic(thematicKey: string) {
      this.init();
      let matchedItems: HeritageItem[] = [];
      let layerName = '';

      if (thematicKey === 'yellow_river') {
        // 沿黄 9 市：菏泽、济宁、泰安、聊城、济南、德州、淄博、滨州、东营
        const yellowRiverCities = ['菏泽市', '济宁市', '泰安市', '聊城市', '济南市', '德州市', '淄博市', '滨州市', '东营市'];
        matchedItems = this.items.filter((i) => yellowRiverCities.includes(i.city));
        layerName = '❖ 专题图层：黄河流域（山东段）非遗生态廊道';
      } else if (thematicKey === 'grand_canal') {
        // 沿运 5 市：德州、聊城、泰安、济宁、枣庄
        const canalCities = ['德州市', '聊城市', '泰安市', '济宁市', '枣庄市'];
        matchedItems = this.items.filter((i) => canalCities.includes(i.city));
        layerName = '❖ 专题图层：京杭大运河（齐鲁段）活态工坊分布带';
      } else if (thematicKey === 'qi_great_wall') {
        // 齐长城沿线：济南、泰安、淄博、潍坊、临沂、日照、青岛
        const wallCities = ['济南市', '泰安市', '淄博市', '潍坊市', '临沂市', '日照市', '青岛市'];
        matchedItems = this.items.filter((i) => wallCities.includes(i.city));
        layerName = '❖ 专题图层：齐长城文化带沿线非遗保护网';
      } else if (thematicKey === 'national_masters') {
        // 传统技艺、传统美术核心工坊
        matchedItems = this.items.filter((i) => i.category.includes('技艺') || i.category.includes('美术'));
        layerName = '❖ 专题图层：齐鲁传统手工艺与大师工坊高精点位';
      }

      const geojson = {
        type: 'FeatureCollection',
        features: matchedItems.map((item) => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [item.lng, item.lat],
          },
          properties: {
            name: item.name,
            category: item.category,
            city: item.city,
            district: item.district,
            batch: item.batch,
            protectUnit: item.protectUnit || item.area || '',
          },
        })),
      };

      const dsId = this.addUserDataset(layerName, geojson, {
        total: matchedItems.length,
        outOfBounds: 0,
        missingCoord: 0,
        nullValueCount: 0,
        emptyNameCount: 0,
        duplicateNames: 0,
        fields: ['name', 'category', 'city', 'district', 'batch', 'protectUnit'],
      });

      return { id: dsId, count: matchedItems.length, name: layerName };
    },
  },
});
