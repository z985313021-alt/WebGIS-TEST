<template>
  <div class="chat-system">
    <el-badge :value="totalUnread" :hidden="!totalUnread" :max="99" class="chat-fab">
      <el-button circle class="chat-toggle" :class="{ active: open }" @click="open = !open">
        <el-icon :size="22"><ChatDotRound /></el-icon>
      </el-button>
    </el-badge>

    <div v-if="open" class="chat-panel">
      <aside class="chat-side">
        <div class="side-header">
          <input v-model="search" placeholder="🔍 搜索用户..." class="search-input" />
        </div>
        <div class="side-list">
          <!-- 未读 -->
          <div v-if="unreadUsers.length" class="side-section">
            <div class="side-section-title">📩 未读消息 ({{ unreadUsers.length }})</div>
            <div
              v-for="u in unreadUsers"
              :key="'u-' + u.id"
              class="u-item unread-item"
              :class="{ active: activeChat?.id === u.id }"
              @click="startChat(u)"
            >
              <span class="u-av" :style="{ background: avatarColor(u.username) }">{{ u.username.slice(0, 1).toUpperCase() }}</span>
              <div class="u-info">
                <span class="u-name">{{ u.username }}<em v-if="u.role === 'admin'" class="role">客服</em></span>
                <span class="u-preview">新消息</span>
              </div>
              <span class="u-unread">{{ unreadMap[u.id] || 1 }}</span>
            </div>
          </div>
          <!-- 全部 -->
          <div class="side-section">
            <div v-if="unreadUsers.length" class="side-section-title">全部联系人</div>
            <div
              v-for="u in displayUsers"
              :key="'r-' + u.id"
              class="u-item"
              :class="{ active: activeChat?.id === u.id }"
              @click="startChat(u)"
            >
              <span class="u-av" :style="{ background: avatarColor(u.username) }">{{ u.username.slice(0, 1).toUpperCase() }}</span>
              <div class="u-info">
                <span class="u-name">{{ u.username }}<em v-if="u.role === 'admin'" class="role">客服</em></span>
                <span class="u-preview">点击发送消息</span>
              </div>
            </div>
          </div>
          <div v-if="!displayUsers.length && !unreadUsers.length" class="side-empty">暂无联系人</div>
        </div>
      </aside>

      <main class="chat-main" v-if="activeChat">
        <div class="chat-header">
          <el-button text :icon="Back" @click="activeChat = null" />
          <span class="h-av" :style="{ background: avatarColor(activeChat.username) }">{{ activeChat.username.slice(0, 1).toUpperCase() }}</span>
          <span class="h-name">{{ activeChat.username }}</span>
          <el-tag v-if="activeChat.role === 'admin'" size="small" type="warning">客服</el-tag>
        </div>
        <div class="chat-msgs" ref="msgsRef">
          <div v-for="m in messages" :key="m.id || m.ts" class="msg-row" :class="{ me: isMine(m) }">
            <span class="m-av" :style="{ background: avatarColor(m.fromName || (isMine(m) ? '我' : '?')) }">{{ (m.fromName || '?').slice(0, 1).toUpperCase() }}</span>
            <div class="m-col">
              <span class="m-name">{{ m.fromName || (isMine(m) ? '我' : '未知') }}</span>
              <div class="bubble">{{ m.content }}</div>
              <span class="m-time">{{ m.created_at?.slice(11, 16) || '' }}</span>
            </div>
          </div>
          <div v-if="!messages.length" class="chat-empty">👋 发送第一条消息开始对话</div>
        </div>
        <div class="chat-input">
          <el-input v-model="draft" placeholder="输入消息，Enter 发送" @keyup.enter="sendMsg" :disabled="!wsConnected" type="textarea" :rows="2" resize="none" />
          <el-button type="primary" @click="sendMsg" :disabled="!draft.trim()">发送</el-button>
        </div>
      </main>
      <main class="chat-main empty-main" v-else>
        <el-empty description="选择一个联系人开始聊天" />
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { ChatDotRound, Back } from '@element-plus/icons-vue';
import http from '../data/http';
import { wsConnected, onEvent } from '@/composables/useWebSocket';

