<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useRoute } from 'vue-router'

import { getDrugPage } from '@/api/drugs'

const route = useRoute()

const isPreview = computed(() => Boolean(route.meta?.preview))
const loading = ref(false)
const drugs = ref([])
const total = ref(0)

const query = reactive({
  pageNo: 1,
  pageSize: 10,
  keyword: '',
  category: ''
})

async function loadDrugs() {
  if (isPreview.value) {
    return
  }

  loading.value = true

  try {
    const response = await getDrugPage({
      pageNo: query.pageNo,
      pageSize: query.pageSize,
      keyword: query.keyword || undefined,
      category: query.category || undefined
    })

    const pageData = response.data || {}
    drugs.value = pageData.records || []
    total.value = pageData.total || 0
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '加载药品目录失败')
  } finally {
    loading.value = false
  }
}

onMounted(loadDrugs)
</script>

<template>
  <section class="content-grid">
    <article class="glass-card panel-card">
      <div class="status-chip">Orders & Drugs</div>
      <h2 class="section-title">检查处方</h2>
      <p class="section-desc">
        当前 API 里还没有检查申请和处方开立接口，所以这里只展示真实药品分页接口作为处方相关数据入口。
      </p>

      <el-alert
        v-if="isPreview"
        title="预览模式不请求真实药品接口"
        type="info"
        :closable="false"
        show-icon
        class="notice"
      />

      <template v-else>
        <div class="filter-grid">
          <el-input v-model="query.keyword" placeholder="按药品名搜索" clearable @keyup.enter="loadDrugs" />
          <el-input v-model="query.category" placeholder="按分类搜索" clearable @keyup.enter="loadDrugs" />
          <el-button round @click="loadDrugs">查询</el-button>
        </div>

        <el-table
          :data="drugs"
          v-loading="loading"
          class="table-block"
          empty-text="没有查询到药品数据"
        >
          <el-table-column prop="drugCode" label="药品编码" min-width="150" />
          <el-table-column prop="drugName" label="药品名称" min-width="180" />
          <el-table-column prop="category" label="分类" min-width="120" />
          <el-table-column prop="specification" label="规格" min-width="160" />
          <el-table-column prop="salePrice" label="售价" min-width="100" />
          <el-table-column prop="stockQuantity" label="库存" min-width="100" />
          <el-table-column prop="status" label="状态" min-width="100" />
        </el-table>

        <div class="list-footer">当前共 {{ total }} 条药品记录</div>
      </template>
    </article>
  </section>
</template>

<style scoped>
.panel-card {
  padding: 26px;
  border-radius: var(--radius-lg);
}

.notice,
.table-block,
.list-footer {
  margin-top: 20px;
}

.filter-grid {
  display: flex;
  gap: 14px;
  margin-top: 20px;
}

.list-footer {
  color: var(--text-secondary);
}

@media (max-width: 980px) {
  .filter-grid {
    flex-direction: column;
  }
}
</style>
