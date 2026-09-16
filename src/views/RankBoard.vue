<template>
  <div class="rank-page">
    <!-- 总览 -->
    <el-card shadow="never" class="hero">
      <div class="hero-head">
        <div>
          <h2 class="hero-title">❖ 齐鲁非遗热度总览</h2>
          <p class="hero-sub">
            由 {{ fmt(overview.heritageTotal) }} 项非遗的公众互动与文创交易数据实时聚合，
            综合热度 = 点赞 ×1 + 评论 ×3 + 关联订单 ×5
          </p>
        </div>
        <el-button size="small" text @click="loadAll" :loading="loading">刷新数据</el-button>
      </div>
      <div class="hero-stats">
        <div class="stat"><b>{{ fmt(overview.likes) }}</b><span>累计点赞</span></div>
        <div class="stat"><b>{{ fmt(overview.comments) }}</b><span>研学评论</span></div>
        <div class="stat"><b>{{ fmt(overview.orders) }}</b><span>有效订单</span></div>
        <div class="stat"><b>¥{{ fmt(overview.revenue) }}</b><span>文创成交额</span></div>
      </div>
    </el-card>

    <div class="rank-grid">
      <!-- 非遗热度榜 -->
      <el-card shadow="never" class="rank-card">
        <div class="rc-head">
          <span class="rc-title">非遗热度榜</span>
          <el-radio-group v-model="heritageMetric" size="small" @change="loadHeritage">
            <el-radio-button value="heat">综合热度</el-radio-button>
            <el-radio-button value="likes">点赞</el-radio-button>
            <el-radio-button value="comments">评论</el-radio-button>
            <el-radio-button value="orders">关联订单</el-radio-button>
          </el-radio-group>
        </div>
        <div v-loading="heritageLoading" class="rank-list">
          <div
            v-for="(it, idx) in heritageItems"
            :key="it.id"
            class="rank-row"
            :class="{ 'is-top': idx < 3 }"
            @click="openHeritage(it)"
          >
            <span class="rk" :class="idx < 3 ? 'medal medal-' + (idx + 1) : ''">{{ idx + 1 }}</span>
            <span class="seal" :style="{ background: colorOf(it.category) }">{{ glyphOf(it.category) }}</span>
            <div class="body">
              <div class="line1">
                <span class="name">{{ it.name }}</span>
                <span class="val">{{ fmt(heritageValue(it)) }}</span>
              </div>
              <div class="line2">
                <span class="meta">{{ it.city }} · {{ it.category }}</span>
                <span class="metrics">赞 {{ it.likes }} / 评 {{ it.comments }} / 单 {{ it.orders }}</span>
              </div>
              <div class="bar"><i class="bar-in" :style="{ width: heritageBar(it), background: colorOf(it.category) }"></i></div>
            </div>
          </div>
          <el-empty v-if="!heritageLoading && !heritageItems.length" description="暂无榜单数据" :image-size="60" />
        </div>
      </el-card>

      <!-- 商品热销榜 -->
      <el-card shadow="never" class="rank-card">
        <div class="rc-head">
          <span class="rc-title">文创商品热销榜</span>
          <el-radio-group v-model="productMetric" size="small" @change="loadProducts">
            <el-radio-button value="sales">销量</el-radio-button>
            <el-radio-button value="orders">订单数</el-radio-button>
            <el-radio-button value="revenue">销售额</el-radio-button>
          </el-radio-group>
        </div>
        <div v-loading="productLoading" class="rank-list">
          <div
            v-for="(it, idx) in productItems"
            :key="it.id"
            class="rank-row"
            :class="{ 'is-top': idx < 3 }"
            @click="openShop(it)"
          >
            <span class="rk" :class="idx < 3 ? 'medal medal-' + (idx + 1) : ''">{{ idx + 1 }}</span>
            <img v-if="it.image" class="thumb" :src="it.image" :alt="it.name" @error="(e: any) => (e.target.style.display = 'none')" />
            <span v-else class="thumb thumb-ph">文创</span>
            <div class="body">
              <div class="line1">
                <span class="name">{{ it.name }}</span>
                <span class="val">{{ productValue(it) }}</span>
              </div>
              <div class="line2">
                <span class="meta">¥{{ it.price }} · 库存 {{ it.stock }}</span>
                <span class="metrics">销 {{ it.sales }} 件 / {{ it.orders }} 单</span>
              </div>
              <div class="bar"><i class="bar-in bar-gold" :style="{ width: productBar(it) }"></i></div>
            </div>
          </div>
          <el-empty v-if="!productLoading && !productItems.length" description="暂无榜单数据" :image-size="60" />
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { CATEGORY_COLORS, categoryGlyph } from '@/data/sources/heritage';
import {
  fetchRankOverview,
  fetchHeritageRank,
  fetchProductRank,
  type HeritageMetric,
  type HeritageRankItem,
  type ProductMetric,
  type ProductRankItem,
  type RankOverview,
} from '@/data/api/rank';

const router = useRouter();

const loading = ref(false);
const heritageLoading = ref(false);
const productLoading = ref(false);

const overview = ref<RankOverview>({
  likes: 0, comments: 0, orders: 0, revenue: 0,
  rankedHeritage: 0, heritageTotal: 0, productTotal: 0,
});
const heritageMetric = ref<HeritageMetric>('heat');
const productMetric = ref<ProductMetric>('sales');
const heritageItems = ref<HeritageRankItem[]>([]);
const productItems = ref<ProductRankItem[]>([]);

const fmt = (n: number) => (n ?? 0).toLocaleString('zh-CN');
const colorOf = (c: string) => CATEGORY_COLORS[c] ?? '#8a6b45';
const glyphOf = (c: string) => categoryGlyph(c);

