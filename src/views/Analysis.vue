<template>
  <div class="page">
    <h2>空间分析</h2>
    <p>空间分析已整合到地图主页（主页底部「空间分析」按钮）。</p>
    <el-button type="primary" @click="$router.push('/?tool=analysis')">前往地图主页</el-button>
  </div>
</template>
<script setup lang="ts"></script>
<style scoped>.page { padding: 16px; }</style>
