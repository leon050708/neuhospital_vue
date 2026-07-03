<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useRoute } from 'vue-router'

import { getDrugPage } from '@/api/drugs'
import { getFileList } from '@/api/files'
import { unwrapResult } from '@/utils/result'

const route = useRoute()
const isPreview = computed(() => Boolean(route.meta?.preview))
const drugLoading = ref(false)
const fileLoading = ref(false)
const drugs = ref([])
const files = ref([])
const drugTotal = ref(0)
const fileTotal = ref(0)

const drugQuery = reactive({
  pageNo: 1,
  pageSize: 6,
  keyword: '',
  category: ''
})

const fileQuery = reactive({
  pageNo: 1,
  pageSize: 6,
  bizType: '',
  keyword: ''
})

function normalizeFileRecord(record) {
  return {
    id: record.id,
    originalName: record.originalName || record.fileName || '--',
    bizType: record.bizType || '--',
    contentType: record.contentType || '--',
    uploadedAt: record.uploadedAt || record.createdAt || '--'
  }
}

async function loadDrugs() {
  if (isPreview.value) {
    return
  }

  drugLoading.value = true

  try {
    const response = await getDrugPage({
      pageNo: drugQuery.pageNo,
      pageSize: drugQuery.pageSize,
      keyword: drugQuery.keyword || undefined,
      category: drugQuery.category || undefined
    })

    const pageData = unwrapResult(response, '加载药品数据失败') || {}
    drugs.value = pageData.records || []
    drugTotal.value = pageData.total || 0
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '加载药品数据失败')
  } finally {
    drugLoading.value = false
  }
}

async function loadFiles() {
  if (isPreview.value) {
    return
  }

  fileLoading.value = true

  try {
    const response = await getFileList({
      pageNo: fileQuery.pageNo,
      pageSize: fileQuery.pageSize,
      bizType: fileQuery.bizType || undefined,
      keyword: fileQuery.keyword || undefined
    })

    const pageData = unwrapResult(response, '加载文件记录失败') || {}
    files.value = (pageData.records || []).map(normalizeFileRecord)
    fileTotal.value = pageData.total || 0
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '加载文件记录失败')
  } finally {
    fileLoading.value = false
  }
}

onMounted(async () => {
  await loadDrugs()
  await loadFiles()
})
</script>

<template>
  <section class="content-grid">
    <article class="glass-card panel-card">
      <div class="status-chip">Assets & Files</div>
      <h2 class="section-title">资产文件管理</h2>
      <p class="section-desc">当前页只使用真实药品分页和文件分页接口。</p>

      <el-alert
        v-if="isPreview"
        title="预览模式不请求真实药品与文件接口"
        type="info"
        :closable="false"
        show-icon
        class="notice"
      />

      <div v-else class="split-grid">
        <div>
          <div class="toolbar">
            <h3 class="sub-title">药品库存</h3>
            <div class="toolbar-inputs">
              <el-input v-model="drugQuery.keyword" placeholder="药品名" clearable @keyup.enter="loadDrugs" />
              <el-input v-model="drugQuery.category" placeholder="分类" clearable @keyup.enter="loadDrugs" />
              <el-button round @click="loadDrugs">查询</el-button>
            </div>
          </div>

          <el-table
            :data="drugs"
            v-loading="drugLoading"
            class="table-block"
            empty-text="没有查询到药品数据"
          >
            <el-table-column prop="drugName" label="药品名称" min-width="170" />
            <el-table-column prop="category" label="分类" min-width="120" />
            <el-table-column prop="salePrice" label="售价" min-width="100" />
            <el-table-column prop="stockQuantity" label="库存" min-width="100" />
            <el-table-column prop="warningQuantity" label="预警值" min-width="100" />
          </el-table>

          <div class="list-footer">当前共 {{ drugTotal }} 条药品记录</div>
        </div>

        <div>
          <div class="toolbar">
            <h3 class="sub-title">文件记录</h3>
            <div class="toolbar-inputs">
              <el-input v-model="fileQuery.bizType" placeholder="业务类型，如 CT" clearable @keyup.enter="loadFiles" />
              <el-input v-model="fileQuery.keyword" placeholder="文件名关键字" clearable @keyup.enter="loadFiles" />
              <el-button round @click="loadFiles">查询</el-button>
            </div>
          </div>

          <el-table
            :data="files"
            v-loading="fileLoading"
            class="table-block"
            empty-text="没有查询到文件记录"
          >
            <el-table-column prop="id" label="文件 ID" min-width="100" />
            <el-table-column prop="originalName" label="文件名" min-width="180" show-overflow-tooltip />
            <el-table-column prop="bizType" label="业务类型" min-width="100" />
            <el-table-column prop="contentType" label="内容类型" min-width="150" show-overflow-tooltip />
            <el-table-column prop="uploadedAt" label="上传时间" min-width="160" />
          </el-table>

          <div class="list-footer">当前共 {{ fileTotal }} 条文件记录</div>
        </div>
      </div>
    </article>
  </section>
</template>

<style scoped>
.panel-card {
  padding: 26px;
  border-radius: var(--radius-lg);
}

.split-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.notice {
  margin-top: 20px;
}

.sub-title {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
}

.toolbar {
  display: grid;
  gap: 14px;
}

.toolbar-inputs {
  display: flex;
  gap: 12px;
}

.table-block,
.list-footer {
  margin-top: 14px;
}

.list-footer {
  color: var(--text-secondary);
}

@media (max-width: 1100px) {
  .split-grid {
    grid-template-columns: 1fr;
  }

  .toolbar-inputs {
    flex-direction: column;
  }
}
</style>
