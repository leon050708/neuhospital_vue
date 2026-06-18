<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const managementLinks = computed(() => {
  const prefix = route.meta?.preview ? '/preview/management' : '/workspace/management'

  return [
    {
      title: '基础资料',
      desc: '科室管理、医生信息、排班维护和患者档案查询。',
      path: `${prefix}/departments`,
      action: '进入科室医生'
    },
    {
      title: '排班号源',
      desc: '维护医生出诊时间、号源数量、停诊状态和加号策略。',
      path: `${prefix}/schedules`,
      action: '查看排班号源'
    },
    {
      title: '患者与资产',
      desc: '患者挂号记录、异常订单、药品库存和文件资产可以继续拆到详细页。',
      path: `${prefix}/patients`,
      action: '查看患者挂号'
    }
  ]
})
</script>

<template>
  <section class="content-grid">
    <article class="glass-card feature-hero">
      <div>
        <div class="status-chip">Management Console</div>
        <h2 class="section-title">医院管理控制台</h2>
        <p class="section-desc">
          管理端按医院基础资料维护来组织，先覆盖科室、医生、排班、患者、药品库存和文件资产，
          后续再逐步补充更细的后台治理页面。
        </p>
      </div>
      <div class="hero-badge">ADMIN</div>
    </article>

    <div class="card-grid">
      <article v-for="item in managementLinks" :key="item.title" class="glass-card task-card">
        <h3>{{ item.title }}</h3>
        <p>{{ item.desc }}</p>
        <el-button text type="primary" @click="router.push(item.path)">
          {{ item.action }}
        </el-button>
      </article>
      <article class="glass-card task-card assets-card">
        <h3>资产文件</h3>
        <p>药品库存、文件记录、CT 资料目录和 MinIO 文件台账都可以从这里统一进入。</p>
        <el-button text type="primary" @click="router.push(`${route.meta?.preview ? '/preview/management' : '/workspace/management'}/assets`)">
          进入资产文件页
        </el-button>
      </article>
    </div>
  </section>
</template>

<style scoped>
.feature-hero,
.task-card {
  padding: 26px;
  border-radius: var(--radius-lg);
}

.feature-hero {
  display: flex;
  justify-content: space-between;
  gap: 20px;
}

.hero-badge {
  display: grid;
  width: 132px;
  place-items: center;
  border-radius: 4px;
  background: linear-gradient(135deg, #94b6c7 0%, #76c0be 100%);
  color: #fff;
  font-family: 'Barlow', sans-serif;
  font-weight: 800;
  letter-spacing: 0.12em;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
}

.task-card h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 800;
}

.task-card p {
  margin: 10px 0 0;
  color: var(--text-secondary);
  line-height: 1.7;
}

.task-card :deep(.el-button) {
  margin-top: 16px;
  padding-left: 0;
  font-weight: 700;
}

.assets-card {
  grid-column: 1 / -1;
}

@media (max-width: 980px) {
  .feature-hero,
  .card-grid {
    grid-template-columns: 1fr;
  }

  .feature-hero {
    flex-direction: column;
  }

  .hero-badge {
    width: 100%;
    height: 88px;
  }
}
</style>
