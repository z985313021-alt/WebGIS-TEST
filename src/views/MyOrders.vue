<template>
  <div class="orders-page">
    <div class="head">
      <div>
        <h2>📦 我的订单</h2>
        <p class="sub">查看订单状态，或在“待付款 / 待发货”阶段取消、付款，收货后确认完成。</p>
      </div>
      <el-button type="primary" plain @click="router.push('/shop')">去逛逛商城 →</el-button>
    </div>

    <div v-if="loading" class="state"><el-skeleton :rows="5" animated /></div>
    <el-empty v-else-if="!orders.length" description="还没有订单，快去文创商城选购吧" style="padding:60px 0" />

    <div v-else class="list">
      <div v-for="o in orders" :key="o.orderNo" class="o-card">
        <div class="o-top">
          <span class="o-no">订单号：{{ o.orderNo }}</span>
          <el-tag :type="tagType(o.status)" effect="dark">{{ o.statusCn }}</el-tag>
        </div>
        <div class="o-row">
          <div class="o-items">
            <div v-for="(it, i) in o.items" :key="i" class="o-item">
              <el-image v-if="it.image" :src="it.image" fit="cover" class="o-img" />
              <img v-else :src="HD_ASSETS.placeholderPorcelain" class="o-img" alt="商品" />
              <div class="oi-name">{{ it.productName }}</div>
              <div class="oi-price">¥{{ it.price }} × {{ it.qty }}</div>
            </div>
          </div>
          <div class="o-total">共 {{ o.items.reduce((s, i) => s + i.qty, 0) }} 件<br /><b>¥{{ o.total.toFixed(2) }}</b></div>
        </div>
        <div class="o-meta">
          <div class="o-addr">收货：{{ o.receiver }} · {{ o.phone }} · {{ o.address }}</div>
          <div class="o-time">下单时间 {{ o.createdAt }}</div>
          <div v-if="o.trackingNo" class="o-trk">物流单号：<b>{{ o.trackingNo }}</b></div>
        </div>
        <div class="o-actions">
          <template v-if="o.status === 'pending'">
            <el-button size="small" type="primary" @click="doAct(o, 'pay')">立即支付</el-button>
            <el-button size="small" @click="doAct(o, 'cancel')">取消订单</el-button>
          </template>
          <template v-else-if="o.status === 'paid'">
            <span class="wait">等待管理员发货…</span>
            <el-button size="small" @click="doAct(o, 'cancel')">取消订单</el-button>
          </template>
          <template v-else-if="o.status === 'shipped'">
            <el-button size="small" type="success" @click="doAct(o, 'confirm')">确认收货</el-button>
          </template>
          <span v-else class="wait">
            {{ o.status === 'cancelled' ? '该订单已取消' : '交易完成，感谢支持 🎉' }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import * as api from '@/data/api/shop';
import type { Order } from '@/data/api/shop';
import { HD_ASSETS } from '@/data/sources/assets';

const router = useRouter();
const orders = ref<Order[]>([]);
const loading = ref(true);

function tagType(s: string) {
  return { pending: 'warning', paid: 'primary', shipped: 'info', done: 'success', cancelled: 'danger' }[s] as any || 'info';
}

async function load() {
  loading.value = true;
  try {
    orders.value = await api.fetchMyOrders();
  } catch (e: any) {
    ElMessage.error(e.response?.data?.msg || '加载失败');
  } finally {
    loading.value = false;
  }
}

async function doAct(o: Order, kind: 'pay' | 'cancel' | 'confirm') {
  try {
    if (kind === 'pay') {
      await ElMessageBox.confirm(`确认支付订单 ${o.orderNo}（¥${o.total.toFixed(2)}）？(模拟支付)`, '支付确认', { type: 'info' });
    } else if (kind === 'cancel') {
      await ElMessageBox.confirm('取消后若已扣库存将自动回补，确定取消？', '取消确认', { type: 'warning' });
      await api.cancelOrder(o.orderNo);
      ElMessage.success('订单已取消');
    } else if (kind === 'confirm') {
      await ElMessageBox.confirm('确认已收到货品？', '收货确认', { type: 'success', confirmButtonText: '确认收货' });
      await api.confirmOrder(o.orderNo);
      ElMessage.success('交易完成 🎉');
    }
    if (kind === 'pay') {
      await api.payOrder(o.orderNo);
      ElMessage.success('支付成功，商家将尽快发货');
    }
    await load();
  } catch (e: any) {
    if (e !== 'cancel' && !String(e?.message||'').includes('cancel')) ElMessage.error(e.response?.data?.msg || '操作失败');
  }
}

onMounted(load);
</script>

<style scoped>
.orders-page { padding: 22px 26px 40px; max-width: 960px; margin: 0 auto; }
.head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
.head h2 { margin: 0 0 6px; }
.sub { color: #8a93a5; margin: 0; font-size: 13px; }
.state { padding: 40px 0; }
.list { display: flex; flex-direction: column; gap: 16px; }
.o-card { border: 1px solid #edf0f5; border-radius: 12px; background: #fff; padding: 14px 16px; }
.o-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.o-no { color: #7a8494; font-size: 12.5px; }
.o-row { display: flex; justify-content: space-between; gap: 14px; }
.o-items { flex: 1; display: flex; flex-direction: column; gap: 6px; }
.o-item { display: flex; align-items: center; gap: 10px; }
.o-img { width: 44px; height: 44px; border-radius: 6px; flex: none; background: #eef1f7; object-fit: cover; display: flex; align-items: center; justify-content: center; }
.oi-name { flex: 1; font-size: 14px; }
.oi-price { color: #7a8494; font-size: 13px; }
.o-total { text-align: right; color: #7a8494; font-size: 13px; line-height: 1.9; flex: none; }
.o-meta { margin-top: 10px; font-size: 12px; color: #9aa3b2; line-height: 1.9; border-top: 1px dashed #eef0f5; padding-top: 8px; }
.o-total b, .o-total b, .sum { color: #d4380d; }
.o-actions { margin-top: 8px; display: flex; gap: 8px; align-items: center; }
.wait { color: #9aa3b2; font-size: 13px; }
</style>
