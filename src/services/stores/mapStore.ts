// 逻辑层：Pinia store —— 地图 UI 状态（面板折叠、底图类型、天地图状态、显示模式）
import { defineStore } from 'pinia';
import type { BaseMapType, BaseMapProvider } from '@/data/sources/tianditu';
import { fetchTiandituStatus } from '@/data/api/tianditu';

/** 地图显示模式：normal=普通标注 / cluster=点位聚合 / heatmap=密度热力图 */
export type MapDisplayMode = 'normal' | 'cluster' | 'heatmap';

export const useMapStore = defineStore('map', {
  state: () => ({
    baseMap: 'vec' as BaseMapType,
    /** 底图提供商：osm（OpenStreetMap，默认，无需密钥）/ tianditu（天地图，需在 .env 配置 tk） */
    provider: 'none' as BaseMapProvider,
    /** 后端天地图 tk 是否已配置（决定底图用 WMTS 还是 OSM 兜底） */
    tiandituConfigured: false,
    layerPanelVisible: true,
    drawPanelVisible: false,
    chartPanelVisible: false,
    loadedLayers: [] as string[],
    /** 成员2：地图显示模式（普通/聚合/热力图），三种互斥 */
    displayMode: 'normal' as MapDisplayMode,
    /** 聚合距离（像素，默认 60） */
    clusterDistance: 60,
  }),
  actions: {
    /** 查询后端天地图配置状态（逻辑层调数据层，不直接写 axios） */
    async checkTianditu() {
      try {
        this.tiandituConfigured = (await fetchTiandituStatus()).configured;
      } catch {
        this.tiandituConfigured = false;
      }
    },
    setBaseMap(t: BaseMapType) {
      this.baseMap = t;
    },
    setProvider(p: BaseMapProvider) {
      this.provider = p;
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
    /** 成员2：切换地图显示模式（三种互斥，切到同一种=关闭回到 normal） */
    setDisplayMode(mode: MapDisplayMode) {
      // 点击已激活的模式 → 回到普通模式
      this.displayMode = this.displayMode === mode ? 'normal' : mode;
    },
    /** 成员2：设置聚合距离 */
    setClusterDistance(distance: number) {
      this.clusterDistance = Math.max(10, Math.min(200, distance));
    },
  },
});