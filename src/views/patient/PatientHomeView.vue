<template>
  <section class="content-grid">
    <article class="glass-card feature-hero">
      <div>
        <div class="status-chip">Patient Portal</div>
        <h2 class="section-title">患者端骨架</h2>
        <p class="section-desc">
          这里适合继续接挂号、智能导诊、AI 问诊、检查结果、费用和个人档案。
        </p>
      </div>
      <div class="hero-badge">PATIENT</div>
    </article>

    <div class="card-grid">
      <article class="glass-card task-card">
        <h3>优先接入</h3>
        <p>登录后首页、挂号列表、AI 问诊会话、我的检查报告。</p>
      </article>
      <article class="glass-card task-card">
        <h3>流式能力</h3>
        <p>已预留 `SSE` 工具，可直接接 `/api/ai/chat/sessions/{id}/stream`。</p>
      </article>
      <article class="glass-card task-card">
        <h3>鉴权模型</h3>
        <p>当前页面仅允许 `userType = PATIENT` 访问。</p>
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
  background: linear-gradient(135deg, #78c6b7 0%, #8bd7ca 100%);
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
