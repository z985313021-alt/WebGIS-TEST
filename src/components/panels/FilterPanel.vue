<template>
  <div class="filter-panel">
    <!-- 1. 高德智能地理联想搜索框（置顶主角，参考 Amap / Google Earth） -->
    <div class="hero-search-wrap">
      <el-autocomplete
        v-model="store.keyword"
        :fetch-suggestions="querySearchAmap"
        placeholder="搜索非遗项目、区县、齐鲁地标…"
        clearable
        class="hero-search-input"
        @select="onSelectTip"
      >
        <template #prefix>
          <el-icon class="search-icon"><Search /></el-icon>
        </template>
        <template #default="{ item }">
          <div class="tip-row">
            <span class="tip-badge" :class="item.isHeritage ? 'heritage' : 'poi'">
              {{ item.isHeritage ? '非遗' : '地标' }}
            </span>
            <span class="tip-name">{{ item.name }}</span>
            <span class="tip-district" v-if="item.district">{{ item.district }}</span>
          </div>
        </template>
      </el-autocomplete>
    </div>

    <!-- 2. ihchina 风格：十大非遗门类交互式丝质徽章 (1-Click Filter) -->
    <div class="category-section">
      <div class="cs-head">
        <span class="cs-title">❖ 齐鲁非遗十大门类</span>
        <button
          v-if="store.filterCategories.length"
          class="cs-clear-btn"
          @click="store.filterCategories = []"
        >
          重置门类 ({{ store.filterCategories.length }})
        </button>
      </div>

      <div class="category-pill-grid">
        <!-- 全部门类胶囊 -->
        <button
          class="cat-pill"
          :class="{ active: store.filterCategories.length === 0 }"
          @click="store.filterCategories = []"
        >
          <span class="cp-name">全部门类</span>
          <span class="cp-badge">{{ store.items.length }}</span>
        </button>

        <!-- 各门类专属胶囊 -->
        <button
          v-for="c in CATEGORIES"
          :key="c"
          class="cat-pill"
          :class="{ active: store.filterCategories.includes(c) }"
          @click="toggleCategory(c)"
        >
          <span class="cp-dot" :style="{ background: CATEGORY_COLORS[c] }"></span>
          <span class="cp-name">{{ c }}</span>
          <span class="cp-badge">{{ store.categoryCounts[c] ?? 0 }}</span>
        </button>
      </div>
    </div>

    <!-- 3. 地市与公布批次快捷筛选（紧凑精致双列排版） -->
    <div class="secondary-filter-row">
      <div class="sf-item">
        <span class="sf-label">地市</span>
        <el-select
          v-model="store.filterCity"
          placeholder="全省地市"
          clearable
          size="small"
          class="sf-select"
        >
          <el-option v-for="c in store.cityOptions" :key="c" :label="c" :value="c" />
        </el-select>
      </div>
      <div class="sf-item">
        <span class="sf-label">批次</span>
        <el-select
          v-model="store.filterBatch"
          placeholder="全部批次"
          clearable
          size="small"
          class="sf-select"
        >
          <el-option v-for="b in BATCHES" :key="b" :label="batchLabel(b)" :value="b" />
        </el-select>
      </div>
    </div>

    <!-- 高德实况天气卡片（选中地市时自动以微卡片呈现） -->
    <div v-if="cityWeather" class="city-weather-badge">
      <div class="cwb-head">
        <span class="cwb-title">❖ {{ cityWeather.city }} · 实况气象</span>
        <span class="cwb-temp">{{ cityWeather.temperature }}℃</span>
      </div>
      <div class="cwb-sub">
        <span>天气：{{ cityWeather.weather }}</span>
        <span>风向：{{ cityWeather.winddirection }}风 {{ cityWeather.windpower }}级</span>
        <span>湿度：{{ cityWeather.humidity }}%</span>
      </div>
    </div>

    <!-- 4. 统计与快捷重置 -->
    <div class="filter-actions-bar">
      <span class="fab-count">
        当前呈现 <b>{{ store.filteredItems.length }}</b> / {{ store.items.length }} 项
      </span>
      <button class="fab-reset-btn" @click="store.resetFilters()">
        <el-icon><RefreshRight /></el-icon> 重置筛选
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { Search, RefreshRight } from '@element-plus/icons-vue';
import { useDataStore } from '@/services/stores/dataStore';
import { CATEGORIES, CATEGORY_COLORS, BATCHES, batchLabel } from '@/data/sources/heritage';

