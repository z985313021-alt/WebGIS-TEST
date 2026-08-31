// 逻辑层：Pinia store —— 地图 UI 状态（面板折叠、底图类型）
import { defineStore } from 'pinia';
import type { BaseMapType } from '@/data/sources/tianditu';

export const useMapStore = defineStore('map', {
  state: () => ({
    baseMap: 'vec' as BaseMapType,
    layerPanelVisible: true,
    drawPanelVisible: false,
    chartPanelVisible: false,
    loadedLayers: [] as string[],
  }),
  actions: {
    setBaseMap(t: BaseMapType) {
      this.baseMap = t;
    },
    toggleLayerPanel() {
      this.layerPanelVisible = !this.layerPanelVisible;
    },
    toggleDrawPanel() {
      this.drawPanelVisible = !this.drawPanelVisible;
    },
    toggleChartPanel() {
      this.chartPanelVisible = !this.chartPanelVisible;
    },
    addLoadedLayer(id: string) {
      if (!this.loadedLayers.includes(id)) this.loadedLayers.push(id);
    },
  },
});
