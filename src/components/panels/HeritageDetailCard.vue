<template>
  <div class="detail-card" v-if="item">
    <div class="detail-photo">
      <img v-if="item.photo" :src="item.photo" :alt="item.name" @error="imgError = true" />
      <div v-else-if="imgError" class="photo-placeholder" :style="{ background: color }">
        <span>🏺</span>
      </div>
      <div v-else class="photo-placeholder" :style="{ background: color }">
        <span>🏺</span>
      </div>
    </div>
    <h3 class="detail-name">{{ item.name }}</h3>
    <div class="detail-tags">
      <el-tag size="small" :color="color" style="color:#fff; border:none">{{ item.category }}</el-tag>
      <el-tag size="small" type="info">{{ batchLabel(item.batch) }}</el-tag>
      <el-tag v-if="item.type" size="small" type="warning" effect="plain">{{ item.type }}</el-tag>
    </div>
    <el-descriptions :column="1" size="small" class="detail-fields">
      <el-descriptions-item label="申报地区">{{ item.area || '—' }}</el-descriptions-item>
      <el-descriptions-item label="所在城市">{{ item.city }} {{ item.district }}</el-descriptions-item>
      <el-descriptions-item label="公布时间">{{ item.year || '—' }}</el-descriptions-item>
      <el-descriptions-item label="项目编号">{{ item.code || '—' }}</el-descriptions-item>
      <el-descriptions-item label="保护单位">{{ item.protectUnit || '—' }}</el-descriptions-item>
    </el-descriptions>
  </div>
  <div v-else class="detail-empty">
    <p>👆 点击地图上的非遗点位，或从左侧列表选择，查看详情</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useDataStore } from '@/services/stores/dataStore';
import { CATEGORY_COLORS, batchLabel } from '@/data/sources/heritage';

const store = useDataStore();
const item = computed(() => store.selected);
const color = computed(() => (item.value ? CATEGORY_COLORS[item.value.category] ?? '#999' : '#999'));
const imgError = ref(false);
watch(item, () => { imgError.value = false; });
</script>

<style scoped>
.detail-card { text-align: left; }
.detail-photo { width: 100%; height: 160px; border-radius: 8px; overflow: hidden; margin-bottom: 10px; }
.detail-photo img { width: 100%; height: 100%; object-fit: cover; }
.photo-placeholder {
  width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
  font-size: 48px; opacity: 0.85;
}
.detail-name { margin: 4px 0 8px; font-size: 16px; }
.detail-tags { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
.detail-fields { font-size: 12px; }
.detail-empty { color: #999; font-size: 13px; line-height: 1.8; text-align: center; padding: 40px 0; }
</style>
