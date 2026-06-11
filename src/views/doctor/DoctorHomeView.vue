<template>
  <section class="content-grid">
    <article class="glass-card feature-hero">
      <div>
        <div class="status-chip">Doctor Workspace</div>
        <h2 class="section-title">医生端骨架</h2>
        <p class="section-desc">
          这里适合继续接待诊列表、病历编辑、AI 病历摘要、影像分析结果和辅助诊断建议。
        </p>
      </div>
      <div class="hero-badge">DOCTOR</div>
    </article>

    <div class="card-grid">
      <article class="glass-card task-card">
        <h3>优先接入</h3>
        <p>待诊队列、门诊病历、AI 摘要、影像上传与结果查看。</p>
      </article>
      <article class="glass-card task-card">
        <h3>接口范围</h3>
        <p>后续可衔接 `outpatient`、`inspection`、`image`、`ai` 等业务模块。</p>
      </article>
      <article class="glass-card task-card">
        <h3>权限控制</h3>
        <p>当前页面仅允许 `userType = DOCTOR` 访问，后续可细分角色权限。</p>
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
  background: linear-gradient(135deg, #7db6dc 0%, #87d0e5 100%);
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
