<template>
  <div ref="mapEl" class="map-container"></div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { OLMapAdapter } from '@/services/map/OLMapAdapter';
import { useMapStore } from '@/services/stores/mapStore';

const mapEl = ref<HTMLElement | null>(null);
const mapStore = useMapStore();
let adapter: OLMapAdapter | null = null;

onMounted(() => {
  if (!mapEl.value) return;
  adapter = new OLMapAdapter();
  adapter.mount(mapEl.value);
  // 暴露给父组件用于联动（演示用）
  (window as any).__mapAdapter = adapter;
});

onBeforeUnmount(() => {
  adapter?.destroy();
  (window as any).__mapAdapter = null;
});

// 底图切换响应 store
import { watch } from 'vue';
watch(() => mapStore.baseMap, (t) => adapter?.setBaseMap(t));
</script>

<style scoped>
.map-container { width: 100%; height: 100%; background: #f0f0f0; }
</style>
