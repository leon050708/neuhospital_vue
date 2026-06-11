<template>
  <section class="content-grid">
    <article class="glass-card feature-hero">
      <div>
        <div class="status-chip">Management Console</div>
        <h2 class="section-title">管理端骨架</h2>
        <p class="section-desc">
          这里适合继续接用户管理、角色权限、菜单配置、字典、日志审计和系统治理能力。
        </p>
      </div>
      <div class="hero-badge">ADMIN</div>
    </article>

    <div class="card-grid">
      <article class="glass-card task-card">
        <h3>菜单策略</h3>
        <p>后续可以直接对接 `sys_menu.route_path` 和 `component_path` 实现动态菜单。</p>
      </article>
      <article class="glass-card task-card">
        <h3>系统治理</h3>
        <p>建议优先接角色权限、操作日志、字典和系统配置。</p>
      </article>
      <article class="glass-card task-card">
        <h3>权限模型</h3>
        <p>当前页面仅允许 `userType = MANAGEMENT` 访问。</p>
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
