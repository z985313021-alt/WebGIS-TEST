<template>
  <div class="detail-page" v-if="item">
    <el-page-header @back="$router.push('/')" :content="item.name" class="header" />

    <el-row :gutter="20">
      <!-- 左：图片画廊 -->
      <el-col :span="10">
        <el-card shadow="never">
          <div class="gallery">
            <img :src="photos[activePhoto]" class="main-img" @error="imgError = true" />
            <div v-if="imgError" class="main-img placeholder" :style="{ background: color }">🏺</div>
            <div v-if="photos.length > 1" class="thumbs">
              <img
                v-for="(p, i) in photos"
                :key="i"
                :src="p"
                class="thumb"
                :class="{ active: i === activePhoto }"
                @click="activePhoto = i"
                @error="(e:any) => (e.target.style.display = 'none')"
              />
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 右：详细信息 -->
      <el-col :span="14">
        <el-card shadow="never">
          <div class="tags">
            <el-tag size="small" :color="color" style="color:#fff; border:none">{{ item.category }}</el-tag>
            <el-tag size="small" type="info">{{ batchLabel(item.batch) }}</el-tag>
            <el-tag v-if="item.type" size="small" type="warning" effect="plain">{{ item.type }}</el-tag>
            <el-tag v-if="item.year" size="small">{{ item.year }} 年公布</el-tag>
          </div>
          <el-descriptions :column="1" border class="fields">
            <el-descriptions-item label="项目名称">{{ item.name }}</el-descriptions-item>
            <el-descriptions-item label="类别">{{ item.category }}</el-descriptions-item>
            <el-descriptions-item label="批次">{{ batchLabel(item.batch) }}</el-descriptions-item>
            <el-descriptions-item label="申报地区">{{ item.area || '—' }}</el-descriptions-item>
            <el-descriptions-item label="所在城市">{{ item.city }} {{ item.district }}</el-descriptions-item>
            <el-descriptions-item label="公布时间">{{ item.year || '—' }}</el-descriptions-item>
            <el-descriptions-item label="项目编号">{{ item.code || '—' }}</el-descriptions-item>
            <el-descriptions-item label="保护单位">{{ item.protectUnit || '—' }}</el-descriptions-item>
          </el-descriptions>
          <div class="actions">
            <el-button type="primary" @click="viewOnMap">📍 在地图上查看</el-button>
            <el-button @click="$router.push('/')">返回地图</el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 互动区：点赞 + 评论（T11） -->
    <el-card shadow="never" class="interact-card">
      <div class="interact-head">
        <el-button
          size="large"
          :type="liked ? 'warning' : 'default'"
          :plain="!liked"
          round
          :loading="liking"
          @click="handleLike"
        >
          {{ liked ? '❤️ 已点赞' : '🤍 点赞' }} · {{ likeCount }}
        </el-button>
        <span class="interact-tip">为这项非遗点个赞吧～</span>
      </div>

      <el-divider />

      <div class="comment-form">
        <el-input v-model="nickname" placeholder="昵称（选填，默认匿名）" maxlength="20" class="nick-input" />
        <div class="comment-row">
          <el-input
            v-model="newComment"
            type="textarea"
            :rows="2"
            maxlength="200"
            show-word-limit
            placeholder="说说你对这项非遗的了解或感受…"
          />
          <el-button type="primary" :loading="submitting" :disabled="!newComment.trim()" @click="handleSubmit">
            发表评论
          </el-button>
        </div>
      </div>

      <div v-if="comments.length" class="comment-list">
        <div v-for="c in comments" :key="c.id" class="comment-item">
          <div class="comment-meta">
            <span class="comment-nick">🧑 {{ c.nickname }}</span>
            <span class="comment-time">{{ formatTime(c.createdAt) }}</span>
          </div>
          <div class="comment-content">{{ c.content }}</div>
        </div>
      </div>
      <el-empty v-else description="还没有评论，来抢沙发～" :image-size="60" />
    </el-card>
  </div>
  <div v-else class="missing">
    <el-empty description="未找到该非遗项目" />
    <el-button type="primary" @click="$router.push('/')">返回地图</el-button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useDataStore } from '@/services/stores/dataStore';
import { CATEGORY_COLORS, batchLabel } from '@/data/sources/heritage';
import {
  fetchLikeCount,
  postLike,
  fetchComments,
  postComment,
  type CommentItem,
} from '@/data/api/comment';

