<script setup>
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useRoute } from 'vue-router'

import { createChatSession, sendChatMessage } from '@/api/aiChat'
import { getMyRegistrations } from '@/api/registrations'
import { useAuthStore } from '@/stores/auth'
import { unwrapResult } from '@/utils/result'

const QUICK_QUESTIONS = [
  '我第一次来怎么挂号？',
  '初诊要带什么材料？',
  '头疼应该挂什么科？',
  '做检查前要注意什么？'
]

const SCHEDULE_BLOCK_PATTERN = /```json\s*([\s\S]*?)```/gi

const route = useRoute()
const authStore = useAuthStore()

const isPreview = computed(() => Boolean(route.meta?.preview))
const patientId = computed(() => authStore.profile?.bizId)

const registrations = ref([])
const sessionInfo = ref(null)
const messages = ref([])
const latestKnowledgeAction = ref(null)
const loadingRegistrations = ref(false)
const creatingSession = ref(false)
const sendingMessage = ref(false)
const messagesBoardRef = ref(null)

const sessionForm = reactive({
  registrationId: ''
})

const messageForm = reactive({
  content: ''
})

const sessionStatusText = computed(() => {
  if (!sessionInfo.value?.sessionNo) {
    return creatingSession.value ? '建立中' : '待创建'
  }

  if (sendingMessage.value) {
    return '对话进行中'
  }

  return '已连接'
})

const assistantMessageCount = computed(() => {
  return messages.value.filter((item) => item.role === 'assistant').length
})

const hasConversation = computed(() => messages.value.length > 0)

function extractStructuredBlocks(content = '') {
  const blocks = []
  const cleanText = content.replace(SCHEDULE_BLOCK_PATTERN, (raw, jsonText) => {
    try {
      const parsed = JSON.parse(jsonText)
      blocks.push(parsed)
    } catch (error) {
      console.warn('[PatientConsultView] failed to parse JSON block:', error)
    }

    return ''
  }).trim()

  return {
    text: cleanText || content,
    blocks
  }
}

function normalizeScheduleOptions(blocks = []) {
  const matchedBlock = blocks.find((item) => item?.type === 'SCHEDULE_OPTIONS')
  if (!matchedBlock || !Array.isArray(matchedBlock.options)) {
    return []
  }

  return matchedBlock.options
    .filter((item) => item?.scheduleId !== undefined && item?.scheduleId !== null)
    .map((item) => ({
      scheduleId: item.scheduleId,
      doctorName: item.doctorName || '--',
      timeSlot: item.timeSlot || '--',
      remainQuota: item.remainQuota ?? '--'
    }))
}

function pushAssistantMessage(rawContent) {
  const { text, blocks } = extractStructuredBlocks(rawContent)
  const scheduleOptions = normalizeScheduleOptions(blocks)

  messages.value.push({
    role: 'assistant',
    content: text,
    rawContent,
    scheduleOptions
  })
}

async function scrollMessagesToBottom() {
  await nextTick()
  const board = messagesBoardRef.value
  if (!board) {
    return
  }

  board.scrollTop = board.scrollHeight
}

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

async function createSession({ silent = false } = {}) {
  if (isPreview.value || !patientId.value || creatingSession.value) {
    return
  }

  creatingSession.value = true

  try {
    const response = await createChatSession({
      registrationId: sessionForm.registrationId ? Number(sessionForm.registrationId) : undefined,
      sessionType: 'PATIENT_AGENT'
    })

    sessionInfo.value = unwrapResult(response, '创建会话失败')
    messages.value = []
    latestKnowledgeAction.value = null

    if (!silent) {
      ElMessage.success('AI 助诊会话已创建')
    }
  } catch (error) {
    ElMessage.error(error.message || error.response?.data?.message || '创建会话失败')
  } finally {
    creatingSession.value = false
  }
}

async function sendMessage(content) {
  if (!sessionInfo.value?.sessionNo) {
    await createSession({ silent: true })
  }

  if (!sessionInfo.value?.sessionNo) {
    return
  }

  sendingMessage.value = true
  messages.value.push({ role: 'user', content })
  await scrollMessagesToBottom()

  try {
    const response = await sendChatMessage(sessionInfo.value.sessionNo, { content })
    const assistantReply = unwrapResult(response, '发送消息失败') || ''
    console.log('[AI Chat] backend response:', response)
    console.log('[AI Chat] assistant reply:', assistantReply)
    pushAssistantMessage(assistantReply)
    messageForm.content = ''
    await scrollMessagesToBottom()
  } catch (error) {
    ElMessage.error(error.message || error.response?.data?.message || '发送消息失败')
  } finally {
    sendingMessage.value = false
  }
}

async function handleSendMessage() {
  const content = messageForm.content.trim()

  if (!content) {
    ElMessage.warning('请输入消息内容')
    return
  }

  await sendMessage(content)
}

async function handleQuickQuestion(question) {
  messageForm.content = question
  await sendMessage(question)
}

async function handleCreateSession() {
  await createSession()
}

