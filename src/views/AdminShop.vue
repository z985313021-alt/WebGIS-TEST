<template>
  <div class="admin-page">
    <h2>🧑‍💼 文创后台管理</h2>
    <p class="sub">仅管理员可见：负责上架/编辑文创商品，并对已付款订单执行“发货”。</p>

    <!-- 统计 -->
    <div class="stat-row">
      <div class="stat"><div class="num">{{ stat.total || 0 }}</div><div class="lab">全部订单</div></div>
      <div class="stat"><div class="num w">{{ stat.pending || 0 }}</div><div class="lab">待付款</div></div>
      <div class="stat"><div class="num p">{{ stat.paid || 0 }}</div><div class="lab">待发货</div></div>
      <div class="stat"><div class="num s">{{ stat.shipped || 0 }}</div><div class="lab">已发货</div></div>
      <div class="stat"><div class="num d">{{ stat.done || 0 }}</div><div class="lab">已完成</div></div>
      <div class="stat"><div class="num c">{{ stat.cancelled || 0 }}</div><div class="lab">已取消</div></div>
    </div>

    <el-tabs v-model="tab" class="mgr">
      <!-- 订单管理 -->
      <el-tab-pane label="订单发货" name="orders">
        <div v-if="!orders.length" class="none">暂无订单</div>
        <el-table v-else :data="orders" border size="small" style="width:100%">
          <el-table-column label="订单号" prop="orderNo" width="200" />
          <el-table-column label="用户" prop="username" width="90" />
          <el-table-column label="收货" min-width="210">
            <template #default="{ row }">{{ row.receiver }} {{ row.phone }}<br /><span class="dim">{{ row.address }}</span></template>
          </el-table-column>
          <el-table-column label="商品" min-width="180">
            <template #default="{ row }">
              <div v-for="(it, i) in row.items" :key="i" class="mg-item">{{ it.productName }} ×{{ it.qty }}</div>
            </template>
          </el-table-column>
          <el-table-column label="金额" prop="total" width="80" align="right">
            <template #default="{ row }">¥{{ row.total.toFixed(2) }}</template>
          </el-table-column>
          <el-table-column label="状态" width="84" align="center">
            <template #default="{ row }"><el-tag :type="stColor(row.status)" size="small">{{ row.statusCn }}</el-tag></template>
          </el-table-column>
          <el-table-column label="物流" min-width="130">
            <template #default="{ row }">{{ row.trackingNo || '—' }}</template>
          </el-table-column>
          <el-table-column label="操作" width="150" fixed="right">
            <template #default="{ row }">
              <el-button v-if="row.status === 'paid'" size="small" type="primary" @click="openShip(row)">发货</el-button>
              <span v-else class="dim">{{ actHint(row.status) }}</span>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- 商品管理 -->
      <el-tab-pane label="商品管理" name="products">
        <div class="toolbar">
          <el-segmented v-model="prodFilter" :options="['全部', ...prodCatNames()]" />
          <el-button type="primary" size="small" @click="openNew">+ 新增商品</el-button>
        </div>
        <el-table :data="shownProducts" border size="small" style="width:100%">
          <el-table-column label="ID" prop="id" width="54" align="center" />
          <el-table-column label="图片" width="70">
            <template #default="{ row }">
              <el-image v-if="row.image" :src="row.image" fit="cover" style="width:44px;height:44px;border-radius:6px" />
              <span v-else>🏺</span>
            </template>
          </el-table-column>
          <el-table-column label="名称" min-width="170">
            <template #default="{ row }">
              <div class="nm">{{ row.name }}</div>
              <div class="dim">{{ row.category }}</div>
            </template>
          </el-table-column>
          <el-table-column label="价格" width="80">
            <template #default="{ row }">¥{{ row.price.toFixed(0) }}</template>
          </el-table-column>
          <el-table-column label="库存" prop="stock" width="70" align="center" />
          <el-table-column label="上下架" width="90" align="center">
            <template #default="{ row }">
              <el-tag :type="row.onSale ? 'success' : 'info'" size="small">{{ row.onSale ? '在售' : '下架' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="180" fixed="right" align="center">
            <template #default="{ row }">
              <el-button size="small" @click="openEdit(row)">编辑</el-button>
              <el-button size="small" type="danger" text @click="removeProduct(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <!-- 发货对话框 -->
    <el-dialog v-model="shipOpen" title="订单发货" width="420px">
      <p class="dim" style="margin-top:0">订单：{{ current?.orderNo }} / {{ current?.receiver }}</p>
      <el-input v-model="trackingNo" placeholder="填写物流单号（如 SF…）">
        <template #prepend>物流单号</template>
      </el-input>
      <template #footer>
        <el-button @click="shipOpen = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="doShip">确认发货</el-button>
      </template>
    </el-dialog>

    <!-- 商品编辑 / 新增 -->
    <el-dialog v-model="prodOpen" :title="editing ? '编辑商品' : '新增商品'" width="460px">
      <el-form label-width="72px" size="small">
        <el-form-item label="名称" required><el-input v-model="prodForm.name" placeholder="推荐加产品形制，如：…礼盒" /></el-form-item>
        <el-form-item label="类别">
          <el-select v-model="prodForm.category" filterable allow-create default-first-option placeholder="选择或输入非遗类别">
            <el-option v-for="c in prodCatNames()" :key="c" :value="c" />
          </el-select>
        </el-form-item>
        <el-form-item label="关联非遗">
          <el-select v-model="prodForm.heritageId" filterable clearable placeholder="可关联某非遗项目(可选)">
            <el-option v-for="h in heritageOpts" :key="h.id" :value="h.id" :label="`${h.name}（${h.category}）`" />
          </el-select>
        </el-form-item>
        <el-form-item label="价格"><el-input-number v-model="prodForm.price" :min="0.01" :precision="2" :step="1" style="width:150px" /></el-form-item>
        <el-form-item label="库存"><el-input-number v-model="prodForm.stock" :min="0" :step="1" style="width:150px" /></el-form-item>
        <el-form-item label="图片地址"><el-input v-model="prodForm.image" placeholder="/images/xx.jpg 或留空用关联非遗图" /></el-form-item>
        <el-form-item label="简介"><el-input v-model="prodForm.description" type="textarea" :rows="2" /></el-form-item>
        <el-form-item label="上下架"><el-switch v-model="prodForm.onSale" active-text="在售" inactive-text="下架" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="prodOpen = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="saveProduct">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import * as api from '@/data/api/shop';
import type { Order, Product } from '@/data/api/shop';

const tab = ref('orders');
const orders = ref<Order[]>([]);
const stat = reactive<Record<string, number>>({ total: 0, pending: 0, paid: 0, shipped: 0, done: 0, cancelled: 0 });
const products = ref<Product[]>([]);
const heritageOpts = ref<{ id: number; name: string; category: string }[]>([]);
const prodFilter = ref('全部');

const shipOpen = ref(false);
const submitting = ref(false);
const current = ref<Order | null>(null);
const trackingNo = ref('');

const prodOpen = ref(false);
const editing = ref<Product | null>(null);
const prodForm = reactive({ id: 0, name: '', category: '', heritageId: null as number | null, price: 1, stock: 10, image: '', description: '', onSale: true });

const shownProducts = computed(() => {
  if (prodFilter.value === '全部') return products.value;
  return products.value.filter((p) => p.category === prodFilter.value);
});
function prodCatNames() {
  const set: string[] = [];
  for (const p of products.value) if (!set.includes(p.category)) set.push(p.category);
  return set;
}
function stColor(s: string) {
  return { pending: 'warning', paid: 'primary', shipped: 'info', done: 'success', cancelled: 'danger' }[s] as any || 'info';
}
function actHint(s: string) {
  if (s === 'pending') return '待用户付款';
  if (s === 'shipped') return '已发货';
  if (s === 'done') return '已完成';
  if (s === 'cancelled') return '已取消';
  return '';
}
function openShip(o: Order) { current.value = o; trackingNo.value = ''; shipOpen.value = true; }
async function doShip() {
  if (!trackingNo.value.trim()) { ElMessage.warning('请填写物流单号'); return; }
  if (!current.value) return;
  submitting.value = true;
  try {
    await api.adminShip(current.value.orderNo, trackingNo.value.trim());
    ElMessage.success('已发货');
    shipOpen.value = false;
    await loadOrders();
  } catch (e: any) { ElMessage.error(e.response?.data?.msg || '操作失败'); }
  finally { submitting.value = false; }
}

function openNew() {
  editing.value = null;
  Object.assign(prodForm, { id: 0, name: '', category: '', heritageId: null, price: 1, stock: 10, image: '', description: '', onSale: true });
  prodOpen.value = true;
}
function openEdit(p: Product) {
  editing.value = p;
  Object.assign(prodForm, { id: p.id, name: p.name, category: p.category, heritageId: p.heritageId, price: p.price, stock: p.stock, image: p.image || '', description: p.description, onSale: !!p.onSale });
  prodOpen.value = true;
}
async function saveProduct() {
  if (!prodForm.name.trim()) { ElMessage.warning('请填写商品名称'); return; }
  submitting.value = true;
  try {
    if (editing.value) await api.adminUpdateProduct(prodForm.id, { ...prodForm, onSale: prodForm.onSale ? 1 : 0, price: Number(prodForm.price), stock: Number(prodForm.stock) });
    else await api.adminAddProduct({ ...prodForm, onSale: prodForm.onSale ? 1 : 0, price: Number(prodForm.price) });
    ElMessage.success('已保存');
    prodOpen.value = false;
    await loadProducts();
  } catch (e: any) { ElMessage.error(e.response?.data?.msg || '保存失败'); }
  finally { submitting.value = false; }
}
async function removeProduct(p: Product) {
  try {
    await ElMessageBox.confirm(`确定删除 ${p.name}？`, '删除确认', { type: 'warning' });
  } catch { return; }
  try { await api.adminDeleteProduct(p.id); ElMessage.success('已删除'); await loadProducts(); }
  catch (e: any) { ElMessage.error(e.response?.data?.msg || '删除失败'); }
}

async function loadOrders() {
  try {
    const r = await api.adminFetchOrders();
    orders.value = r.orders;
    Object.assign(stat, r.stat);
  } catch (e: any) { ElMessage.error(e.response?.data?.msg || '订单加载失败'); }
}
async function loadProducts() {
  try { products.value = await api.fetchProducts(''); } catch (e: any) { ElMessage.error(e.response?.data?.msg); }
}
async function loadHeritage() {
  try { heritageOpts.value = await api.fetchHeritageList(); } catch { /* 忽略 */ }
}

onMounted(async () => {
  await loadOrders();
  await loadProducts();
  await loadHeritage();
});
</script>

<style scoped>
.admin-page { padding: 22px 26px 40px; max-width: 1160px; margin: 0 auto; }
.admin-page h2 { margin: 0 0 4px; }
.sub { color: #8a93a5; margin: 0 0 18px; font-size: 13px; }
.stat-row { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; margin-bottom: 16px; }
.stat { background: #fff; border: 1px solid #edf0f5; border-radius: 12px; padding: 14px 8px; text-align: center; }
.num { font-size: 24px; font-weight: 700; }
.num.w { color: #e6a23c; } .num.p { color: #409eff; } .num.s { color: #909399; } .num.d { color: #67c23a; } .num.c { color: #f56c6c; }
.lab { color: #7a8494; font-size: 12px; margin-top: 2px; }
.mgr { background: #fff; border: 1px solid #edf0f5; border-radius: 12px; padding: 12px 16px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.dim { color: #9aa3b2; font-size: 12px; }
.mg-item { line-height: 1.7; }
.none { padding: 40px; text-align: center; color: #98a2b3; }
table .el-table__cell { padding: 6px 0 !important; }
</style>
