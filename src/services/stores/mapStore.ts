// 逻辑层：Pinia store —— 地图 UI 状态（面板折叠、底图类型、天地图状态、显示模式）
import { defineStore } from 'pinia';
import { markRaw } from 'vue';
import type { BaseMapType, BaseMapProvider } from '@/data/sources/tianditu';
import { fetchTiandituStatus } from '@/data/api/tianditu';
import type { MapAdapter } from '@/services/map/MapAdapter';

/** 地图显示模式：normal=普通标注 / cluster=点位聚合 / heatmap=密度热力图 / choropleth=行政区域热力图 */
export type MapDisplayMode = 'normal' | 'cluster' | 'heatmap' | 'choropleth';

export const useMapStore = defineStore('map', {
  state: () => ({
    baseMap: 'vec' as BaseMapType,
    /** 底图提供商：amap（高德地图，默认，国内访问快）/ tianditu（天地图）/ osm（OpenStreetMap）/ none（无底图） */
    provider: 'amap' as BaseMapProvider,
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
    /** 成员2增强：当前点击的聚合圆内点位列表（用于弹窗显示） */
    clusterItems: [] as Array<Record<string, unknown>>,
    /** 当前点击的聚合圆中心经纬度 */
    clusterCenter: null as [number, number] | null,
    /** 聚合点位列表弹窗是否显示 */
    clusterPopupVisible: false,
    /** 地图引擎适配器实例（markRaw 避免响应式开销） */
    mapAdapter: null as MapAdapter | null,
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
    /** 设置地图引擎适配器（由 MapContainer 挂载/卸载时注册） */
    setMapAdapter(adapter: MapAdapter | null) {
      this.mapAdapter = adapter ? markRaw(adapter) : null;
    },
    /** 地图视口定位 */
    zoomTo(lonlat: [number, number], zoom?: number) {
      this.mapAdapter?.zoomTo(lonlat, zoom);
    },
    /** 成员2增强：显示聚合点位列表弹窗 */
    showClusterPopup(items: Array<Record<string, unknown>>, center: [number, number]) {
      this.clusterItems = items;
      this.clusterCenter = center;
      this.clusterPopupVisible = true;
    },
    /** 隐藏聚合点位列表弹窗 */
    hideClusterPopup() {
      this.clusterPopupVisible = false;
      this.clusterItems = [];
      this.clusterCenter = null;
    },
  },
});
