<template>
  <div class="chat-system">
    <!-- 悬浮聊天按钮（带未读角标） -->
    <el-badge :value="totalUnread" :hidden="!totalUnread" :max="99" class="chat-fab">
      <el-button circle class="chat-toggle" :class="{ active: open }" @click="open = !open">
        <el-icon :size="22"><ChatDotRound /></el-icon>
      </el-button>
    </el-badge>

    <!-- 聊天面板 -->
    <div v-if="open" class="chat-panel">
      <!-- 左侧：联系人列表 -->
      <aside class="chat-side">
        <div class="side-header">
          <el-input v-model="search" placeholder="搜索用户..." :prefix-icon="Search" size="small" clearable />
        </div>
        <div class="side-list">
          <div
            v-for="u in filteredUsers"
            :key="u.id"
            class="u-item"
            :class="{ active: activeChat?.id === u.id }"
            @click="startChat(u)"
          >
            <span class="u-av" :style="{ background: avatarColor(u.username) }">{{ u.username.slice(0, 1).toUpperCase() }}</span>
            <div class="u-info">
              <span class="u-name">{{ u.username }}<em v-if="u.role === 'admin'" class="role">客服</em></span>
              <span class="u-preview">{{ lastMsg(u.id) }}</span>
            </div>
            <span v-if="unreadMap[u.id]" class="u-unread">{{ unreadMap[u.id] }}</span>
          </div>
          <div v-if="!filteredUsers.length" class="side-empty">{{ search ? '无匹配用户' : '暂无联系人' }}</div>
        </div>
      </aside>

      <!-- 右侧：对话区 -->
      <main class="chat-main" v-if="activeChat">
        <div class="chat-header">
          <el-button text :icon="Back" class="back-btn" @click="activeChat = null" />
          <span class="h-av" :style="{ background: avatarColor(activeChat.username) }">{{ activeChat.username.slice(0, 1).toUpperCase() }}</span>
          <span class="h-name">{{ activeChat.username }}</span>
          <el-tag v-if="activeChat.role === 'admin'" size="small" type="warning">客服</el-tag>
        </div>

        <!-- 未读消息提示条 -->
        <div v-if="unreadInChat.length" class="unread-bar" @click="scrollToUnread">
          ↓ {{ unreadInChat.length }} 条未读消息
        </div>

        <div class="chat-msgs" ref="msgsRef">
          <div v-for="m in displayedMessages" :key="m.id || m.ts" class="msg-row" :class="{ me: isMine(m) }">
            <span class="m-av" :style="{ background: avatarColor(m.fromName || (isMine(m) ? '我' : '?')) }">{{ (m.fromName || '?').slice(0, 1).toUpperCase() }}</span>
            <div class="m-col">
              <span class="m-name">{{ m.fromName || (isMine(m) ? '我' : '未知') }}</span>
              <div class="bubble">{{ m.content }}</div>
              <span class="m-time">{{ m.created_at?.slice(11, 16) || '' }}</span>
            </div>
          </div>
          <div v-if="!displayedMessages.length" class="chat-empty">发送第一条消息开始对话</div>
        </div>

        <div class="chat-input">
          <el-input
            v-model="draft"
            placeholder="输入消息，Enter 发送"
            @keyup.enter="sendMsg"
            :disabled="!wsConnected"
            type="textarea"
            :rows="2"
            resize="none"
          />
          <el-button type="primary" @click="sendMsg" :disabled="!draft.trim() || !wsConnected">发送</el-button>
        </div>
      </main>

      <!-- 未选联系人时的占位 -->
      <main class="chat-main empty-main" v-else>
        <el-empty description="选择一个联系人开始聊天" />
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { ChatDotRound, Search, Back } from '@element-plus/icons-vue';
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

// 消息唯一 ID 集合（防重复）
const seenMsgIds = new Set();

const filteredUsers = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return users.value;
  return users.value.filter((u) => u.username.toLowerCase().includes(q));
});

const unreadMap = computed(() => Object.fromEntries(unread.value.map((u) => [u.from_user_id, u.cnt])));
const totalUnread = computed(() => unread.value.reduce((a, b) => a + b.cnt, 0));
const unreadInChat = computed(() => {
  if (!activeChat.value) return [];
  return messages.value.filter((m) => !isMine(m) && !m.read);
});
const displayedMessages = computed(() => {
  // 服务端消息 + 实时追加的消息，按 id 排序
  return [...messages.value].sort((a, b) => (a.id || 0) - (b.id || 0));
});

function isMine(m) { return m.from_user_id === me.value || m.from === me.value; }
function avatarColor(name) { const colors = ['#b8352b', '#d9a020', '#3c6a50', '#4a7c9b', '#8b5e3c', '#6b4c8a']; let h = 0; for (const c of (name || '')) h = c.charCodeAt(0) + ((h << 5) - h); return colors[Math.abs(h) % colors.length]; }
function lastMsg(uid) { return ''; }