const open = ref(false);
const users = ref([]);
const activeChat = ref(null);
const messages = ref([]);
const draft = ref('');
const search = ref('');
const unread = ref([]);
const me = ref(Number(localStorage.getItem('webgis_user_id') || 0));
const msgsRef = ref(null);
let pollTimer = null;

// 搜索过滤后的用户
const searchFiltered = computed(() => {
  const q = search.value.trim().toLowerCase();
  const list = users.value;
  if (!q) return list;
  return list.filter((u) => u.username.toLowerCase().includes(q));
});

const unreadMap = computed(() => {
  const m = {};
  for (const u of unread.value) m[u.from_user_id] = u.cnt;
  return m;
});
const totalUnread = computed(() => unread.value.reduce((a, b) => a + b.cnt, 0));
const unreadIds = computed(() => new Set(unread.value.map((u) => u.from_user_id)));
const unreadUsers = computed(() => searchFiltered.value.filter((u) => unreadIds.value.has(u.id)));
const displayUsers = computed(() => searchFiltered.value.filter((u) => !unreadIds.value.has(u.id)));

function isMine(m) { return m.from_user_id === me.value; }
function avatarColor(name) { const c = ['#b8352b', '#d9a020', '#3c6a50', '#4a7c9b', '#8b5e3c', '#6b4c8a']; let h = 0; for (const ch of (name || '')) h = ch.charCodeAt(0) + ((h << 5) - h); return c[Math.abs(h) % c.length]; }

async function loadUsers() {
  try {
    const { data } = await http.get('/users/online');
    users.value = (data.users || []).filter((u) => u.id !== me.value);
  } catch (e) { console.warn('[chat] loadUsers failed', e.message); }
}

async function loadUnread() {
  try {
    const { data } = await http.get('/messages/unread');
    unread.value = data?.unread || [];
  } catch (e) { console.warn('[chat] loadUnread failed', e.message); }
}

async function loadMessages() {
  if (!activeChat.value) return;
  try {
    const { data } = await http.get(`/messages/${activeChat.value.id}`);
    messages.value = data?.messages || [];
    nextTick(() => { msgsRef.value && (msgsRef.value.scrollTop = msgsRef.value.scrollHeight); });
  } catch (e) { console.warn('[chat] loadMessages failed', e.message); }
}

async function startChat(u) {
  activeChat.value = u;
  await loadMessages();
  try { await http.post(`/messages/read/${u.id}`); } catch {}
  await loadUnread();
}

async function sendMsg() {
  if (!draft.value.trim() || !activeChat.value) return;
  const content = draft.value.trim();
  draft.value = '';
  const ts = new Date().toLocaleString('zh-CN');
  // 乐观更新
  messages.value.push({ id: 'tmp_' + Date.now(), from_user_id: me.value, to_user_id: activeChat.value.id, content, fromName: '我', created_at: ts, read: true });
  nextTick(() => { msgsRef.value && (msgsRef.value.scrollTop = msgsRef.value.scrollHeight); });
  try {
    const { data } = await http.post('/messages', { toUserId: activeChat.value.id, content });
    await loadMessages();
    await loadUnread();
  } catch (e) { console.warn('[chat] sendMsg failed', e.message); }
}

function onWsMessage(msg) {
  if (msg.type !== 'message:private') return;
  const d = msg.data || {};
  const partnerId = d.from === me.value ? d.to : d.from;

  // 在当前聊天窗口 → 追加消息
  if (activeChat.value && partnerId === activeChat.value.id) {
    messages.value.push({
      id: d.id || Date.now(),
      from_user_id: d.from,
      to_user_id: d.to,
      content: d.content,
      fromName: d.fromName || (d.from === me.value ? '我' : activeChat.value?.username),
      created_at: new Date().toLocaleString('zh-CN'),
      read: true,
    });
    nextTick(() => { msgsRef.value && (msgsRef.value.scrollTop = msgsRef.value.scrollHeight); });
    try { http.post(`/messages/read/${partnerId}`); } catch {}
  }

  // 刷新未读
  loadUnread();

  // 面板关闭 → 弹通知
  if (!open.value && d.content) {
    import('element-plus').then(({ ElNotification }) => {
      ElNotification({ title: `💬 ${d.fromName || '新消息'}`, message: d.content.slice(0, 80), duration: 5000 });
    });
  }
}

