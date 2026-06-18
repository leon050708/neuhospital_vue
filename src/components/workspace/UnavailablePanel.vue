<script setup>
defineProps({
  badge: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  reason: {
    type: String,
    required: true
  }
})
</script>

<template>
  <section class="content-grid">
    <article class="glass-card panel-card">
      <div class="status-chip">{{ badge }}</div>
      <h2 class="section-title">{{ title }}</h2>
      <p class="section-desc">{{ description }}</p>

      <el-alert
        :title="reason"
        type="info"
        :closable="false"
        show-icon
        class="notice"
      />

      <el-empty description="当前后端还没有提供这个页面所需的查询或提交接口" />
    </article>
  </section>
</template>

<style scoped>
.panel-card {
  padding: 26px;
  border-radius: var(--radius-lg);
}

.notice {
  margin: 20px 0 12px;
}
</style>
