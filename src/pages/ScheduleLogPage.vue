<template>
  <div class="page-container">
    <el-page-header title="返回" content="排课日志" />
    
    <el-card shadow="never" class="toolbar-card">
      <div class="toolbar">
        <el-select v-model="actionTypeFilter" placeholder="操作类型" @change="loadData" clearable style="width: 150px">
          <el-option label="全部" :value="null" />
          <el-option label="自动排课" value="auto_schedule" />
          <el-option label="手动排课" value="manual_schedule" />
        </el-select>
        
        <el-select v-model="actionResultFilter" placeholder="操作结果" @change="loadData" clearable style="width: 150px">
          <el-option label="全部" :value="null" />
          <el-option label="成功" value="success" />
          <el-option label="失败" value="failure" />
        </el-select>
        
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          @change="loadData"
          style="width: 240px"
        />
        
        <div style="flex: 1;"></div>
        
        <el-button :icon="Refresh" @click="loadData" :loading="loading">刷新</el-button>
      </div>
    </el-card>
    
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>排课操作日志</span>
          <el-tag v-if="!loading">共 {{ total }} 条</el-tag>
        </div>
      </template>
      
      <el-table 
        :data="tableData" 
        :loading="loading"
        stripe
        border
      >
        <el-table-column label="操作时间" width="180" align="center">
          <template #default="{ row }">
            {{ formatTime(row.create_time) }}
          </template>
        </el-table-column>
        <el-table-column label="申请编号" width="140" align="center">
          <template #default="{ row }">{{ row.booking_no }}</template>
        </el-table-column>
        <el-table-column label="课程名称" min-width="150">
          <template #default="{ row }">{{ row.course_name }}</template>
        </el-table-column>
        <el-table-column label="教师" width="100" align="center">
          <template #default="{ row }">{{ row.teacher_name }}</template>
        </el-table-column>
        <el-table-column label="操作类型" width="100" align="center">
          <template #default="{ row }">
            <el-tag 
              :type="row.action_type === 'auto_schedule' ? 'primary' : (row.action_type === 'history_schedule' ? 'success' : 'warning')" 
              size="small">
              {{ row.action_type === 'auto_schedule' ? '自动排课' : (row.action_type === 'history_schedule' ? '历史排课' : '手动排课') }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作结果" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.action_result === 'success' ? 'success' : 'danger'" size="small">
              {{ row.action_result === 'success' ? '成功' : '失败' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="实验室" width="120" align="center">
          <template #default="{ row }">
            {{ row.action_result === 'success' ? `${row.building} ${row.lab_room}` : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="人数匹配" width="120" align="center">
          <template #default="{ row }">
            <span v-if="row.action_result === 'success'" :class="row.student_count <= row.lab_capacity ? 'text-success' : 'text-danger'">
              {{ row.student_count }}/{{ row.lab_capacity }}
            </span>
            <span v-else>{{ row.student_count }}/-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right" align="center">
          <template #default="{ row }">
            <el-button type="primary" size="small" round @click="showDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>
    
    <!-- 详情对话框 -->
    <el-dialog v-model="detailVisible" title="排课日志详情" width="800px">
      <div v-if="currentRow">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="申请编号">{{ currentRow.booking_no }}</el-descriptions-item>
          <el-descriptions-item label="操作时间">{{ formatTime(currentRow.create_time) }}</el-descriptions-item>
          <el-descriptions-item label="操作类型">
            <el-tag 
              :type="currentRow.action_type === 'auto_schedule' ? 'primary' : (currentRow.action_type === 'history_schedule' ? 'success' : 'warning')" 
              size="small">
              {{ currentRow.action_type === 'auto_schedule' ? '自动排课' : (currentRow.action_type === 'history_schedule' ? '历史排课' : '手动排课') }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="操作结果">
            <el-tag :type="currentRow.action_result === 'success' ? 'success' : 'danger'" size="small">
              {{ currentRow.action_result === 'success' ? '成功' : '失败' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="课程名称">{{ currentRow.course_name }}</el-descriptions-item>
          <el-descriptions-item label="教师姓名">{{ currentRow.teacher_name }}</el-descriptions-item>
          <el-descriptions-item label="学年学期">{{ currentRow.academic_year }} {{ currentRow.semester }}</el-descriptions-item>
          <el-descriptions-item label="学生人数">{{ currentRow.student_count }}人</el-descriptions-item>
        </el-descriptions>
        
        <el-divider>软件环境要求</el-divider>
        <div class="software-requirements">
          {{ currentRow.software_requirements || '无特殊要求' }}
        </div>
        
        <div v-if="currentRow.action_result === 'success'">
          <el-divider>排课结果</el-divider>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="实验室">{{ currentRow.building }} {{ currentRow.lab_room }}</el-descriptions-item>
            <el-descriptions-item label="实验室容量">{{ currentRow.lab_capacity }}人</el-descriptions-item>
            <el-descriptions-item label="匹配的软件环境" span="2">{{ currentRow.matched_software }}</el-descriptions-item>
            <el-descriptions-item label="匹配原因" span="2">{{ currentRow.match_reason }}</el-descriptions-item>
          </el-descriptions>
        </div>
        
        <div v-if="currentRow.action_result === 'failure'">
          <el-divider>失败原因</el-divider>
          <div class="failure-reason">
            <el-alert :title="currentRow.failure_reason" type="error" :closable="false" />
          </div>
        </div>
        
        <el-divider>时间段信息</el-divider>
        <el-table :data="currentRow.time_slots || []" border size="small">
          <el-table-column label="星期" align="center">
            <template #default="{ row }">{{ formatWeekday(row.weekday) }}</template>
          </el-table-column>
          <el-table-column label="周次范围" align="center">
            <template #default="{ row }">第 {{ row.week_start }}-{{ row.week_end }} 周</template>
          </el-table-column>
          <el-table-column label="节次范围" align="center">
            <template #default="{ row }">第 {{ row.period_start }}-{{ row.period_end }} 节</template>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { getScheduleLog } from '../utils/api'
import { formatTime, formatWeekday } from '../utils/format'

const loading = ref(false)
const actionTypeFilter = ref(null)
const actionResultFilter = ref(null)
const dateRange = ref([])
const tableData = ref([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const detailVisible = ref(false)
const currentRow = ref(null)

const loadData = async () => {
  loading.value = true
  
  try {
    const params = {
      pageNum: currentPage.value,
      pageSize: pageSize.value
    }
    
    if (actionTypeFilter.value) {
      params.actionType = actionTypeFilter.value
    }
    
    if (actionResultFilter.value) {
      params.actionResult = actionResultFilter.value
    }
    
    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }
    
    const res = await getScheduleLog(params)
    tableData.value = res.data
    total.value = res.total
  } catch (error) {
    console.error('加载排课日志失败:', error)
    ElMessage.error('加载失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

const handleSizeChange = (newSize) => {
  pageSize.value = newSize
  currentPage.value = 1
  loadData()
}

const handleCurrentChange = (newPage) => {
  currentPage.value = newPage
  loadData()
}

const showDetail = (row) => {
  currentRow.value = row
  detailVisible.value = true
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.page-container {
  padding: 20px;
}

.toolbar-card {
  margin-bottom: 20px;
}

.toolbar {
  display: flex;
  gap: 16px;
  align-items: center;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pagination-container {
  margin-top: 20px;
  text-align: right;
}

.software-requirements {
  padding: 12px;
  background-color: #f5f7fa;
  border-radius: 4px;
  border: 1px solid #e4e7ed;
  color: #606266;
  line-height: 1.6;
}

.failure-reason {
  margin-top: 8px;
}

.text-success {
  color: #67c23a;
  font-weight: bold;
}

.text-danger {
  color: #f56c6c;
  font-weight: bold;
}
</style>
