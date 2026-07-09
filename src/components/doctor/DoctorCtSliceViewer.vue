<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'

import {
  extractAxialSlice,
  extractCoronalSlice,
  extractSagittalSlice,
  parseNrrdArrayBuffer,
  windowToUint8
} from '@/lib/ct/nrrdVolume'

const props = defineProps({
  sourceUrl: {
    type: String,
    default: ''
  },
  sourceFile: {
    type: Object,
    default: null
  },
  fileName: {
    type: String,
    default: ''
  },
  forceNrrd: {
    type: Boolean,
    default: false
  }
})

const loading = ref(false)
const volume = ref(null)
const statusText = ref('等待加载 CT 体数据')

const axialCanvas = ref(null)
const coronalCanvas = ref(null)
const sagittalCanvas = ref(null)

const viewerState = reactive({
  axial: 0,
  coronal: 0,
  sagittal: 0,
  windowCenter: 50,
  windowWidth: 350
})

const dimensions = computed(() => volume.value?.dimensions || [0, 0, 0])
const hasVolume = computed(() => Boolean(volume.value))
const activeFileName = computed(() => props.fileName || props.sourceFile?.name || props.sourceUrl || '')
const canLoadAsNrrd = computed(() => props.forceNrrd || /\.nrrd$/i.test(activeFileName.value))

const axialMax = computed(() => Math.max((dimensions.value[2] || 1) - 1, 0))
const coronalMax = computed(() => Math.max((dimensions.value[1] || 1) - 1, 0))
const sagittalMax = computed(() => Math.max((dimensions.value[0] || 1) - 1, 0))

const rangeText = computed(() => {
  if (!volume.value) {
    return '--'
  }
  return `${volume.value.min} ~ ${volume.value.max}`
})

function resetViewState() {
  viewerState.axial = Math.floor(axialMax.value / 2)
  viewerState.coronal = Math.floor(coronalMax.value / 2)
  viewerState.sagittal = Math.floor(sagittalMax.value / 2)

  if (volume.value) {
    viewerState.windowCenter = Math.round((volume.value.min + volume.value.max) / 2)
    viewerState.windowWidth = Math.max(Math.round(volume.value.max - volume.value.min), 1)
  }
}

function drawSlice(canvas, slice) {
  if (!canvas || !slice) {
    return
  }

  const width = slice.width
  const height = slice.height
  const pixels = windowToUint8(slice.data, viewerState.windowCenter, viewerState.windowWidth)
  const imageData = new ImageData(width, height)

  for (let index = 0; index < pixels.length; index += 1) {
    const value = pixels[index]
    const offset = index * 4
    imageData.data[offset] = value
    imageData.data[offset + 1] = value
    imageData.data[offset + 2] = value
    imageData.data[offset + 3] = 255
  }

  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.putImageData(imageData, 0, 0)
}

function renderSlices() {
  if (!volume.value) {
    return
  }

  drawSlice(axialCanvas.value, extractAxialSlice(volume.value, viewerState.axial))
  drawSlice(coronalCanvas.value, extractCoronalSlice(volume.value, viewerState.coronal))
  drawSlice(sagittalCanvas.value, extractSagittalSlice(volume.value, viewerState.sagittal))
}

async function loadVolume() {
  if (!props.sourceUrl && !props.sourceFile) {
    volume.value = null
    statusText.value = '等待加载 CT 体数据'
    return
  }

  if (!canLoadAsNrrd.value) {
    volume.value = null
    statusText.value = '当前文件不是 NRRD，无法进入三视图模式'
    return
  }

  loading.value = true
  statusText.value = '正在加载 CT 体数据'

  try {
    let arrayBuffer

    if (props.sourceFile) {
      arrayBuffer = await props.sourceFile.arrayBuffer()
    } else {
      const response = await fetch(props.sourceUrl)
      if (!response.ok) {
        throw new Error(`体数据加载失败: ${response.status}`)
      }
      arrayBuffer = await response.arrayBuffer()
    }

    volume.value = await parseNrrdArrayBuffer(arrayBuffer)
    resetViewState()
    statusText.value = `已加载 ${activeFileName.value || 'CT 体数据'}`
    await nextTick()
    renderSlices()
  } catch (error) {
    volume.value = null
    statusText.value = error.message || 'CT 体数据加载失败'
    ElMessage.warning(statusText.value)
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.sourceUrl, props.sourceFile, props.fileName],
  () => {
    loadVolume()
  },
  { immediate: true }
)

