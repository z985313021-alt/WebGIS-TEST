<template>
  <div class="detail-page" v-if="item">
    <el-page-header @back="$router.push('/')" :content="item.name" class="header" />

    <el-row :gutter="20">
      <!-- 左：图片画廊 -->
      <el-col :span="10">
        <el-card shadow="never">
          <div class="gallery">
            <img :src="photos[activePhoto]" class="main-img" @error="imgError = true" />
            <div v-if="imgError" class="main-img placeholder" :style="{ background: color }">🏺</div>
            <div v-if="photos.length > 1" class="thumbs">
              <img
                v-for="(p, i) in photos"
                :key="i"
                :src="p"
                class="thumb"
                :class="{ active: i === activePhoto }"
                @click="activePhoto = i"
                @error="(e:any) => (e.target.style.display = 'none')"
              />
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 右：详细信息 -->
      <el-col :span="14">
        <el-card shadow="never">
          <div class="tags">
            <el-tag size="small" :color="color" style="color:#fff; border:none">{{ item.category }}</el-tag>
            <el-tag size="small" type="info">{{ batchLabel(item.batch) }}</el-tag>
            <el-tag v-if="item.type" size="small" type="warning" effect="plain">{{ item.type }}</el-tag>
            <el-tag v-if="item.year" size="small">{{ item.year }} 年公布</el-tag>
          </div>
          <el-descriptions :column="1" border class="fields">
            <el-descriptions-item label="项目名称">{{ item.name }}</el-descriptions-item>
            <el-descriptions-item label="类别">{{ item.category }}</el-descriptions-item>
            <el-descriptions-item label="批次">{{ batchLabel(item.batch) }}</el-descriptions-item>
            <el-descriptions-item label="申报地区">{{ item.area || '—' }}</el-descriptions-item>
            <el-descriptions-item label="所在城市">{{ item.city }} {{ item.district }}</el-descriptions-item>
            <el-descriptions-item label="公布时间">{{ item.year || '—' }}</el-descriptions-item>
            <el-descriptions-item label="项目编号">{{ item.code || '—' }}</el-descriptions-item>
            <el-descriptions-item label="保护单位">{{ item.protectUnit || '—' }}</el-descriptions-item>
          </el-descriptions>
          <div class="actions">
            <el-button type="primary" @click="viewOnMap">📍 在地图上查看</el-button>
            <el-button @click="$router.push('/')">返回地图</el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
  <div v-else class="missing">
    <el-empty description="未找到该非遗项目" />
    <el-button type="primary" @click="$router.push('/')">返回地图</el-button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useDataStore } from '@/services/stores/dataStore';
import { CATEGORY_COLORS, batchLabel } from '@/data/sources/heritage';

const route = useRoute();
const router = useRouter();
const store = useDataStore();
store.init();

const activePhoto = ref(0);
const imgError = ref(false);

const item = computed(() => store.items.find((i) => i.id === Number(route.params.id)) ?? null);
const color = computed(() => (item.value ? CATEGORY_COLORS[item.value.category] ?? '#999' : '#999'));
const photos = computed(() => {
  const p = item.value?.photos ?? [];
  return p.length ? p : [item.value?.photo].filter(Boolean) as string[];
});

watch(item, () => {
  activePhoto.value = 0;
  imgError.value = false;
});

function viewOnMap() {
  if (!item.value) return;
  store.select(item.value.id);
  router.push('/');
}
</script>

<style scoped>
.detail-page { padding: 16px; max-width: 1000px; }
.header { margin-bottom: 16px; }
.gallery .main-img { width: 100%; height: 320px; object-fit: cover; border-radius: 8px; }
.main-img.placeholder { display: flex; align-items: center; justify-content: center; font-size: 72px; }
.thumbs { display: flex; gap: 8px; margin-top: 10px; overflow-x: auto; }
.thumb { width: 72px; height: 56px; object-fit: cover; border-radius: 6px; cursor: pointer; border: 2px solid transparent; }
.thumb.active { border-color: #409eff; }
.tags { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 14px; }
.fields { font-size: 13px; }
.actions { margin-top: 16px; display: flex; gap: 10px; }
.missing { padding: 60px 0; text-align: center; }
</style>