const store = useDataStore();

function toggleCategory(category: string) {
  const idx = store.filterCategories.indexOf(category);
  if (idx >= 0) {
    store.filterCategories.splice(idx, 1);
  } else {
    store.filterCategories.push(category);
  }
}

// ---- 高德地市实况天气 ----
const cityWeather = ref<any>(null);

async function fetchCityWeather(cityName: string) {
  if (!cityName) {
    cityWeather.value = null;
    return;
  }
  try {
    const res = await fetch(`/api/amap/weather?city=${encodeURIComponent(cityName)}`);
    const d = await res.json();
    if (d.status === '1' && d.lives && d.lives.length) {
      cityWeather.value = d.lives[0];
    }
  } catch {
    cityWeather.value = null;
  }
}

watch(
  () => store.filterCity,
  (city) => {
    if (city) fetchCityWeather(city);
    else cityWeather.value = null;
  },
  { immediate: true }
);

// ---- 高德输入提示与本地非遗联想检索 ----
interface SearchTip {
  value: string;
  name: string;
  district?: string;
  isHeritage: boolean;
  heritageId?: number;
  location?: string; // "lng,lat"
}

async function querySearchAmap(queryString: string, cb: (results: SearchTip[]) => void) {
  const kw = (queryString || '').trim().toLowerCase();
  if (!kw) {
    cb([]);
    return;
  }

  const results: SearchTip[] = [];

  // 1. 本地非遗项目匹配（前 5 条）
  const matchedHeritages = store.items
    .filter((h) => h.name.toLowerCase().includes(kw) || (h.district && h.district.toLowerCase().includes(kw)))
    .slice(0, 5);

  matchedHeritages.forEach((h) => {
    results.push({
      value: h.name,
      name: h.name,
      district: `${h.city} · ${h.district || ''}`,
      isHeritage: true,
      heritageId: h.id,
    });
  });

  // 2. 调用高德地理输入提示 API（前 5 条，限定山东全省）
  try {
    const res = await fetch(`/api/amap/inputtips?keywords=${encodeURIComponent(kw)}&city=山东`);
    const d = await res.json();
    if (d.status === '1' && d.tips) {
      d.tips.slice(0, 5).forEach((t: any) => {
        if (t.name && t.location) {
          results.push({
            value: t.name,
            name: t.name,
            district: t.district || '',
            isHeritage: false,
            location: t.location,
          });
        }
      });
    }
  } catch {}

  cb(results);
}

function onSelectTip(item: any) {
  const tip = item as SearchTip;
  store.keyword = tip.name;
  if (tip.heritageId != null) {
    store.select(tip.heritageId);
    store.pendingFlyTo = { id: tip.heritageId, zoom: 15 };
  } else if (tip.location) {
    const [lng, lat] = tip.location.split(',').map(Number);
    if (!isNaN(lng) && !isNaN(lat)) {
      store.pendingFlyTo = { coord: [lng, lat], zoom: 14 };
    }
  }
}
</script>

<style scoped>
.filter-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* 1. 高德主角搜索输入框 */
.hero-search-wrap {
  width: 100%;
}
.hero-search-input {
  width: 100%;
}
.hero-search-input :deep(.el-input__wrapper) {
  background: #ffffff;
  border: 1px solid #d4c8af;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(43, 34, 24, 0.05);
  padding: 2px 10px;
  height: 32px;
  transition: border-color 150ms ease-out;
}
.hero-search-input :deep(.el-input__wrapper.is-focus) {
  border-color: #8f2317;
  box-shadow: 0 0 0 1px #8f2317;
  background: #ffffff;
}
.search-icon {
  color: #8a7862;
  font-size: 14px;
}

