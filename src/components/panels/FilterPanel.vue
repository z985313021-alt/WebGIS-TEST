<template>
  <div class="filter-panel">
    <div class="filter-row">
      <span class="label">底图</span>
      <el-radio-group v-model="mapStore.provider" size="small" style="width: 100%">
        <el-radio-button value="osm">OSM</el-radio-button>
        <el-radio-button value="tianditu" :disabled="!mapStore.tiandituConfigured">
          天地图
        </el-radio-button>
      </el-radio-group>
    </div>
    <div v-if="!mapStore.tiandituConfigured" class="basemap-hint">
      ⚠️ 天地图未启用：.env 未配置 TIANDITU_TK，当前使用 OSM 底图
    </div>

    <div class="filter-row">
      <span class="label">类别</span>
      <el-select
        v-model="store.filterCategories"
        multiple
        collapse-tags
        collapse-tags-tooltip
        placeholder="全部类别"
        clearable
        size="small"
        style="width: 100%"
      >
        <el-option v-for="c in CATEGORIES" :key="c" :label="c" :value="c" />
      </el-select>
    </div>

    <div class="filter-row">
      <span class="label">地市</span>
      <el-select v-model="store.filterCity" placeholder="全部地市" clearable size="small" style="width: 100%">
        <el-option v-for="c in store.cityOptions" :key="c" :label="c" :value="c" />
      </el-select>
    </div>

    <div class="filter-row">
      <span class="label">批次</span>
      <el-select v-model="store.filterBatch" placeholder="全部批次" clearable size="small" style="width: 100%">
        <el-option v-for="b in BATCHES" :key="b" :label="batchLabel(b)" :value="b" />
      </el-select>
    </div>

    <div class="filter-row">
      <span class="label">搜索</span>
      <el-input v-model="store.keyword" placeholder="名称/区县" clearable size="small" style="width: 100%" />
    </div>

    <div class="filter-actions">
      <span class="count">命中 <b>{{ store.filteredItems.length }}</b> / {{ store.items.length }}</span>
      <el-button size="small" text type="primary" @click="store.resetFilters()">重置</el-button>
    </div>

    <!-- 类别图例 + 数量 -->
    <div class="legend">
      <div v-for="c in CATEGORIES" :key="c" class="legend-item">
        <span class="dot" :style="{ background: CATEGORY_COLORS[c] }"></span>
        <span class="legend-name">{{ c }}</span>
        <span class="legend-count">{{ store.categoryCounts[c] ?? 0 }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDataStore } from '@/services/stores/dataStore';
import { useMapStore } from '@/services/stores/mapStore';
import { CATEGORIES, CATEGORY_COLORS, BATCHES, batchLabel } from '@/data/sources/heritage';

const store = useDataStore();
const mapStore = useMapStore();
</script>

<style scoped>
.filter-panel { display: flex; flex-direction: column; gap: 10px; }
.filter-row { display: flex; align-items: center; gap: 8px; }
.basemap-hint { font-size: 12px; color: #e6a23c; line-height: 1.4; }
.label { font-size: 13px; color: #666; white-space: nowrap; width: 34px; }
.filter-actions { display: flex; justify-content: space-between; align-items: center; }
.count { font-size: 12px; color: #999; }
.legend { border-top: 1px dashed #eee; padding-top: 8px; display: flex; flex-wrap: wrap; gap: 6px 12px; }
.legend-item { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #555; }
.dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
.legend-name { max-width: 110px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.legend-count { color: #999; }
</style>
