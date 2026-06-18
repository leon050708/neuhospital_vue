<script setup>
import UnavailablePanel from '@/components/workspace/UnavailablePanel.vue'
</script>

<template>
  <UnavailablePanel
    badge="Orders"
    title="订单支付"
    description="这个页面需要挂号列表、订单列表、支付结果、退款状态等接口。"
    reason="当前 API 里还没有挂号结果查询、订单查询、取消挂号和支付查询接口，所以这里只保留真实空态。"
  />
</template>
