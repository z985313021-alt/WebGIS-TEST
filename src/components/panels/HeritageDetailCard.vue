<template>
  <div class="detail-card" v-if="item">
    <div class="detail-photo">
      <!-- 全部图片：多图用轮播，单图直接展示 -->
      <el-carousel
        v-if="allPhotos.length > 1"
        height="160px"
        :autoplay="false"
        indicator-position="outside"
        arrow="always"
      >
        <el-carousel-item v-for="(p, i) in allPhotos" :key="i">
          <img :src="p" :alt="item.name" class="carousel-img" @error="handleImgError(i)" />
          <div v-if="failedPhotos.includes(i)" class="photo-placeholder" :style="{ background: color }">
            <span>🏺</span>
          </div>
        </el-carousel-item>
      </el-carousel>
      <div v-else-if="allPhotos.length === 1" class="single-photo">
        <img :src="allPhotos[0]" :alt="item.name" @error="imgError = true" />
        <div v-if="imgError" class="photo-placeholder" :style="{ background: color }">
          <span>🏺</span>
        </div>
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
    <el-button size="small" type="primary" plain class="detail-link" @click="goDetail">查看完整详情 →</el-button>
  </div>
  <div v-else class="detail-empty">
    <p>👆 点击地图上的非遗点位，或从左侧列表选择，查看详情</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useDataStore } from '@/services/stores/dataStore';
import { CATEGORY_COLORS, batchLabel } from '@/data/sources/heritage';

const store = useDataStore();
const router = useRouter();
const item = computed(() => store.selected);
const color = computed(() => (item.value ? CATEGORY_COLORS[item.value.category] ?? '#999' : '#999'));
const imgError = ref(false);
/** 全部图片：优先 photos[]（完整图集），回退到 photo（单张） */
const allPhotos = computed(() => {
  const photos = item.value?.photos;
  if (photos && photos.length > 0) return photos;
  return item.value?.photo ? [item.value.photo] : [];
});
/** 轮播中加载失败的图片索引（显示占位图） */
const failedPhotos = ref<number[]>([]);
function handleImgError(i: number) {
  if (!failedPhotos.value.includes(i)) failedPhotos.value.push(i);
}
watch(item, () => {
  imgError.value = false;
  failedPhotos.value = [];
});

function goDetail() {
  if (item.value) router.push(`/heritage/${item.value.id}`);
}
</script>

<style scoped>
.detail-card { text-align: left; }
.detail-photo { width: 100%; height: 160px; border-radius: 8px; overflow: hidden; margin-bottom: 10px; }
.detail-photo img { width: 100%; height: 100%; object-fit: cover; }
.carousel-img { width: 100%; height: 100%; object-fit: cover; }
.single-photo { width: 100%; height: 100%; }
.single-photo img { width: 100%; height: 100%; object-fit: cover; }
.photo-placeholder {
  width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
  font-size: 48px; opacity: 0.85;
}
.detail-name { margin: 4px 0 8px; font-size: 16px; }
.detail-tags { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
.detail-fields { font-size: 12px; }
.detail-empty { color: #999; font-size: 13px; line-height: 1.8; text-align: center; padding: 40px 0; }
</style>