/** 当前维度下非遗的取值 */
function heritageValue(it: HeritageRankItem): number {
  switch (heritageMetric.value) {
    case 'likes': return it.likes;
    case 'comments': return it.comments;
    case 'orders': return it.orders;
    default: return it.heat;
  }
}
function productValue(it: ProductRankItem): string {
  switch (productMetric.value) {
    case 'orders': return it.orders + ' 单';
    case 'revenue': return '¥' + fmt(it.revenue);
    default: return it.sales + ' 件';
  }
}
/** 数据条宽度：相对榜首归一，最低保留 6% 以便看清 */
function ratioBar(value: number, max: number): string {
  if (!max) return '6%';
  return Math.max(6, Math.round((value / max) * 100)) + '%';
}
function heritageBar(it: HeritageRankItem): string {
  return ratioBar(heritageValue(it), Math.max(...heritageItems.value.map(heritageValue), 1));
}
function productBar(it: ProductRankItem): string {
  const keyOf = (x: ProductRankItem) =>
    productMetric.value === 'orders' ? x.orders : productMetric.value === 'revenue' ? x.revenue : x.sales;
  return ratioBar(keyOf(it), Math.max(...productItems.value.map(keyOf), 1));
}

async function loadOverview() {
  loading.value = true;
  try {
    overview.value = await fetchRankOverview();
  } finally {
    loading.value = false;
  }
}
async function loadHeritage() {
  heritageLoading.value = true;
  try {
    heritageItems.value = await fetchHeritageRank(heritageMetric.value, 20);
  } finally {
    heritageLoading.value = false;
  }
}
async function loadProducts() {
  productLoading.value = true;
  try {
    productItems.value = await fetchProductRank(productMetric.value, 20);
  } finally {
    productLoading.value = false;
  }
}
async function loadAll() {
  await Promise.all([loadOverview(), loadHeritage(), loadProducts()]);
}

function openHeritage(it: HeritageRankItem) {
  router.push(`/heritage/${it.id}`);
}
function openShop(it: ProductRankItem) {
  router.push({ path: '/shop', query: { product: String(it.id) } });
}

onMounted(loadAll);
</script>

<style scoped>
.rank-page {
  padding: 16px;
}
.hero {
  margin-bottom: 16px;
  background: linear-gradient(180deg, #fffdf8 0%, #faf6ec 100%);
  border: 1px solid #e6ddcc;
}
.hero-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}
.hero-title {
  margin: 0 0 6px;
  font-size: 20px;
  color: #6d4c2a;
  letter-spacing: 0.06em;
  font-family: var(--zi-font-serif, "STSong", "Songti SC", serif);
}
.hero-sub {
  margin: 0;
  font-size: 12px;
  color: #a08c72;
}
.hero-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-top: 16px;
}
.stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 14px;
  border-radius: 10px;
  background: #fffdf8;
  border: 1px solid #efe7d6;
}
.stat b {
  font-size: 22px;
  color: #b8352b;
  font-family: ui-monospace, Consolas, monospace;
}
.stat span {
  font-size: 12px;
  color: #a08c72;
}

.rank-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  align-items: start;
}
.rank-card :deep(.el-card__body) {
  padding: 14px 16px;
}
.rc-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}
.rc-title {
  font-size: 15px;
  font-weight: 700;
  color: #6d4c2a;
  letter-spacing: 0.05em;
  font-family: var(--zi-font-serif, "STSong", "Songti SC", serif);
}

.rank-list {
  min-height: 120px;
}
.rank-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 6px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
}
.rank-row:hover {
  background: #f7f2e6;
}
.rank-row.is-top {
  background: #fdf9ef;
}
.rk {
  flex: 0 0 22px;
  height: 22px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: #a08c72;
  background: #f2ece0;
  font-family: ui-monospace, Consolas, monospace;
}
.medal {
  color: #fff;
}
.medal-1 { background: linear-gradient(135deg, #d4a03c, #b8802a); }
.medal-2 { background: linear-gradient(135deg, #b9b3a6, #948d80); }
.medal-3 { background: linear-gradient(135deg, #c88a55, #a96a37); }

.seal {
  flex: 0 0 26px;
  height: 26px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff8ec;
  font-size: 14px;
  font-weight: 700;
  font-family: KaiTi, STKaiti, SimSun, serif;
}
.thumb {
  flex: 0 0 34px;
  width: 34px;
  height: 34px;
  border-radius: 6px;
  object-fit: cover;
  border: 1px solid #efe7d6;
}
.thumb-ph {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: #a08c72;
  background: #f7f2e6;
}
.body {
  flex: 1;
  min-width: 0;
}
.line1 {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
}
.name {
  font-size: 13px;
  color: #4a3a2f;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.val {
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 700;
  color: #b8352b;
  font-family: ui-monospace, Consolas, monospace;
}
.line2 {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin: 2px 0 4px;
  font-size: 11px;
  color: #a08c72;
}
.meta {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.metrics {
  flex-shrink: 0;
}
.bar {
  height: 4px;
  border-radius: 2px;
  background: #f0ead9;
  overflow: hidden;
}
.bar-in {
  display: block;
  height: 100%;
  border-radius: 2px;
  background: #b8352b;
  transition: width 0.35s cubic-bezier(0.65, 0, 0.35, 1);
}
.bar-gold {
  background: linear-gradient(90deg, #d9a020, #b8802a);
}

@media (max-width: 1080px) {
  .rank-grid {
    grid-template-columns: 1fr;
  }
  .hero-stats {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