const route = useRoute();
const router = useRouter();
const store = useDataStore();
store.init();

const activePhoto = ref(0);
const imgError = ref(false);

const item = computed(() => store.items.find((i) => i.id === Number(route.params.id)) ?? null);
const color = computed(() => (item.value ? CATEGORY_COLORS[item.value.category] ?? '#999' : '#999'));
const photos = computed(() => {
  const p = item.value?.photos ?? [];
  return p.length ? p : [item.value?.photo].filter(Boolean) as string[];
});

watch(item, () => {
  activePhoto.value = 0;
  imgError.value = false;
});

// ---- T11 点赞 / 评论 ----
const likeCount = ref(0);
const liked = ref(false);
const liking = ref(false);
const comments = ref<CommentItem[]>([]);
const nickname = ref('');
const newComment = ref('');
const submitting = ref(false);

async function loadInteract() {
  const id = Number(route.params.id);
  if (!id) return;
  try {
    const [lc, cs] = await Promise.all([fetchLikeCount(id), fetchComments(id)]);
    likeCount.value = lc;
    comments.value = cs;
  } catch {
    /* 后端未起时静默降级，不阻塞详情展示 */
  }
}

async function handleLike() {
  const id = Number(route.params.id);
  if (!id || liking.value) return;
  liking.value = true;
  try {
    likeCount.value = await postLike(id);
    liked.value = true;
  } catch {
    ElMessage.error('点赞失败，请检查后端服务');
  } finally {
    liking.value = false;
  }
}

async function handleSubmit() {
  const id = Number(route.params.id);
  const text = newComment.value.trim();
  if (!id || !text || submitting.value) return;
  submitting.value = true;
  try {
    const c = await postComment(id, nickname.value, text);
    comments.value.unshift(c);
    newComment.value = '';
    ElMessage.success('评论已发布');
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.msg ?? '评论失败，请检查后端服务');
  } finally {
    submitting.value = false;
  }
}

function formatTime(t: string): string {
  if (!t) return '';
  // SQLite datetime('now','localtime') 输出 "YYYY-MM-DD HH:MM:SS"
  return t.replace('T', ' ').slice(0, 16);
}

watch(item, loadInteract, { immediate: true });

function viewOnMap() {
  if (!item.value) return;
  store.select(item.value.id);
  // 设置飞行目标，MapContainer 会消费并执行动画+局部放大（zoom=15 局部放大更明显）
  store.pendingFlyTo = { id: item.value.id, zoom: 15 };
  router.push('/');
}
</script>

<style scoped>
.detail-page { padding: 16px; max-width: 1000px; }
.header { margin-bottom: 16px; }
.gallery .main-img { width: 100%; height: 320px; object-fit: cover; border-radius: 8px; }
.main-img.placeholder { display: flex; align-items: center; justify-content: center; font-size: 72px; }
.thumbs { display: flex; gap: 8px; margin-top: 10px; overflow-x: auto; }
.thumb { width: 72px; height: 56px; object-fit: cover; border-radius: 6px; cursor: pointer; border: 2px solid transparent; }
.thumb.active { border-color: #409eff; }
.tags { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 14px; }
.fields { font-size: 13px; }
.actions { margin-top: 16px; display: flex; gap: 10px; }
.missing { padding: 60px 0; text-align: center; }

/* ---- T11 互动区 ---- */
.interact-card { margin-top: 20px; }
.interact-head { display: flex; align-items: center; gap: 16px; }
.interact-tip { font-size: 13px; color: #999; }
.comment-form { margin-bottom: 8px; }
.nick-input { width: 240px; margin-bottom: 10px; }
.comment-row { display: flex; gap: 10px; align-items: flex-end; }
.comment-row .el-textarea { flex: 1; }
.comment-list { margin-top: 16px; }
.comment-item { padding: 10px 4px; border-bottom: 1px dashed #eee; }
.comment-item:last-child { border-bottom: none; }
.comment-meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.comment-nick { font-size: 13px; font-weight: 600; color: #444; }
.comment-time { font-size: 12px; color: #aaa; }
.comment-content { font-size: 13px; color: #555; line-height: 1.6; white-space: pre-wrap; word-break: break-word; }
</style>
