<template>
  <transition name="slide">
    <div v-if="visible" class="collapsible-panel" :class="position === 'right' ? 'panel-right' : 'panel-left'">
      <div class="panel-header">
        <span>{{ title }}</span>
        <el-button text size="small" @click="$emit('close')">收起 ✕</el-button>
      </div>
      <div class="panel-body">
        <slot />
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
defineProps<{ title: string; visible: boolean; position?: 'left' | 'right' }>();
defineEmits<{ (e: 'close'): void }>();
</script>

<style scoped>
.collapsible-panel {
  position: absolute;
  top: 12px;
  width: 300px;
  max-height: calc(100% - 24px);
  overflow: auto;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.18);
  z-index: 10;
}
.panel-left { left: 12px; }
.panel-right { right: 12px; }
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  font-weight: 600;
  border-bottom: 1px solid #eee;
}
.panel-body { padding: 12px; }
.slide-enter-active, .slide-leave-active { transition: all 0.2s; }
.slide-enter-from, .slide-leave-to { opacity: 0; transform: translateX(-20px); }
</style>
