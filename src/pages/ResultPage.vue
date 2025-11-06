<template>
  <div class="page-container">
    <el-page-header title="返回" content="排课结果" />
    
    <el-card shadow="never" class="toolbar-card">
      <div class="toolbar">
        <el-select v-model="yearFilter" placeholder="学年筛选" @change="loadData" clearable style="width: 150px">
          <el-option label="2025-2026" value="2025-2026" />
          <el-option label="2024-2025" value="2024-2025" />
        </el-select>
        
        <el-select v-model="semesterFilter" placeholder="学期筛选" @change="loadData" clearable style="width: 150px">
          <el-option label="第一学期" value="第一学期" />
          <el-option label="第二学期" value="第二学期" />
        </el-select>
        
        <el-button :icon="Refresh" @click="loadData" :loading="loading">刷新</el-button>
      </div>
    </el-card>
    
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>排课结果列表</span>
          <el-tag v-if="!loading">共 {{ tableData.length }} 条</el-tag>
        </div>
      </template>
      
      <el-table 
        :data="tableData" 
        :loading="loading"
        stripe
        border
      >
        <el-table-column prop="course_name" label="课程名称" min-width="150" />
        <el-table-column prop="teacher_name" label="教师姓名" width="100" />
        <el-table-column label="实验室" width="150">
          <template #default="{ row }">
            {{ formatLab(row) }}
          </template>
        </el-table-column>
        <el-table-column label="容量" width="80" align="center">
          <template #default="{ row }">
            <el-tag size="small">{{ row.student_count }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="时间段" min-width="200">
          <template #default="{ row }">
            {{ formatTimeSlot(row) }}
          </template>
        </el-table-column>
        <el-table-column label="学期" width="150">
          <template #default="{ row }">
            {{ row.academic_year }} {{ row.semester }}
          </template>
        </el-table-column>
        <el-table-column label="排课时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.create_time, 'YYYY-MM-DD HH:mm') }}
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { getScheduleList } from '../utils/api'
import { formatTime, formatTimeSlot, formatWeekday } from '../utils/format'

const loading = ref(false)
const yearFilter = ref('2025-2026')
const semesterFilter = ref('第一学期')
const tableData = ref([])

const formatLab = (row) => {
  return `${row.building || ''} ${row.lab_room || ''}`
}

const loadData = async () => {
  loading.value = true
  
  try {
    const params = {}
    if (yearFilter.value) {
      params.academicYear = yearFilter.value
    }
    if (semesterFilter.value) {
      params.semester = semesterFilter.value
    }
    
    const res = await getScheduleList(params)
    tableData.value = res.data
  } catch (error) {
    console.error('加载排课结果失败:', error)
    ElMessage.error('加载失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.page-container {
  padding: 20px;
}

.el-page-header {
  margin-bottom: 20px;
}

.toolbar-card {
  margin-bottom: 20px;
}

.toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: bold;
}
</style>