async function loadUsers() {
  try {
    const { data } = await http.get('/users/online');
    users.value = data.users?.filter((u) => u.id !== me.value) || [];
  } catch {}
}

async function loadUnread() {
  try {
    const { data } = await http.get('/messages/unread');
    unread.value = data.unread || [];
  } catch {}
}

async function loadMessages() {
  if (!activeChat.value) return;
  try {
    const { data } = await http.get(`/messages/${activeChat.value.id}`);
    messages.value = (data.messages || []).map((m) => ({ ...m, read: true }));
    await nextTick();
    msgsRef.value && (msgsRef.value.scrollTop = msgsRef.value.scrollHeight);
  } catch {}
}

async function startChat(u) {
  activeChat.value = u;
  seenMsgIds.clear();
  await loadMessages();
  try { await http.post(`/messages/read/${u.id}`); } catch {}
  loadUnread();
}

async function sendMsg() {
  if (!draft.value.trim() || !activeChat.value) return;
  const content = draft.value.trim();
  draft.value = '';
  const partnerId = activeChat.value.id;
  try {
    // 1. 立即在本地追加（发送方立刻看到，不等服务端）
    const ts = new Date().toLocaleString('zh-CN');
    messages.value.push({
      id: 'tmp_' + Date.now(),   // 临时 ID，loadMessages 后会替换
      from_user_id: me.value,
      to_user_id: partnerId,
      content,
      fromName: '我',
      created_at: ts,
      read: true,
    });
    nextTick(() => { msgsRef.value && (msgsRef.value.scrollTop = msgsRef.value.scrollHeight); });
    // 2. 发 HTTP
    await http.post('/messages', { toUserId: partnerId, content });
    // 3. 刷新列表 + 未读
    await loadMessages();
    await loadUnread();
  } catch {}
}

function scrollToUnread() {
  msgsRef.value && (msgsRef.value.scrollTop = msgsRef.value.scrollHeight);
}

// 实时接收消息（window 事件总线）
function onWsMessage(msg) {
  // msg 是 WebSocket 消息：{ type, data, ts }
  if (msg.type !== 'message:private') return;
  const data = msg.data || {};        // 真正的消息体在 data 里
  const fromId = data.from;
  const toId = data.to;
  const isFromMe = fromId === me.value;
  const partnerId = isFromMe ? toId : fromId;

  // 如果消息在当前聊天窗口，直接追加（实时显示）
  if (activeChat.value && partnerId === activeChat.value.id) {
    messages.value.push({
      id: data.id || Date.now(),
      from_user_id: fromId,
      to_user_id: toId,
      content: data.content,
      fromName: data.fromName || (isFromMe ? '我' : activeChat.value?.username),
      created_at: new Date().toLocaleString('zh-CN'),
      read: true,
    });
    nextTick(() => { msgsRef.value && (msgsRef.value.scrollTop = msgsRef.value.scrollHeight); });
    try { http.post(`/messages/read/${partnerId}`); } catch {}
  } else {
    // 不在当前聊天窗口，未读计数会更新（loadUnread）
  }

  loadUnread();

  // 如果面板关闭，弹系统通知
  if (!open.value && data.content) {
    import('element-plus').then(({ ElNotification }) => {
      ElNotification({ title: `💬 ${data.fromName || '新消息'}`, message: data.content.slice(0, 80), duration: 5000 });
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

// 打开面板时刷新
watch(open, (v) => { if (v) { loadUsers(); loadUnread(); if (activeChat.value) loadMessages(); } });
</script>

<style scoped>
.chat-system { position: fixed; bottom: 24px; right: 24px; z-index: 9999; font-family: var(--zi-font-sans); }
.chat-fab :deep(.el-badge__content) { font-size: 10px; }
.chat-toggle { width: 52px; height: 52px; background: linear-gradient(135deg, #b8352b, #8f2317); border: none; color: #fff; box-shadow: 0 4px 16px rgba(184, 53, 43, 0.4); transition: transform .2s; }
.chat-toggle:hover { transform: scale(1.08); }
.chat-toggle.active { background: #6d4c2a; }

.chat-panel { position: absolute; bottom: 60px; right: 0; width: 640px; height: 480px; background: #fffdf8; border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,.18); display: flex; overflow: hidden; border: 1px solid #e6ddcc; }

.chat-side { width: 220px; border-right: 1px solid #e6ddcc; display: flex; flex-direction: column; background: #faf6ee; }
.side-header { padding: 10px; border-bottom: 1px solid #e6ddcc; }
.side-list { flex: 1; overflow-y: auto; }
.u-item { display: flex; align-items: center; gap: 8px; padding: 10px; cursor: pointer; border-bottom: 1px solid #f0e9da; }
.u-item:hover, .u-item.active { background: #fdf1e0; }
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
.back-btn { display: none; }
.h-av { width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 12px; }
.h-name { font-weight: 600; color: #4a3a2f; flex: 1; }

.unread-bar { background: #fff3cd; color: #856404; text-align: center; padding: 6px; font-size: 12px; cursor: pointer; border-bottom: 1px solid #e6ddcc; }

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
