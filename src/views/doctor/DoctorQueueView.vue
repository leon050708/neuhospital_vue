<script setup>
import UnavailablePanel from '@/components/workspace/UnavailablePanel.vue'
</script>

<template>
  <UnavailablePanel
    badge="Doctor Queue"
    title="候诊队列"
    description="候诊队列需要叫号、排队、签到、接诊状态流转等接口配合。"
    reason="API 文档里当前没有候诊队列查询接口，只有状态值说明，所以这里保留真实空态。"
  />
</template>