onMounted(() => {
  loadUsers();
  loadUnread();
  onEvent('message:private', onWsMessage);
  pollTimer = setInterval(() => { loadUsers(); loadUnread(); }, 10_000);
});
onUnmounted(() => clearInterval(pollTimer));
watch(open, (v) => { if (v) { loadUsers(); loadUnread(); if (activeChat.value) loadMessages(); } });
</script>

<style scoped>
.chat-system { position: fixed; bottom: 24px; right: 24px; z-index: 9999; font-family: var(--zi-font-sans); }
.chat-fab :deep(.el-badge__content) { font-size: 10px; }
.chat-toggle { width: 52px; height: 52px; background: linear-gradient(135deg, #b8352b, #8f2317); border: none; color: #fff; box-shadow: 0 4px 16px rgba(184, 53, 43, 0.4); transition: transform .2s; }
.chat-toggle:hover { transform: scale(1.08); }
.chat-toggle.active { background: #6d4c2a; }

.chat-panel { position: absolute; bottom: 60px; right: 0; width: 660px; height: 500px; background: #fffdf8; border-radius: 14px; box-shadow: 0 8px 30px rgba(0,0,0,.18); display: flex; overflow: hidden; border: 1px solid #e6ddcc; }

.chat-side { width: 230px; border-right: 1px solid #e6ddcc; display: flex; flex-direction: column; background: #faf6ee; }
.side-header { padding: 10px; border-bottom: 1px solid #e6ddcc; }
.search-input { width: 100%; padding: 6px 10px; border: 1px solid #e6ddcc; border-radius: 6px; font-size: 12px; outline: none; box-sizing: border-box; background: #fff; }
.search-input:focus { border-color: #b8352b; }
.side-list { flex: 1; overflow-y: auto; }
.side-section { margin-bottom: 4px; }
.side-section-title { font-size: 11px; color: #a08c72; padding: 6px 12px 2px; font-weight: 600; }
.u-item { display: flex; align-items: center; gap: 8px; padding: 10px 12px; cursor: pointer; border-bottom: 1px solid #f0e9da; }
.u-item:hover, .u-item.active { background: #fdf1e0; }
.u-item.unread-item { background: #fff8ec; border-left: 3px solid #b8352b; }
.u-av { flex: 0 0 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 13px; }
.u-info { flex: 1; min-width: 0; }
.u-name { font-size: 13px; color: #4a3a2f; font-weight: 600; display: block; }
.role { font-style: normal; color: #b8352b; font-size: 10px; margin-left: 4px; }
.u-preview { font-size: 11px; color: #a08c72; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; }
.u-unread { background: #b8352b; color: #fff; border-radius: 999px; padding: 1px 7px; font-size: 10px; flex: 0 0 auto; }
.side-empty { text-align: center; color: #a08c72; padding: 30px 10px; font-size: 12px; }

.chat-main { flex: 1; display: flex; flex-direction: column; }
.empty-main { align-items: center; justify-content: center; }
.chat-header { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-bottom: 1px solid #e6ddcc; background: #fff; }
.h-av { width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 12px; }
.h-name { font-weight: 600; color: #4a3a2f; flex: 1; }

.chat-msgs { flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 12px; background: #faf6ee; }
.msg-row { display: flex; gap: 8px; align-items: flex-start; }
.msg-row.me { flex-direction: row-reverse; }
.m-av { flex: 0 0 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 12px; }
.m-col { max-width: 70%; display: flex; flex-direction: column; gap: 2px; }
.msg-row.me .m-col { align-items: flex-end; }
.m-name { font-size: 11px; color: #a08c72; }
.bubble { padding: 8px 12px; border-radius: 14px; background: #fff; color: #4a3a2f; font-size: 13px; line-height: 1.5; word-break: break-word; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
.msg-row.me .bubble { background: #b8352b; color: #fff; }
.m-time { font-size: 10px; color: #cdbda2; }
.chat-empty { text-align: center; color: #a08c72; padding: 40px 0; font-size: 13px; }

.chat-input { display: flex; gap: 8px; padding: 10px; border-top: 1px solid #e6ddcc; background: #fff; }
.chat-input .el-textarea { flex: 1; }
</style>
