<script setup>
import DoctorCtAnalysisPanel from '@/components/doctor/DoctorCtAnalysisPanel.vue'
</script>

<template>
  <section class="content-grid">
    <article class="glass-card panel-card">
      <DoctorCtAnalysisPanel />
    </article>
  </section>
</template>

<style scoped>
.panel-card {
  padding: 26px;
  border-radius: var(--radius-lg);
}
</style>
