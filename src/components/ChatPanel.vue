<template>
  <div class="chat-panel">
    <!-- 悬浮按钮 -->
    <el-badge :value="totalUnread" :hidden="!totalUnread" class="chat-fab" @click="open = true">
      <el-button circle :icon="ChatDotRound" size="large" type="primary" />
    </el-badge>

    <!-- 聊天抽屉 -->
    <el-drawer v-model="open" title="消息" size="420px" :with-header="false">
      <div class="chat-wrap">
        <!-- 用户列表 -->
        <aside class="chat-side" v-if="!activeChat">
          <div class="side-head">联系人</div>
          <div v-for="u in users" :key="u.id" class="u-item" @click="startChat(u)">
            <span class="u-av">{{ u.username.slice(0,1) }}</span>
            <span class="u-name">{{ u.username }}<em v-if="u.role==='admin'" class="role">客服</em></span>
            <span v-if="unreadMap[u.id]" class="unread">{{ unreadMap[u.id] }}</span>
          </div>
          <div v-if="!users.length" class="side-empty">暂无联系人</div>
        </aside>

        <!-- 对话区 -->
        <main class="chat-main" v-else>
          <div class="chat-head">
            <el-button text :icon="Back" @click="activeChat = null" />
            <span>{{ activeChat.username }}</span>
          </div>
          <div class="chat-msgs" ref="msgsRef">
            <div v-for="m in messages" :key="m.id" class="msg" :class="{ me: m.from_user_id === me }">
              <div class="bubble">{{ m.content }}</div>
              <div class="mts">{{ m.created_at }}</div>
            </div>
          </div>
          <div class="chat-input">
            <el-input v-model="draft" placeholder="输入消息..." @keyup.enter="sendMsg" :disabled="!wsConnected" />
            <el-button type="primary" @click="sendMsg" :disabled="!draft.trim()">发送</el-button>
          </div>
        </main>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue';
import { ChatDotRound, Back } from '@element-plus/icons-vue';
import http from '../data/http';
import { wsConnected, onEvent } from '@/composables/useWebSocket';

const open = ref(false);
const users = ref([]);
const activeChat = ref(null);
const messages = ref([]);
const draft = ref('');
const unread = ref([]);
const unreadMap = computed(() => Object.fromEntries(unread.value.map((u) => [u.from_user_id, u.cnt])));
const totalUnread = computed(() => unread.value.reduce((a, b) => a + b.cnt, 0));
const me = ref(Number(localStorage.getItem('webgis_user_id') || 0));
const msgsRef = ref(null);

let pollTimer = null;

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

async function startChat(u) {
  activeChat.value = u;
  await loadMessages();
  try { await http.post(`/messages/read/${u.id}`); } catch {}
  loadUnread();
}

async function loadMessages() {
  if (!activeChat.value) return;
  try {
    const { data } = await http.get(`/messages/${activeChat.value.id}`);
    messages.value = data.messages || [];
    await nextTick();
    msgsRef.value && (msgsRef.value.scrollTop = msgsRef.value.scrollHeight);
  } catch {}
}

async function sendMsg() {
  if (!draft.value.trim() || !activeChat.value) return;
  const content = draft.value.trim();
  draft.value = '';
  try {
    await http.post('/messages', { toUserId: activeChat.value.id, content });
    await loadMessages();
  } catch {}
}

function onPrivateMessage(msg) {
  // 如果消息来自当前聊天对象，追加到列表
  if (activeChat.value && msg.from === me.value || msg.to === activeChat.value?.id) {
    loadMessages();
  }
  loadUnread();
  // 如果抽屉没打开且有新消息，给提示
  if (!open.value) {
    import('element-plus').then(({ ElNotification }) => {
      ElNotification({ title: `来自 ${msg.fromName || '新消息'}`, message: msg.content.slice(0, 60), duration: 4000 });
    });
  }
}

onMounted(() => {
  loadUsers();
  loadUnread();
  onEvent('message:private', onPrivateMessage);
  pollTimer = setInterval(() => { loadUsers(); loadUnread(); }, 10_000);
  window.addEventListener('open-chat', onOpenChat);
});
onUnmounted(() => {
  clearInterval(pollTimer);
  window.removeEventListener('open-chat', onOpenChat);
});
function onOpenChat(e) {
  const admin = e.detail;
  if (!admin) return;
  open.value = true;
  if (!users.value.find((u) => u.id === admin.id)) users.value = [...users.value, admin];
  startChat(admin);
}
</script>

<style scoped>
.chat-fab { position: fixed; bottom: 80px; right: 24px; z-index: 1999; cursor: pointer; }
.chat-wrap { display: flex; height: 100%; }
.chat-side { width: 100%; border-right: 1px solid #efe7d6; overflow-y: auto; }
.side-head { padding: 14px; font-weight: 700; color: #4a3a2f; border-bottom: 1px solid #efe7d6; }
.u-item { display: flex; align-items: center; gap: 8px; padding: 10px 14px; cursor: pointer; }
.u-item:hover { background: #fdf8ed; }
.u-av { width: 32px; height: 32px; border-radius: 50%; background: #b8352b; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; }
.u-name { flex: 1; } .role { font-style: normal; color: #b8352b; font-size: 11px; margin-left: 4px; }
.unread { background: #b8352b; color: #fff; border-radius: 999px; padding: 1px 7px; font-size: 11px; }
.chat-main { display: flex; flex-direction: column; flex: 1; }
.chat-head { display: flex; align-items: center; gap: 8px; padding: 12px; border-bottom: 1px solid #efe7d6; font-weight: 700; }
.chat-msgs { flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 8px; }
.msg { display: flex; flex-direction: column; }
.msg.me { align-items: flex-end; }
.bubble { max-width: 75%; padding: 8px 12px; border-radius: 12px; background: #efe7d6; color: #4a3a2f; }
.msg.me .bubble { background: #b8352b; color: #fff; }
.mts { font-size: 10px; color: #a08c72; margin-top: 2px; }
.chat-input { display: flex; gap: 8px; padding: 12px; border-top: 1px solid #efe7d6; }
</style>