async function handleScheduleSelect(option) {
  latestKnowledgeAction.value = option.scheduleId
  await sendMessage(`我要预约排班ID为${option.scheduleId}的号`)
}

function formatRegistrationLabel(item) {
  const doctorName = item.doctorName || item.doctor?.doctorName || '未分配医生'
  const departmentName = item.departmentName || item.department?.departmentName || '未分配科室'
  return `${item.registrationNo || item.id} / ${departmentName} / ${doctorName}`
}

onMounted(async () => {
  await loadRegistrations()

  if (!isPreview.value && patientId.value) {
    await createSession({ silent: true })
  }
})
</script>

<template>
  <section class="content-grid">
    <article class="consult-shell glass-card">
      <el-alert
        v-if="isPreview"
        title="预览模式不请求真实 AI 助诊接口"
        type="info"
        :closable="false"
        show-icon
        class="notice"
      />

      <el-alert
        v-else-if="!patientId"
        title="当前登录信息里没有 patient bizId，暂时无法创建 AI 助诊会话"
        type="warning"
        :closable="false"
        show-icon
        class="notice"
      />

      <template v-else>
        <div class="chat-stage">
          <div class="quick-strip">
            <button
              v-for="question in QUICK_QUESTIONS"
              :key="question"
              type="button"
              class="quick-action"
              :disabled="sendingMessage || creatingSession"
              @click="handleQuickQuestion(question)"
            >
              {{ question }}
            </button>
          </div>

          <div class="chat-stage-main">
            <div ref="messagesBoardRef" class="messages-board">
              <div v-if="!hasConversation" class="empty-state">
                <div class="empty-plate">
                  <span class="empty-kicker">Patient-side assistant</span>
                  <h3>从一个问题开始</h3>
                  <p>比如先问挂号流程、需要带的材料，或者直接描述症状，AI 会继续帮你拆解到科室和排班建议。</p>
                </div>
              </div>

              <article
                v-for="(item, index) in messages"
                :key="`${item.role}-${index}`"
                class="message-row"
                :class="item.role"
              >
                <div class="avatar-badge">{{ item.role === 'user' ? 'P' : 'AI' }}</div>

                <div class="message-bubble" :class="item.role">
                  <div class="message-head">
                    <strong>{{ item.role === 'user' ? '患者提问' : 'AI 助诊建议' }}</strong>
                    <span v-if="item.role === 'assistant' && item.scheduleOptions?.length" class="message-tag">排班推荐</span>
                  </div>

                  <p>{{ item.content }}</p>

                  <div v-if="item.role === 'assistant' && item.scheduleOptions?.length" class="schedule-card-grid">
                    <button
                      v-for="option in item.scheduleOptions"
                      :key="option.scheduleId"
                      type="button"
                      class="schedule-card"
                      :disabled="sendingMessage"
                      @click="handleScheduleSelect(option)"
                    >
                      <div class="schedule-card-top">
                        <span class="schedule-title">{{ option.doctorName }}</span>
                        <span class="schedule-slot">{{ option.timeSlot }}</span>
                      </div>
                      <span class="schedule-meta">剩余号源 {{ option.remainQuota }}</span>
                      <span class="schedule-action">
                        {{ latestKnowledgeAction === option.scheduleId && sendingMessage ? '提交中...' : '选择这个排班' }}
                      </span>
                    </button>
                  </div>
                </div>
              </article>
            </div>

            <div class="composer-shell">
              <div class="composer-head">
                <strong>输入你的问题</strong>
                <span>{{ sendingMessage ? 'AI 正在整理回复...' : (sessionStatusText === '待创建' ? '正在准备会话...' : `已回复 ${assistantMessageCount} 次`) }}</span>
              </div>

              <div class="composer">
                <el-input
                  v-model="messageForm.content"
                  type="textarea"
                  :rows="4"
                  resize="none"
                  placeholder="例如：最近总是胸闷头晕，应该先挂什么科？"
                  @keyup.enter.ctrl="handleSendMessage"
                />

                <div class="composer-actions">
                  <el-select
                    v-model="sessionForm.registrationId"
                    placeholder="可选：绑定某次挂号记录"
                    clearable
                    filterable
                    :loading="loadingRegistrations"
                    class="composer-select"
                  >
                    <el-option
                      v-for="item in registrations"
                      :key="item.id"
                      :label="formatRegistrationLabel(item)"
                      :value="item.id"
                    />
                  </el-select>
                  <span>按 `Ctrl + Enter` 发送</span>
                  <div class="composer-buttons">
                    <el-button round :loading="creatingSession" @click="handleCreateSession">
                      {{ sessionInfo?.sessionNo ? '重建会话' : '创建会话' }}
                    </el-button>
                    <el-button type="primary" round :loading="sendingMessage" @click="handleSendMessage">
                      发送消息
                    </el-button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </article>
  </section>
</template>

<style scoped>
.consult-shell {
  padding: 20px;
  border-radius: 10px;
}

