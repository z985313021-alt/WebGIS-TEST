<template>
  <div class="admin-notify">
    <el-badge :value="unread" :hidden="!unread" class="bell" @click="panelVisible = true">
      <el-button circle :icon="Bell" />
    </el-badge>
    <el-drawer v-model="panelVisible" title="订单通知" size="360px">
      <div v-if="!list.length" class="empty">暂无新通知</div>
      <div v-for="n in list" :key="n.ts" class="item" :class="n.type.replace(':','-')">
        <div class="ico">{{ iconOf(n.type) }}</div>
        <div class="body">
          <div class="tt">{{ titleOf(n.type) }}</div>
          <div class="meta">{{ descOf(n) }}</div>
          <div class="time">{{ formatTime(n.ts) }}</div>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { Bell } from '@element-plus/icons-vue';

const list = ref([]);
const panelVisible = ref(false);
const unread = computed(() => list.value.filter((n) => !n.read).length);

function iconOf(t) { return { 'order:created': '🛒', 'order:paid': '💰', 'order:cancelled': '❌', 'order:done': '✅' }[t] || '🔔'; }
function titleOf(t) { return { 'order:created': '新订单', 'order:paid': '已付款', 'order:cancelled': '已取消', 'order:done': '已完成' }[t] || t; }
function descOf(n) { return [n.orderNo ? '#' + n.orderNo : '', n.buyer ? '买家:' + n.buyer : '', n.total ? '¥' + n.total : ''].filter(Boolean).join(' / '); }
function formatTime(ts) { return new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }

// 唯一通道：window 事件总线（不再走 onEvent，避免重复投递）
onMounted(() => window.addEventListener('ws-event', onWsEvent));
onUnmounted(() => window.removeEventListener('ws-event', onWsEvent));

function onWsEvent(e) {
  const msg = e.detail;
  if (!msg?.type?.startsWith('order:')) return;
  if (msg.type === 'order:shipped') { onUserNotify(msg.data); return; }
  onNotify(msg.data, msg.type, msg.ts);
}

function onNotify(data, type, ts) {
  list.value.unshift({ ...data, ts, type, read: false });
  import('element-plus').then(({ ElMessage }) => {
    ElMessage.success(`${titleOf(type)}: #${data.orderNo} ¥${data.total}`);
  });
}

function onUserNotify(data) {
  import('element-plus').then(({ ElMessage }) => {
    ElMessage.success(`📦 订单 #${data.orderNo} 已发货`);
  });
}
</script>

<style scoped>
.bell { cursor: pointer; }
.empty { text-align: center; color: #a08c72; padding: 40px 0; }
.item { display: flex; gap: 10px; padding: 10px; border-bottom: 1px solid #efe7d6; }
.ico { font-size: 20px; }
.tt { font-weight: 700; color: #4a3a2f; }
.meta { font-size: 12px; color: #6d4c2a; margin: 2px 0; }
.time { font-size: 11px; color: #a08c72; }
</style>
