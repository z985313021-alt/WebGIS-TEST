<template>
  <el-container class="app-root">
    <el-header class="top-nav">
      <div class="brand">WebGIS 实习平台</div>
      <el-menu mode="horizontal" :router="true" :default-active="route.path" class="nav-menu">
        <el-menu-item index="/">地图主页</el-menu-item>
        <el-menu-item index="/data">数据管理</el-menu-item>
        <el-menu-item index="/analysis">空间分析</el-menu-item>
        <el-menu-item index="/chart">图表可视化</el-menu-item>
        <el-menu-item index="/travel">旅游路线</el-menu-item>
        <el-menu-item index="/about">关于</el-menu-item>
        <el-menu-item index="/register">注册</el-menu-item>
      </el-menu>
    </el-header>
    <el-main class="main-area">
      <router-view />
    </el-main>
  </el-container>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router';
const route = useRoute();
</script>

<style scoped>
.app-root { height: 100%; }
.top-nav { display: flex; align-items: center; background: #001529; padding: 0 16px; }
.brand { color: #fff; font-weight: 700; font-size: 18px; margin-right: 24px; }
.nav-menu { flex: 1; background: transparent; border-bottom: none; }
.nav-menu :deep(.el-menu-item) { color: #ccc; }
.nav-menu :deep(.el-menu-item.is-active) { color: #fff; background: #1890ff33; }
.main-area { padding: 0; height: calc(100% - 60px); }
</style>