<template>
  <div class="shop-page">
    <!-- 顶栏 -->
    <div class="shop-hero">
      <div class="shop-hero-inner">
        <div class="shop-title">🛍️ 非遗文创商城</div>
        <p class="shop-sub">把山东的匠心带回家 · 每件商品都源自一项国家级/省级非物质文化遗产，结算由管理员负责发货</p>
      </div>
      <el-badge :value="cartTotalQty" :hidden="!cartTotalQty" class="cart-badge">
        <el-button type="primary" plain @click="cartOpen = true">🛒 购物车</el-button>
      </el-badge>
    </div>

    <!-- 分类标签 -->
    <div class="cat-bar">
      <el-check-tag :checked="activeCat === ''" @change="() => switchCat('')">全部</el-check-tag>
      <el-check-tag
        v-for="c in categories"
        :key="c.category"
        :checked="activeCat === c.category"
        @change="() => switchCat(c.category)"
      >
        {{ c.category }} · {{ c.c }}
      </el-check-tag>
    </div>

    <!-- 商品网格 -->
    <div v-if="loading" class="loading"><el-skeleton :rows="6" animated /></div>
    <div v-else-if="!products.length" class="empty">还没有上架的商品，快去管理后台添加吧～</div>
    <div v-else class="grid">
      <div v-for="p in products" :key="p.id" class="p-card">
        <div class="p-img">
          <el-image v-if="p.image" :src="p.image" fit="cover" lazy>
            <template #error><div class="img-ph">🏺</div></template>
          </el-image>
          <div v-else class="img-ph">🏺</div>
          <el-tag v-if="p.stock <= 0" size="small" type="danger" effect="dark" class="sold-tag">已售罄</el-tag>
        </div>
        <div class="p-body">
          <el-tag size="small" effect="plain" class="p-cat">{{ p.category }}</el-tag>
          <div class="p-name" :title="p.name">{{ p.name }}</div>
          <div class="p-sub">{{ p.subtitle }}</div>
          <div class="p-desc">{{ p.description }}</div>
          <div class="p-foot">
            <span class="p-price">¥{{ p.price.toFixed(0) }}</span>
            <span class="p-stock">库存 {{ p.stock }}</span>
          </div>
          <el-input-number v-if="pendingQty[p.id]" v-model="pendingQty[p.id]" :min="1" :max="p.stock" size="small" />
          <el-button
            type="primary"
            size="small"
            class="p-add"
            :disabled="p.stock <= 0"
            :loading="busyId === p.id"
            @click="addToCart(p)"
          >
            {{ cartQtyOf(p.id) ? `再加一件（已有 ${cartQtyOf(p.id)}）` : '加入购物车' }}
          </el-button>
          <el-button v-if="p.heritageId" size="small" text type="primary" @click="viewHeritage(p.heritageId)">
            查看代表性非遗 →
          </el-button>
        </div>
      </div>
    </div>

    <!-- 购物车抽屉 -->
    <el-drawer v-model="cartOpen" :size="380" title="🛒 我的购物车" direction="rtl">
      <div v-if="!cart.length" class="cart-empty">购物车是空的，去挑几件带回家吧～</div>
      <template v-else>
        <div class="cart-list">
          <div v-for="it in cart" :key="it.productId" class="cart-row">
            <el-image v-if="it.image" :src="it.image" fit="cover" class="cart-img" />
            <div v-else class="cart-img">🏺</div>
            <div class="ci-info">
              <div class="ci-name">{{ it.name }}</div>
              <div class="ci-like">¥{{ it.price.toFixed(0) }} × <el-input-number :model-value="it.qty" :min="1" :max="it.stock" size="small" @change="(v: number | undefined) => syncQty(it.productId, v)" /></div>
            </div>
            <el-button text type="danger" size="small" @click="removeIt(it.productId)">删除</el-button>
          </div>
        </div>
        <div class="cart-total">合计 <b class="sum">¥{{ cartTotal.toFixed(2) }}</b></div>
        <el-button type="primary" class="ckout" :loading="submitting" @click="openCheckout">去结算</el-button>
      </template>
    </el-drawer>

    <!-- 结算对话框 -->
    <el-dialog v-model="checkoutOpen" title="填写收货信息并下单" width="440px" :close-on-click-modal="false">
      <el-form :model="form" label-width="76px">
        <el-form-item label="收货人" required><el-input v-model="form.receiver" placeholder="姓名" /></el-form-item>
        <el-form-item label="手机号" required><el-input v-model="form.phone" placeholder="11 位手机号" maxlength="11" /></el-form-item>
        <el-form-item label="收货地址" required><el-input v-model="form.address" type="textarea" :rows="2" placeholder="省 / 市 / 区 / 详细地址" /></el-form-item>
        <el-form-item label="备注"><el-input v-model="form.remark" placeholder="选填" /></el-form-item>
      </el-form>
      <div class="ckout-tip">
        应付合计：<b class="sum">¥{{ cartTotal.toFixed(2) }}</b><br />
        <span class="shim">下单后默认“待付款”，点“立即支付（模拟）”进入待发货流程。</span>
      </div>
      <template #footer>
        <el-button @click="checkoutOpen = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="placeOrder">提交订单</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import * as api from '@/data/api/shop';
