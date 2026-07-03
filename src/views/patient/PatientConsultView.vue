<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useRoute } from 'vue-router'

import { createChatSession, sendChatMessage } from '@/api/aiChat'
import { getMyRegistrations } from '@/api/registrations'
import { useAuthStore } from '@/stores/auth'
import { unwrapResult } from '@/utils/result'

const route = useRoute()
const authStore = useAuthStore()

const isPreview = computed(() => Boolean(route.meta?.preview))
const patientId = computed(() => authStore.profile?.bizId)

const registrations = ref([])
const sessionInfo = ref(null)
const messages = ref([])
const loadingRegistrations = ref(false)
const creatingSession = ref(false)
const sendingMessage = ref(false)

const sessionForm = reactive({
  registrationId: '',
  sessionType: 'OUTPATIENT'
})

const messageForm = reactive({
  content: ''
})

async function loadRegistrations() {
  if (isPreview.value || !patientId.value) {
    return
  }

  loadingRegistrations.value = true

  try {
    const response = await getMyRegistrations({ pageNo: 1, pageSize: 50 })
    const pageData = unwrapResult(response, '加载挂号记录失败') || {}
    registrations.value = pageData.records || []
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '加载挂号记录失败')
  } finally {
    loadingRegistrations.value = false
  }
}

async function handleCreateSession() {
  if (!sessionForm.registrationId) {
    ElMessage.warning('请先选择挂号记录')
    return
  }

  creatingSession.value = true

  try {
    const response = await createChatSession({
      registrationId: Number(sessionForm.registrationId),
      sessionType: sessionForm.sessionType
    })

    sessionInfo.value = unwrapResult(response, '创建会话失败')
    messages.value = []
    ElMessage.success('AI 问诊会话已创建')
  } catch (error) {
    ElMessage.error(error.message || error.response?.data?.message || '创建会话失败')
  } finally {
    creatingSession.value = false
  }
}

async function handleSendMessage() {
  if (!sessionInfo.value?.sessionNo) {
    ElMessage.warning('请先创建会话')
    return
  }

  if (!messageForm.content) {
    ElMessage.warning('请输入消息内容')
    return
  }

  const content = messageForm.content
  sendingMessage.value = true
  messages.value.push({ role: 'user', content })

  try {
    const response = await sendChatMessage(sessionInfo.value.sessionNo, { content })
    messages.value.push({ role: 'assistant', content: unwrapResult(response, '发送消息失败') || '' })
    messageForm.content = ''
  } catch (error) {
    ElMessage.error(error.message || error.response?.data?.message || '发送消息失败')
  } finally {
    sendingMessage.value = false
  }
}

onMounted(loadRegistrations)
</script>

<template>
  <section class="content-grid">
    <article class="glass-card panel-card">
      <div class="status-chip">AI Consult</div>
      <h2 class="section-title">AI 问诊</h2>
      <p class="section-desc">当前页直接对应后端已实现的“创建会话”和“发送消息”接口。历史消息接口目前后端未提供，所以这里只保留当前会话过程。</p>

      <el-alert
        v-if="isPreview"
        title="预览模式不请求真实 AI 问诊接口"
        type="info"
        :closable="false"
        show-icon
        class="notice"
      />

      <el-alert
        v-else-if="!patientId"
        title="当前登录信息里没有 patient bizId，暂时无法创建 AI 问诊会话"
        type="warning"
        :closable="false"
        show-icon
        class="notice"
      />

      <template v-else>
        <div class="session-grid">
          <el-select
            v-model="sessionForm.registrationId"
            placeholder="选择挂号记录"
            clearable
            :loading="loadingRegistrations"
          >
            <el-option
              v-for="item in registrations"
              :key="item.id"
              :label="`${item.registrationNo || item.id} / ${item.status || '--'}`"
              :value="item.id"
            />
          </el-select>

          <el-input
            v-model="sessionForm.sessionType"
            placeholder="会话类型，例如 OUTPATIENT"
          />

          <el-button type="primary" round :loading="creatingSession" @click="handleCreateSession">
            创建会话
          </el-button>
        </div>

        <el-descriptions
          v-if="sessionInfo"
          :column="2"
          border
          class="detail-block"
        >
          <el-descriptions-item label="会话编号">{{ sessionInfo.sessionNo || '--' }}</el-descriptions-item>
          <el-descriptions-item label="会话状态">{{ sessionInfo.status || '--' }}</el-descriptions-item>
          <el-descriptions-item label="挂号 ID">{{ sessionInfo.registrationId || '--' }}</el-descriptions-item>
          <el-descriptions-item label="会话类型">{{ sessionInfo.sessionType || '--' }}</el-descriptions-item>
        </el-descriptions>

        <div class="chat-panel">
          <div class="messages-board">
            <el-empty v-if="!messages.length" description="创建会话后发送第一条消息" />
            <article
              v-for="(item, index) in messages"
              :key="`${item.role}-${index}`"
              class="message-card"
              :class="item.role"
            >
              <strong>{{ item.role === 'user' ? '患者' : 'AI' }}</strong>
              <p>{{ item.content }}</p>
            </article>
          </div>

          <div class="composer">
            <el-input
              v-model="messageForm.content"
              type="textarea"
              :rows="4"
              placeholder="请输入你想咨询的症状或问题"
            />
            <el-button type="primary" round :loading="sendingMessage" @click="handleSendMessage">
              发送消息
            </el-button>
          </div>
        </div>
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
.detail-block,
.chat-panel {
  margin-top: 20px;
}

.session-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr) auto;
  gap: 14px;
  margin-top: 20px;
}

.chat-panel {
  display: grid;
  gap: 16px;
}

.messages-board {
  display: grid;
  gap: 12px;
  min-height: 220px;
  padding: 18px;
  border-radius: 6px;
  background: rgba(247, 251, 252, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.46);
}

.message-card {
  padding: 14px 16px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.72);
}

.message-card.user {
  border-left: 3px solid var(--accent-sky);
}

.message-card.assistant {
  border-left: 3px solid var(--accent-cyan);
}

.message-card strong {
  display: block;
  margin-bottom: 8px;
}

.message-card p {
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.7;
  white-space: pre-wrap;
}

.composer {
  display: grid;
  gap: 12px;
}

@media (max-width: 980px) {
  .session-grid {
    grid-template-columns: 1fr;
  }
}
</style>
