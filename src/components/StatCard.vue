<template>
  <el-card class="stat-card" shadow="hover" @click="handleClick">
    <div class="card-content">
      <div class="icon-wrapper" :style="{ background: bgColor }">
        <el-icon :size="32" :color="iconColor">
          <component :is="icon" />
        </el-icon>
      </div>
      
      <div class="info">
        <div class="value">{{ value }}</div>
        <div class="label">{{ label }}</div>
      </div>
    </div>
  </el-card>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  icon: {
    type: Object,
    required: true
  },
  label: {
    type: String,
    required: true
  },
  value: {
    type: [String, Number],
    required: true
  },
  color: {
    type: String,
    default: 'primary'
  }
})

const emit = defineEmits(['click'])

const colorMap = {
  primary: { bg: '#e6f4ff', icon: '#0096C2' },
  warning: { bg: '#fff7e6', icon: '#E6A23C' },
  success: { bg: '#f0f9ff', icon: '#67C23A' },
  danger: { bg: '#fff1f0', icon: '#F56C6C' }
}

const bgColor = computed(() => colorMap[props.color]?.bg || colorMap.primary.bg)
const iconColor = computed(() => colorMap[props.color]?.icon || colorMap.primary.icon)

const handleClick = () => {
  emit('click')
}
</script>

<style scoped>
.stat-card {
  cursor: pointer;
}

.card-content {
  display: flex;
  align-items: center;
  gap: 20px;
}

.icon-wrapper {
  width: 64px;
  height: 64px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.info {
  flex: 1;
}

.value {
  font-size: 32px;
  font-weight: bold;
  color: #303133;
  line-height: 1;
  margin-bottom: 8px;
}

.label {
  font-size: 14px;
  color: #909399;
}
</style>