import type { Product, CategoryCnt, CartItem } from '@/data/api/shop';
import { useCartStore } from '@/services/stores/cartStore';

const cartS = useCartStore();
const router = useRouter();
const products = ref<Product[]>([]);
const categories = ref<CategoryCnt[]>([]);
const activeCat = ref('');
const loading = ref(true);
const busyId = ref<number | null>(null);
const pendingQty = reactive<Record<number, number>>({});

const cart = ref<CartItem[]>([]);
const cartOpen = ref(false);
const checkoutOpen = ref(false);
const submitting = ref(false);
const form = reactive({ receiver: '', phone: '', address: '', remark: '' });

const cartTotal = computed(() => cart.value.reduce((s, i) => s + i.price * i.qty, 0));
const cartTotalQty = computed(() => cart.value.reduce((s, i) => s + i.qty, 0));
const cartQtyOf = (id: number) => cart.value.find((i) => i.productId === id)?.qty ?? 0;

async function loadProducts() {
  loading.value = true;
  try {
    products.value = await api.fetchProducts(activeCat.value);
  } catch (e: any) {
    ElMessage.error(e.response?.data?.msg || '商品加载失败');
  } finally {
    loading.value = false;
  }
}
function switchCat(cat: string) {
  if (activeCat.value === cat) return;
  activeCat.value = cat;
  loadProducts();
}
async function loadCategories() {
  try { categories.value = await api.fetchCategories(); } catch { /* 忽略 */ }
}
async function loadCart() {
  try {
    cart.value = await api.fetchCart();
    cartS.refresh();
  } catch { /* 忽略（未登录等） */ }
}
function addToCart(p: Product) {
  const qty = pendingQty[p.id] && pendingQty[p.id] > 1 ? pendingQty[p.id] : 1;
  busyId.value = p.id;
  api
    .setCart(p.id, qty)
    .then((items) => {
      cart.value = items;
      cartS.refresh();
      pendingQty[p.id] = 1;
      ElMessage.success(`已加入购物车：「${p.name}」× ${qty}`);
    })
    .catch((e) => ElMessage.error(e.response?.data?.msg || '加入失败'))
    .finally(() => (busyId.value = null));
}
async function syncQty(pid: number, q: number | undefined) {
  const v = Number(q) || 1;
  try { cart.value = await api.setCart(pid, v); cartS.refresh(); } catch (e: any) { ElMessage.error(e.response?.data?.msg || '更新失败'); }
}
async function removeIt(pid: number) {
  try { cart.value = await api.removeCart(pid); cartS.refresh(); } catch (e: any) { ElMessage.error(e.response?.data?.msg); }
}
function openCheckout() {
  if (!form.receiver) form.receiver = '';
  checkoutOpen.value = true;
}
async function placeOrder() {
  if (!form.receiver || !form.phone || !form.address) {
    ElMessage.warning('请完整填写收货人、手机号与地址');
    return;
  }
  if (form.receiver.length > 30 || !/^1\d{10}$/.test(form.phone)) {
    ElMessage.warning('请检查手机号是否为 11 位');
    return;
  }
  submitting.value = true;
  try {
    const order = await api.submitOrder({ ...form });
    checkoutOpen.value = false;
    cart.value = [];
    cartS.refresh();
    // 模拟支付入口：可直接下单(待付款) 或 立即支付
    try {
      await ElMessageBox.confirm(
        `订单 ${order.orderNo} 已生成，应付 ¥${order.total.toFixed(2)}。要现在模拟付款吗？（否则保持“待付款”）`,
        '下单成功',
        { confirmButtonText: '立即支付', cancelButtonText: '稍后再说', type: 'success' },
      );
      await api.payOrder(order.orderNo);
      ElMessage.success('支付成功，订单进入“待发货”，请等待管理员发货');
      router.push('/orders');
      return;
    } catch (cancel) {
      /* 用户选择稍后支付 */
      ElMessage.info('已保留订单，可到“我的订单”稍后付款');
      router.push('/orders');
      return;
    }
  } catch (e: any) {
    ElMessage.error(e.response?.data?.msg || '下单失败');
    await loadCart();
  } finally {
    submitting.value = false;
  }
}

