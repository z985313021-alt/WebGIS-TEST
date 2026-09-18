<template>
  <div class="captcha-box">
    <div class="captcha-img" v-loading="loading" @click="refresh">
      <div v-if="svg" class="svg-wrap" v-html="svg"></div>
      <span v-else class="ph">点击获取验证码</span>
    </div>
    <el-input
      v-model="input"
      placeholder="请输入验证码"
      maxlength="8"
      @input="onInput"
      :prefix-icon="Key"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { Key } from '@element-plus/icons-vue';
import http from '../data/http';

const props = defineProps({
  modelValue: { type: String, default: '' },
});
const emit = defineEmits(['update:modelValue', 'update:captchaId']);

const svg = ref('');
const captchaId = ref('');
const loading = ref(false);
const input = ref(props.modelValue);

async function refresh() {
  loading.value = true;
  try {
    const { data } = await http.get('/auth/captcha');
    svg.value = data.svg;
    captchaId.value = data.id;
    emit('update:captchaId', data.id);
  } catch (e) {
    console.error('[Captcha] 加载失败:', e.message);
  } finally { loading.value = false; }
}

function onInput(v) { emit('update:modelValue', v); }

onMounted(refresh);
defineExpose({ refresh });
</script>

<style scoped>
.captcha-box { display: flex; gap: 10px; align-items: stretch; }
.captcha-img {
  flex: 0 0 120px; height: 40px; border-radius: 6px; overflow: hidden;
  background: #fdf8ed; border: 1px solid #e6ddcc; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}
.svg-wrap :deep(svg) { width: 100%; height: 100%; display: block; }
.ph { font-size: 11px; color: #a08c72; }
</style>
