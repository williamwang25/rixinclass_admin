<template>
  <div class="page-container">
    <el-page-header title="返回" content="排课方案审核" />
    
    <el-card shadow="never" class="toolbar-card">
      <div class="toolbar">
        <el-select v-model="statusFilter" placeholder="状态筛选" @change="loadData" clearable style="width: 150px">
          <el-option label="全部" :value="null" />
          <el-option label="待审核" :value="3" />
          <el-option label="已通过" :value="1" />
          <el-option label="已拒绝" :value="2" />
        </el-select>
        
        <div style="flex: 1;"></div>
        
        <el-button type="primary" :icon="Checked" @click="batchApprove" :loading="batchLoading">
          批量通过
        </el-button>
        
        <el-button :icon="Refresh" @click="loadData" :loading="loading">刷新</el-button>
      </div>
    </el-card>
    
    <el-card shadow="never">
      <el-table 
        :data="tableData" 
        :loading="loading"
        stripe
        border
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" :selectable="checkSelectable" />
        <el-table-column prop="booking_no" label="申请编号" width="160" />
        <el-table-column prop="teacher_name" label="教师姓名" width="100" />
        <el-table-column prop="course_name" label="课程名称" min-width="150" />
        <el-table-column prop="student_count" label="学生人数" width="100" align="center" />
        <el-table-column label="实验室" min-width="150">
          <template #default="{ row }">
            <div v-if="row.lab_info && row.lab_info.length > 0">
              <el-tag 
                v-for="(lab, index) in row.lab_info" 
                :key="index"
                type="success"
                size="small"
                style="margin: 2px 4px 2px 0"
              >
                {{ lab.building }} {{ lab.lab_room }}
              </el-tag>
            </div>
            <span v-else style="color: #909399">未排课</span>
          </template>
        </el-table-column>
        <el-table-column label="申请时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.create_time, 'YYYY-MM-DD HH:mm') }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="formatStatus(row.status).type">
              {{ formatStatus(row.status).text }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="260" fixed="right" align="center">
          <template #default="{ row }">
            <el-button type="primary" size="small" round @click="showDetail(row)">详情</el-button>
            <el-button v-if="row.status === 3" link type="success" size="small" @click="handleApprove(row)">通过</el-button>
            <el-button v-if="row.status === 3" link type="danger" size="small" @click="handleReject(row)">拒绝</el-button>
            <el-button link type="info" size="small" @click="handleSendMessage(row)">
              <el-icon><ChatDotRound /></el-icon>
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
    
    <!-- 详情对话框 -->
    <el-dialog v-model="detailVisible" title="申请详情" width="800px">
      <el-descriptions :column="2" border v-if="currentRow">
        <el-descriptions-item label="申请编号">{{ currentRow.booking_no }}</el-descriptions-item>
        <el-descriptions-item label="申请状态">
          <el-tag :type="formatStatus(currentRow.status).type">
            {{ formatStatus(currentRow.status).text }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="学年学期">{{ currentRow.academic_year }} {{ currentRow.semester }}</el-descriptions-item>
        <el-descriptions-item label="课程代码">{{ currentRow.course_code || '-' }}</el-descriptions-item>
        <el-descriptions-item label="课程类型">{{ currentRow.course_type }}</el-descriptions-item>
        <el-descriptions-item label="课程名称">{{ currentRow.course_name }}</el-descriptions-item>
        <el-descriptions-item label="班级">{{ currentRow.class_name }}</el-descriptions-item>
        <el-descriptions-item label="学生人数">{{ currentRow.student_count }}</el-descriptions-item>
        <el-descriptions-item label="所需学时">{{ currentRow.required_hours }}</el-descriptions-item>
        <el-descriptions-item label="申请学时">{{ currentRow.booking_hours }}</el-descriptions-item>
        <el-descriptions-item label="软件环境" :span="2">{{ currentRow.software_requirements || '无特殊要求' }}</el-descriptions-item>
        <el-descriptions-item label="其他要求" :span="2">{{ currentRow.other_requirements || '无' }}</el-descriptions-item>
        <el-descriptions-item label="教师姓名">{{ currentRow.teacher_name }}</el-descriptions-item>
        <el-descriptions-item label="联系电话">{{ currentRow.teacher_phone }}</el-descriptions-item>
        <el-descriptions-item label="邮箱" :span="2">{{ currentRow.teacher_email }}</el-descriptions-item>
        <el-descriptions-item label="申请时间" :span="2">{{ formatTime(currentRow.create_time) }}</el-descriptions-item>
      </el-descriptions>
      
      <el-divider>时间段列表</el-divider>
      <el-table :data="currentRow?.time_slots || []" border size="small">
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
      
      <!-- 如果是已排课待审核状态，显示排课结果 -->
      <div v-if="currentRow?.status === 3">
        <el-divider>排课结果</el-divider>
        <div v-loading="scheduleLoading">
          <el-alert 
            v-if="scheduleResults.length === 0 && !scheduleLoading" 
            type="warning" 
            :closable="false"
            style="margin-bottom: 16px"
          >
            未找到排课结果
          </el-alert>
          
          <!-- 实验室信息卡片 -->
          <el-card v-if="scheduleResults.length > 0" shadow="hover" style="margin-bottom: 16px">
            <template #header>
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <span style="font-weight: bold;">
                  <el-icon style="margin-right: 4px;"><OfficeBuilding /></el-icon>
                  分配实验室
                </span>
                <el-tag :type="scheduleResults[0].is_manual ? 'warning' : 'success'" size="small">
                  {{ scheduleResults[0].is_manual ? '手动排课' : '自动排课' }}
                </el-tag>
              </div>
            </template>
            <el-descriptions :column="2" border>
              <el-descriptions-item label="实验室">
                <el-text type="primary" size="large" style="font-weight: bold;">
                  {{ scheduleResults[0].building }} {{ scheduleResults[0].lab_room }}
                </el-text>
              </el-descriptions-item>
              <el-descriptions-item label="实验室ID">
                {{ scheduleResults[0].lab_id }}
              </el-descriptions-item>
              <el-descriptions-item label="实验室名称" :span="2">
                {{ scheduleResults[0].lab_name }}
              </el-descriptions-item>
            </el-descriptions>
          </el-card>
          
          <!-- 时间段列表 -->
          <el-table 
            v-if="scheduleResults.length > 0"
            :data="scheduleResults" 
            border 
            size="small"
          >
            <el-table-column label="星期" align="center" width="100">
              <template #default="{ row }">
                <el-tag type="info">{{ formatWeekday(row.weekday) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="周次范围" align="center" width="120">
              <template #default="{ row }">第 {{ row.week_start }}-{{ row.week_end }} 周</template>
            </el-table-column>
            <el-table-column label="节次范围" align="center" width="120">
              <template #default="{ row }">第 {{ row.period_start }}-{{ row.period_end }} 节</template>
            </el-table-column>
            <el-table-column label="课程信息" min-width="200">
              <template #default="{ row }">
                <div>{{ row.course_name }}</div>
                <div style="font-size: 12px; color: #909399;">
                  {{ row.teacher_name }} | {{ row.student_count }}人
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </el-dialog>
    
    <!-- 拒绝对话框 -->
    <el-dialog v-model="rejectVisible" title="拒绝申请" width="500px">
      <el-form :model="rejectForm" label-width="100px">
        <el-form-item label="拒绝理由" required>
          <el-input 
            v-model="rejectForm.remark" 
            type="textarea" 
            :rows="4" 
            placeholder="请输入拒绝理由"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rejectVisible = false">取消</el-button>
        <el-button type="danger" @click="confirmReject" :loading="submitting">确认拒绝</el-button>
      </template>
    </el-dialog>
    
    <!-- 发送消息对话框 -->
    <el-dialog v-model="messageVisible" title="发送消息" width="500px">
      <el-alert type="info" :closable="false" style="margin-bottom: 15px">
        发送给教师：{{ currentRow?.teacher_name }} | 申请：{{ currentRow?.booking_no }}
      </el-alert>
      <el-form :model="messageForm" label-width="80px">
        <el-form-item label="消息内容" required>
          <el-input 
            v-model="messageForm.content" 
            type="textarea" 
            :rows="5" 
            placeholder="请输入消息内容"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="messageVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmSendMessage" :loading="messageSending">发送</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox, ElNotification } from 'element-plus'
import { Refresh, Checked, ChatDotRound, OfficeBuilding } from '@element-plus/icons-vue'
import { getBookingList, reviewBooking, sendMessage, getScheduleDraft } from '../utils/api'
import { formatTime, formatStatus, formatWeekday } from '../utils/format'

const loading = ref(false)
const submitting = ref(false)
const batchLoading = ref(false)
const messageSending = ref(false)
const scheduleLoading = ref(false)
const statusFilter = ref(3)  // 默认显示已排课待审核的申请
const tableData = ref([])
const selectedRows = ref([])
const scheduleResults = ref([])
const detailVisible = ref(false)
const rejectVisible = ref(false)
const messageVisible = ref(false)
const currentRow = ref(null)
const rejectForm = ref({
  remark: ''
})
const messageForm = reactive({
  content: ''
})

const loadData = async () => {
  loading.value = true
  
  try {
    const params = {}
    if (statusFilter.value !== null) {
      params.status = statusFilter.value
    }
    
    const res = await getBookingList(params)
    const bookings = res.data || []
    
    // 为每个申请加载排课草稿信息（实验室信息）
    for (const booking of bookings) {
      try {
        const draftRes = await getScheduleDraft({ bookingId: booking.booking_id })
        if (draftRes.success && draftRes.data && draftRes.data.length > 0) {
          // 提取实验室信息
          const labInfo = draftRes.data.map(draft => ({
            lab_id: draft.lab_id,
            lab_name: draft.lab_name,
            building: draft.building,
            lab_room: draft.lab_room
          }))
          // 去重（如果同一个实验室有多个时间段）
          const uniqueLabs = Array.from(
            new Map(labInfo.map(lab => [lab.lab_id, lab])).values()
          )
          booking.lab_info = uniqueLabs
        } else {
          booking.lab_info = []
        }
      } catch (error) {
        console.error(`加载申请 ${booking.booking_id} 的排课信息失败:`, error)
        booking.lab_info = []
      }
    }
    
    tableData.value = bookings
  } catch (error) {
    console.error('加载申请列表失败:', error)
    ElMessage.error('加载失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

const handleSelectionChange = (selection) => {
  selectedRows.value = selection
}

const checkSelectable = (row) => {
  // 只有已排课待审核的申请可以被选中
  return row.status === 3
}

const loadScheduleResults = async (bookingId) => {
  scheduleLoading.value = true
  try {
    const res = await getScheduleDraft({ bookingId })
    scheduleResults.value = res.data || []
  } catch (error) {
    console.error('加载排课草稿失败:', error)
    ElMessage.error('加载排课草稿失败: ' + error.message)
    scheduleResults.value = []
  } finally {
    scheduleLoading.value = false
  }
}

const showDetail = async (row) => {
  currentRow.value = row
  detailVisible.value = true
  
  // 如果是已排课待审核状态，加载排课结果
  if (row.status === 3) {
    await loadScheduleResults(row.booking_id)
  }
}

const handleApprove = async (row) => {
  try {
    await ElMessageBox.confirm(`确定通过申请 ${row.booking_no} 吗？`, '确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'success'
    })
    
    await reviewBooking({
      bookingId: row.booking_id,
      action: 'approve'
    })
    
    ElMessage.success('审核通过')
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('审核失败:', error)
      ElMessage.error('审核失败: ' + error.message)
    }
  }
}

const handleReject = (row) => {
  currentRow.value = row
  rejectForm.value.remark = ''
  rejectVisible.value = true
}

const confirmReject = async () => {
  if (!rejectForm.value.remark.trim()) {
    ElMessage.warning('请填写拒绝理由')
    return
  }
  
  submitting.value = true
  
  try {
    await reviewBooking({
      bookingId: currentRow.value.booking_id,
      action: 'reject',
      remark: rejectForm.value.remark
    })
    
    ElMessage.success('已拒绝')
    rejectVisible.value = false
    loadData()
  } catch (error) {
    console.error('审核失败:', error)
    ElMessage.error('审核失败: ' + error.message)
  } finally {
    submitting.value = false
  }
}

const handleSendMessage = (row) => {
  currentRow.value = row
  messageForm.content = ''
  messageVisible.value = true
}

const confirmSendMessage = async () => {
  if (!messageForm.content.trim()) {
    ElMessage.warning('请输入消息内容')
    return
  }
  
  messageSending.value = true
  
  try {
    await sendMessage({
      targetUserId: currentRow.value.user_id,
      bookingId: currentRow.value.booking_id,
      messageType: '管理员消息',
      content: messageForm.content,
      senderId: 'admin'
    })
    
    ElMessage.success('消息发送成功')
    messageVisible.value = false
  } catch (error) {
    console.error('发送消息失败:', error)
    ElMessage.error('发送失败: ' + error.message)
  } finally {
    messageSending.value = false
  }
}

const batchApprove = async () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请先选择需要审核的申请')
    return
  }
  
  try {
    await ElMessageBox.confirm(
      `确定批量通过选中的 ${selectedRows.value.length} 条申请吗？`,
      '批量审核',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'success'
      }
    )
    
    batchLoading.value = true
    
    let successCount = 0
    let failCount = 0
    const failReasons = []
    
    for (const row of selectedRows.value) {
      try {
        await reviewBooking({
          bookingId: row.booking_id,
          action: 'approve'
        })
        successCount++
      } catch (error) {
        failCount++
        failReasons.push(`${row.booking_no}: ${error.message}`)
      }
    }
    
    // 显示结果
    ElNotification({
      title: '批量审核完成',
      dangerouslyUseHTMLString: true,
      message: `
        <div>成功：${successCount} 条</div>
        <div>失败：${failCount} 条</div>
        ${failReasons.length > 0 ? '<div style="margin-top: 8px; font-size: 12px; color: #909399;">失败原因：<br/>' + failReasons.join('<br/>') + '</div>' : ''}
      `,
      type: successCount > 0 ? 'success' : 'warning',
      duration: 8000
    })
    
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量审核失败:', error)
      ElMessage.error('批量审核失败')
    }
  } finally {
    batchLoading.value = false
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
</style>

