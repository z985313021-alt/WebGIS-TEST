<template>
  <div class="admin-notify">
    <el-badge :value="unread" :hidden="!unread" class="bell">
      <el-button circle :icon="Bell" @click="panelVisible = true" />
    </el-badge>
    <el-drawer v-model="panelVisible" title="订单通知" size="380px">
      <div v-if="!list.length" class="empty">暂无新通知</div>
      <div
        v-for="n in list"
        :key="n.ts"
        class="item"
        :class="[n.type.replace(':', '-'), { read: n.read }]"
        @click="markRead(n)"
      >
        <div class="ico">{{ iconOf(n.type) }}</div>
        <div class="body">
          <div class="tt">{{ titleOf(n.type) }}</div>
          <div class="meta">{{ descOf(n) }}</div>
          <div class="time">{{ formatTime(n.ts) }}</div>
        </div>
        <div class="act">
          <el-button
            v-if="n.type === 'order:paid'"
            size="small"
            type="primary"
            @click.stop="goShip(n)"
          >前往发货</el-button>
          <span v-else class="read-tag">{{ n.read ? '已读' : '未读' }}</span>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { Bell } from '@element-plus/icons-vue';

const router = useRouter();
const list = ref([]);
const panelVisible = ref(false);
const unread = computed(() => list.value.filter((n) => !n.read).length);

function iconOf(t) { return { 'order:created': '🛒', 'order:paid': '💰', 'order:cancelled': '❌', 'order:done': '✅' }[t] || '🔔'; }
function titleOf(t) { return { 'order:created': '新订单', 'order:paid': '已付款', 'order:cancelled': '已取消', 'order:done': '已完成' }[t] || t; }
function descOf(n) { return [n.orderNo ? '#' + n.orderNo : '', n.buyer ? '买家:' + n.buyer : '', n.total ? '¥' + n.total : ''].filter(Boolean).join(' / '); }
function formatTime(ts) { return new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }

// 点击通知 → 标记已读
function markRead(n) { n.read = true; }

// 前往发货 → 跳转到管理后台发货标签
function goShip(n) {
  n.read = true;
  panelVisible.value = false;
  router.push({ path: '/admin-shop', query: { tab: 'orders', orderNo: n.orderNo } });
}

onMounted(() => window.addEventListener('ws-event', onWsEvent));
onUnmounted(() => window.removeEventListener('ws-event', onWsEvent));

function onWsEvent(e) {
  const msg = e.detail;
  if (!msg?.type?.startsWith('order:')) return;
  const data = msg.data || {};
  list.value.unshift({ ...data, ts: msg.ts, type: msg.type, read: false });
  // 弹 toast
  import('element-plus').then(({ ElMessage }) => {
    const title = titleOf(msg.type);
    const detail = `#${data.orderNo} ¥${data.total}`;
    if (msg.type === 'order:paid') ElMessage.success(`📦 ${title}: ${detail} — 点击通知前往发货`);
    else ElMessage.info(`${title}: ${detail}`);
  });
}
</script>

<style scoped>
.admin-notify :deep(.el-badge__content) { font-size: 10px; }
.bell { cursor: pointer; }
.empty { text-align: center; color: #a08c72; padding: 40px 0; }
.item { display: flex; align-items: flex-start; gap: 10px; padding: 12px; border-bottom: 1px solid #efe7d6; cursor: pointer; transition: background .15s; }
.item:hover { background: #fdf8ed; }
.item.read { opacity: 0.55; }
.ico { font-size: 22px; flex: 0 0 28px; }
.body { flex: 1; min-width: 0; }
.tt { font-weight: 700; color: #4a3a2f; }
.meta { font-size: 12px; color: #6d4c2a; margin: 2px 0; }
.time { font-size: 11px; color: #cdbda2; }
.act { flex: 0 0 auto; display: flex; align-items: center; }
.read-tag { font-size: 11px; color: #a08c72; }
</style>