watch(
  () => [viewerState.axial, viewerState.coronal, viewerState.sagittal, viewerState.windowCenter, viewerState.windowWidth],
  () => {
    renderSlices()
  }
)

onMounted(() => {
  renderSlices()
})
</script>

<template>
  <section class="slice-viewer">
    <div class="viewer-head">
      <div>
        <strong>CT 三视图</strong>
        <p>{{ statusText }}</p>
      </div>
      <div class="viewer-meta" v-if="hasVolume">
        <span>尺寸 {{ dimensions.join(' x ') }}</span>
        <span>数值范围 {{ rangeText }}</span>
      </div>
    </div>

    <el-empty v-if="!canLoadAsNrrd && !loading" description="当前预览地址不是 NRRD 体数据，暂时仍按普通文件预览" />

    <template v-else>
      <el-skeleton v-if="loading" :rows="10" animated />

      <template v-else-if="hasVolume">
        <div class="viewer-controls">
          <div class="control-block">
            <span>窗位</span>
            <el-slider v-model="viewerState.windowCenter" :min="Math.floor(volume.min)" :max="Math.ceil(volume.max)" />
          </div>
          <div class="control-block">
            <span>窗宽</span>
            <el-slider v-model="viewerState.windowWidth" :min="1" :max="Math.max(Math.ceil(volume.max - volume.min), 1)" />
          </div>
        </div>

        <div class="canvas-grid">
          <article class="slice-card">
            <div class="slice-head">
              <strong>轴位</strong>
              <span>{{ viewerState.axial }} / {{ axialMax }}</span>
            </div>
            <canvas ref="axialCanvas" class="slice-canvas"></canvas>
            <el-slider v-model="viewerState.axial" :min="0" :max="axialMax" :step="1" />
          </article>

          <article class="slice-card">
            <div class="slice-head">
              <strong>冠状位</strong>
              <span>{{ viewerState.coronal }} / {{ coronalMax }}</span>
            </div>
            <canvas ref="coronalCanvas" class="slice-canvas"></canvas>
            <el-slider v-model="viewerState.coronal" :min="0" :max="coronalMax" :step="1" />
          </article>

          <article class="slice-card">
            <div class="slice-head">
              <strong>矢状位</strong>
              <span>{{ viewerState.sagittal }} / {{ sagittalMax }}</span>
            </div>
            <canvas ref="sagittalCanvas" class="slice-canvas"></canvas>
            <el-slider v-model="viewerState.sagittal" :min="0" :max="sagittalMax" :step="1" />
          </article>
        </div>
      </template>
    </template>
  </section>
</template>

<style scoped>
.slice-viewer {
  display: grid;
  gap: 18px;
}

.viewer-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.viewer-head p {
  margin: 8px 0 0;
  color: var(--text-secondary);
}

.viewer-meta {
  display: grid;
  gap: 6px;
  color: var(--text-secondary);
  font-size: 13px;
  text-align: right;
}

.viewer-controls {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.control-block {
  padding: 14px 16px;
  border-radius: 14px;
  background: rgba(246, 250, 252, 0.92);
  border: 1px solid rgba(113, 156, 176, 0.12);
}

.control-block span {
  display: block;
  margin-bottom: 10px;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 700;
}

.canvas-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.slice-card {
  padding: 14px;
  border-radius: 16px;
  background: rgba(246, 250, 252, 0.92);
  border: 1px solid rgba(113, 156, 176, 0.12);
}

.slice-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.slice-canvas {
  width: 100%;
  aspect-ratio: 1 / 1;
  background: #0b1016;
  border-radius: 12px;
  border: 1px solid rgba(113, 156, 176, 0.16);
  image-rendering: pixelated;
}

@media (max-width: 1180px) {
  .canvas-grid,
  .viewer-controls {
    grid-template-columns: 1fr;
  }
}
</style>