/* 联想搜索下拉列表 */
.tip-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}
.tip-badge {
  font-size: 10px;
  padding: 1px 4px;
  border-radius: 2px;
  line-height: 1.2;
}
.tip-badge.heritage {
  background: rgba(143, 35, 23, 0.12);
  color: #8f2317;
}
.tip-badge.poi {
  background: rgba(60, 106, 80, 0.12);
  color: #3c6a50;
}
.tip-name {
  font-weight: 500;
  color: #2b2218;
}
.tip-district {
  font-size: 11px;
  color: #888;
  margin-left: auto;
}

/* 2. ihchina 风格：门类分类网格 */
.category-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.cs-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.cs-title {
  font-family: var(--zi-font-serif, "STSong", "Songti SC", serif);
  font-weight: 700;
  font-size: 12.5px;
  color: #3a2a1a;
}
.cs-clear-btn {
  background: transparent;
  border: none;
  font-size: 11px;
  color: #8f2317;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 2px;
}
.cs-clear-btn:hover {
  background: rgba(143, 35, 23, 0.08);
}

.category-pill-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
}
.cat-pill {
  display: flex;
  align-items: center;
  padding: 6px 8px;
  background: #ffffff;
  border: 1px solid #e5dbcb;
  border-radius: 3px;
  cursor: pointer;
  transition: border-color 150ms ease-out, background-color 150ms ease-out;
  user-select: none;
}
.cat-pill:hover {
  background: #fffdf8;
  border-color: #c9b794;
  transform: none;
}
.cat-pill.active {
  background: #fcf4f3;
  border-color: #8f2317;
  box-shadow: none;
}
.cat-pill.active .cp-name {
  color: #8f2317;
  font-weight: 700;
}
.cp-dot {
  width: 6px;
  height: 6px;
  border-radius: 1px;
  margin-right: 6px;
  flex-shrink: 0;
}
.cp-name {
  font-size: 11.5px;
  color: #4a3b2b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  text-align: left;
}
.cp-badge {
  font-size: 10px;
  color: #8a7862;
  margin-left: 4px;
}

/* 3. 次级双列筛选 */
.secondary-filter-row {
  display: flex;
  gap: 8px;
}
.sf-item {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  background: #ffffff;
  border: 1px solid #e5dbcb;
  border-radius: 3px;
  padding: 4px 8px;
}
.sf-label {
  font-size: 11.5px;
  font-family: var(--zi-font-serif, "STSong", serif);
  font-weight: 600;
  color: #5c2417;
  white-space: nowrap;
}
.sf-select {
  flex: 1;
}
.sf-select :deep(.el-input__wrapper) {
  background: transparent !important;
  box-shadow: none !important;
  padding: 0 !important;
}

/* 实况气象微卡片 */
.city-weather-badge {
  background: #ffffff;
  border: 1px solid #e5dbcb;
  border-radius: 4px;
  padding: 8px 12px;
  box-shadow: 0 1px 4px rgba(43, 34, 24, 0.05);
}
.cwb-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}
.cwb-title {
  font-weight: 700;
  font-family: var(--zi-font-serif, "STSong", serif);
  color: #3a2b1c;
  font-size: 12px;
}
.cwb-temp {
  font-weight: 700;
  color: #8f2317;
  font-size: 15px;
  font-family: var(--zi-font-serif, "STSong", serif);
}
.cwb-sub {
  display: flex;
  gap: 10px;
  font-size: 11px;
  color: #6d5b45;
}

/* 4. 底部统计与重置 */
.filter-actions-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0 0;
  border-top: 1px solid rgba(180, 134, 31, 0.16);
}
.fab-count {
  font-size: 12px;
  color: #7a6946;
  font-family: var(--zi-font-serif, "STSong", serif);
}
.fab-count b {
  color: var(--zi-red, #8f2317);
  font-size: 14px;
}
.fab-reset-btn {
  background: transparent;
  border: none;
  color: #8f2317;
  font-size: 11.5px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background 0.15s;
}
.fab-reset-btn:hover {
  background: rgba(143, 35, 23, 0.08);
}
</style>