.empty-kicker {
  display: inline-block;
  font-family: 'Barlow', sans-serif;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.notice,
.chat-stage {
  margin-top: 12px;
}

.chat-stage {
  display: grid;
  gap: 12px;
}

.quick-action {
  display: grid;
  width: 100%;
  padding: 12px 16px;
  border: 1px solid rgba(114, 163, 183, 0.16);
  border-radius: 6px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(240, 247, 248, 0.92));
  color: var(--text-primary);
  text-align: left;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.quick-action:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: rgba(92, 163, 174, 0.3);
  box-shadow: 0 14px 26px rgba(78, 122, 141, 0.12);
}

.quick-action:disabled {
  cursor: wait;
  opacity: 0.66;
}

.quick-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.chat-stage-main {
  display: grid;
  gap: 12px;
}

.messages-board {
  min-height: 760px;
  max-height: calc(100vh - 170px);
  overflow-y: auto;
  padding: 22px;
  border-radius: 8px;
  background:
    linear-gradient(180deg, rgba(252, 254, 255, 0.96), rgba(241, 247, 249, 0.94));
  border: 1px solid rgba(114, 159, 179, 0.14);
  box-shadow: var(--shadow-card);
}

.empty-state {
  min-height: 500px;
  display: grid;
  place-items: center;
}

.empty-plate {
  max-width: 460px;
  padding: 34px 30px;
  border-radius: 8px;
  text-align: center;
  background:
    radial-gradient(circle at top, rgba(120, 193, 229, 0.18), transparent 40%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(242, 248, 249, 0.92));
  border: 1px solid rgba(115, 166, 186, 0.14);
}

.empty-plate h3 {
  margin: 12px 0 10px;
  font-size: 28px;
  line-height: 1.1;
}

.empty-plate p {
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.8;
}

.message-row {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  gap: 14px;
}

.message-row + .message-row {
  margin-top: 18px;
}

.message-row.user {
  grid-template-columns: minmax(0, 1fr) 42px;
}

.message-row.user .avatar-badge {
  order: 2;
  background: linear-gradient(135deg, #6faed6, #5a7fd1);
}

.message-row.user .message-bubble {
  order: 1;
  margin-left: auto;
  background: linear-gradient(135deg, rgba(227, 241, 251, 0.98), rgba(213, 232, 249, 0.94));
  border-color: rgba(100, 151, 193, 0.16);
}

.avatar-badge {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 14px;
  background: linear-gradient(135deg, #6fc8b8, #4f9185);
  color: white;
  font-family: 'Barlow', sans-serif;
  font-weight: 800;
  letter-spacing: 0.04em;
  box-shadow: 0 12px 22px rgba(87, 131, 148, 0.18);
}

.message-bubble {
  display: grid;
  gap: 12px;
  max-width: min(760px, 100%);
  padding: 18px 18px 16px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(116, 159, 176, 0.12);
}

.message-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.message-tag {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(111, 200, 184, 0.16);
  color: #2f7b73;
  font-size: 12px;
  font-weight: 700;
}

.message-bubble p {
  margin: 0;
  color: var(--text-primary);
  line-height: 1.7;
  white-space: pre-wrap;
}

.schedule-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.schedule-card {
  display: grid;
  gap: 10px;
  padding: 18px;
  border: 1px solid rgba(64, 136, 132, 0.14);
  border-radius: 8px;
  background:
    radial-gradient(circle at top right, rgba(118, 191, 230, 0.14), transparent 36%),
    linear-gradient(180deg, rgba(247, 253, 252, 0.98), rgba(235, 247, 246, 0.94));
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.schedule-card:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 10px 24px rgba(29, 78, 82, 0.1);
}

.schedule-card:disabled {
  cursor: wait;
  opacity: 0.72;
}

.schedule-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.schedule-title {
  font-size: 16px;
  font-weight: 800;
  color: var(--text-primary);
}

.schedule-slot,
.schedule-meta {
  color: var(--text-secondary);
}

.schedule-action {
  color: var(--accent-cyan);
  font-weight: 700;
}

.composer-shell {
  display: grid;
  gap: 12px;
}

.composer-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.composer-head span,
.composer-actions {
  color: var(--text-secondary);
  font-size: 13px;
}

.composer {
  display: grid;
  gap: 12px;
}

.composer-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.composer-select {
  width: min(340px, 100%);
}

.composer-buttons {
  display: flex;
  align-items: center;
  gap: 10px;
}

@media (max-width: 900px) {
  .consult-shell {
    padding: 18px;
  }

  .quick-strip {
    grid-template-columns: 1fr;
  }

  .messages-board {
    min-height: 420px;
    max-height: none;
  }

  .message-row,
  .message-row.user {
    grid-template-columns: 36px minmax(0, 1fr);
  }

  .message-row.user .avatar-badge,
  .message-row.user .message-bubble {
    order: initial;
  }

  .composer-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .composer-buttons {
    width: 100%;
    flex-direction: column;
  }

  .composer-select {
    width: 100%;
  }

  .composer-head {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