function viewHeritage(id: number | null) {
  if (id) router.push(`/heritage/${id}`);
}

onMounted(async () => {
  await loadProducts();
  await loadCategories();
  await loadCart();
});
</script>

<style scoped>
.shop-page { padding: 20px 24px 40px; max-width: 1180px; margin: 0 auto; }
.shop-hero {
  display: flex; align-items: center; justify-content: space-between;
  background: linear-gradient(135deg, #1743a0, #2f5b43);
  color: #fff; border-radius: 14px; padding: 20px 24px; margin-bottom: 18px;
}
.shop-title { font-size: 22px; font-weight: 700; }
.shop-sub { margin: 6px 0 0; font-size: 13px; opacity: 0.88; max-width: 720px; }

.cat-bar { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 18px; }

.loading, .empty { min-height: 180px; display: flex; align-items: center; justify-content: center; color: #888; }

.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 18px; }
.p-card {
  border: 1px solid #eef0f4; border-radius: 12px; overflow: hidden;
  background: #fff; transition: box-shadow 0.2s, transform 0.2s;
}
.p-card:hover { box-shadow: 0 8px 26px rgba(24, 51, 115, 0.12); transform: translateY(-3px); }
.p-img { position: relative; height: 178px; background: #f2f4f8; }
.p-img :deep(.el-image), .p-img .el-image { width: 100%; height: 100%; display: block; }
.img-ph { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 44px; color: #b6c2d9; }
.sold-tag { position: absolute; top: 8px; right: 8px; }
.p-body { padding: 12px 14px 14px; }
.p-cat { margin-bottom: 6px; }
.p-name { font-weight: 600; font-size: 15px; margin: 4px 0 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.p-sub { color: #8792a5; font-size: 12px; margin-bottom: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.p-desc { color: #5c6675; font-size: 12px; line-height: 1.5; height: 36px; overflow: hidden; margin-bottom: 8px; }
.p-foot { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 8px; }
.p-price { color: #d4380d; font-size: 19px; font-weight: 700; }
.p-stock { color: #98a2b3; font-size: 12px; }
.p-add { margin-top: 4px; }

.cart-empty { text-align: center; color: #98a2b3; padding: 60px 0; }
.cart-list { display: flex; flex-direction: column; gap: 12px; }
.cart-row { display: flex; gap: 10px; align-items: center; padding-bottom: 12px; border-bottom: 1px solid #f0f2f6; }
.cart-img { width: 56px; height: 56px; border-radius: 8px; background: #eef1f7; display: flex; align-items: center; justify-content: center; flex: none; object-fit: cover; }
.ci-info { flex: 1; min-width: 0; }
.ci-name { font-weight: 600; font-size: 14px; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cart-total { text-align: right; margin: 14px 0 10px; color: #555; }
.sum { color: #d4380d; font-size: 20px; }
.ckout, .ckout { width: 100%; }
.ckout-tip { font-size: 13px; color: #555; }
.shim { color: #98a2b3; font-size: 12px; }
</style>
