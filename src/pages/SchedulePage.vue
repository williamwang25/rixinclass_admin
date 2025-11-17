<template>
  <div class="page-container">
    <el-page-header title="返回" content="排课管理" />
    
    <el-card shadow="never" class="toolbar-card">
      <div class="toolbar">
        <div style="flex: 1;"></div>
        
        <el-button type="info" :icon="Document" @click="batchHistorySchedule" :loading="historyBatchLoading">
          历史排课
        </el-button>
        <el-button type="primary" :icon="MagicStick" @click="batchSchedule" :loading="batchLoading">
          自动排课
        </el-button>
        <el-button :icon="Refresh" @click="loadData" :loading="loading">刷新</el-button>
      </div>
    </el-card>
    
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>待排课的申请</span>
          <el-tag v-if="!loading">共 {{ tableData.length }} 条</el-tag>
        </div>
      </template>
      
      <el-table 
        :data="tableData" 
        :loading="loading"
        stripe
        border
      >
        <el-table-column prop="booking_no" label="申请编号" width="160" />
        <el-table-column prop="teacher_name" label="教师姓名" width="100" />
        <el-table-column prop="course_name" label="课程名称" min-width="150" />
        <el-table-column prop="student_count" label="学生人数" width="100" align="center" />
        <el-table-column label="时间段数量" width="100" align="center">
          <template #default="{ row }">
            <el-tag size="small">{{ row.time_slots?.length || 0 }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="申请时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.create_time, 'YYYY-MM-DD HH:mm') }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="300" fixed="right" align="center">
          <template #default="{ row }">
            <el-button type="primary" size="small" round @click="showDetail(row)">详情</el-button>
            <el-button link type="success" size="small" @click="handleSchedule(row)" :loading="scheduling[row.booking_id]">
              自动
            </el-button>
            <el-button link type="warning" size="small" @click="handleManualSchedule(row)">
              手动
            </el-button>
            <el-button link type="info" size="small" @click="handleSendMessage(row)">
              消息
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
    
    <!-- 详情对话框 -->
    <el-dialog v-model="detailVisible" title="申请详情" width="800px">
      <el-descriptions :column="2" border v-if="currentRow">
        <el-descriptions-item label="申请编号">{{ currentRow.booking_no }}</el-descriptions-item>
        <el-descriptions-item label="课程名称">{{ currentRow.course_name }}</el-descriptions-item>
        <el-descriptions-item label="教师姓名">{{ currentRow.teacher_name }}</el-descriptions-item>
        <el-descriptions-item label="学生人数">{{ currentRow.student_count }}</el-descriptions-item>
        <el-descriptions-item label="软件环境" :span="2">{{ currentRow.software_requirements || '无特殊要求' }}</el-descriptions-item>
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
    </el-dialog>
    
    <!-- 手动排课对话框 -->
    <el-dialog v-model="manualVisible" title="手动排课" width="900px">
      <el-alert type="info" :closable="false" style="margin-bottom: 20px">
        <template #title>
          <div>正在为申请 <strong>{{ currentRow?.booking_no }}</strong> 手动排课</div>
          <div style="font-size: 13px; margin-top: 4px;">课程：{{ currentRow?.course_name }} | 学生人数：{{ currentRow?.student_count }}</div>
        </template>
      </el-alert>
      
      <el-form label-width="100px">
        <el-form-item label="选择实验室" required>
          <el-select 
            v-model="selectedLabIds" 
            placeholder="请选择实验室（可多选）" 
            filterable 
            multiple
            collapse-tags
            collapse-tags-tooltip
            style="width: 100%"
          >
            <el-option
              v-for="lab in availableLabs"
              :key="lab.lab_id"
              :label="`${lab.building} ${lab.lab_room} (容量: ${lab.capacity}人)`"
              :value="lab.lab_id"
              :disabled="lab.capacity < currentRow?.student_count"
            >
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span>{{ lab.building }} {{ lab.lab_room }}</span>
                <span style="color: #909399; font-size: 12px;">
                  容量: {{ lab.capacity }}人
                  <el-tag v-if="lab.capacity < currentRow?.student_count" type="danger" size="small" style="margin-left: 8px">
                    容量不足
                  </el-tag>
                </span>
              </div>
            </el-option>
          </el-select>
        </el-form-item>
        
        <!-- 已选实验室详情 -->
        <el-form-item label="实验室详情" v-if="selectedLabIds.length > 0">
          <div class="lab-details-container">
            <el-card 
              v-for="labId in selectedLabIds" 
              :key="labId" 
              class="lab-detail-card"
              shadow="hover"
            >
              <template v-if="getLabById(labId)">
                <div class="lab-header">
                  <h4>{{ getLabById(labId).building }} {{ getLabById(labId).lab_room }}</h4>
                  <el-tag type="success" size="small">容量: {{ getLabById(labId).capacity }}人</el-tag>
                </div>
                
                <el-descriptions :column="1" size="small" border style="margin-top: 12px">
                  <el-descriptions-item label="软件环境" label-class-name="env-label">
                    <div v-if="parseSoftwareEnv(getLabById(labId).software_envs).length > 0" class="software-env-container">
                      <!-- 遍历多个环境配置 -->
                      <div 
                        v-for="(env, envIndex) in parseSoftwareEnv(getLabById(labId).software_envs)" 
                        :key="envIndex"
                        class="env-item"
                        :class="{ 'env-item-last': envIndex === parseSoftwareEnv(getLabById(labId).software_envs).length - 1 }"
                      >
                        <!-- 环境标题 -->
                        <div class="env-title">
                          <span style="font-weight: 600; color: #409eff">环境 {{ envIndex + 1 }}</span>
                          <el-tag v-if="env.supported_courses" size="small" type="success" style="margin-left: 8px">
                            {{ env.supported_courses }}
                          </el-tag>
                        </div>
                        
                        <!-- 操作系统 -->
                        <div style="margin-bottom: 6px">
                          <span style="font-size: 12px; color: #909399; margin-right: 8px">操作系统：</span>
                          <el-tag size="small" type="info">
                            {{ env.os || 'Windows 10' }}
                          </el-tag>
                        </div>
                        
                        <!-- 软件列表 -->
                        <div v-if="env.software && env.software.length > 0" style="margin-bottom: 6px">
                          <div style="font-size: 12px; color: #909399; margin-bottom: 4px">软件列表：</div>
                          <div style="display: flex; flex-wrap: wrap; gap: 4px">
                            <el-tag 
                              v-for="(sw, swIndex) in env.software" 
                              :key="swIndex"
                              size="small"
                            >
                              {{ typeof sw === 'string' ? sw : `${sw.name} ${sw.version}` }}
                            </el-tag>
                          </div>
                        </div>
                        
                        <!-- 其他要求 -->
                        <div v-if="env.other_requirements" style="margin-top: 6px; font-size: 12px; color: #909399">
                          <span style="font-weight: 500">备注：</span>{{ env.other_requirements }}
                        </div>
                      </div>
                    </div>
                    <span v-else style="color: #909399">无特殊软件</span>
                  </el-descriptions-item>
                  
                  <el-descriptions-item label="硬件环境">
                    <div v-if="getLabById(labId).hardware_env">
                      <span style="color: #606266">{{ getLabById(labId).hardware_env }}</span>
                    </div>
                    <span v-else style="color: #909399">标准配置</span>
                  </el-descriptions-item>
                  
                  <el-descriptions-item label="位置">
                    {{ getLabById(labId).building }} {{ getLabById(labId).floor }}楼
                  </el-descriptions-item>
                  
                  <el-descriptions-item label="备注" v-if="getLabById(labId).remark">
                    <span style="color: #909399">{{ getLabById(labId).remark }}</span>
                  </el-descriptions-item>
                </el-descriptions>
              </template>
            </el-card>
          </div>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="manualVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmManualSchedule" :loading="manualSubmitting" :disabled="selectedLabIds.length === 0">
          确认排课
        </el-button>
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
    
    <!-- 排课结果详情对话框 -->
    <el-dialog 
      v-model="scheduleResultVisible" 
      title="排课结果详情" 
      width="900px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
    >
      <div v-if="scheduleResult">
        <!-- 统计概览 -->
        <el-row :gutter="20" style="margin-bottom: 20px">
          <el-col :span="8">
            <el-card shadow="hover" class="stat-card success-card">
              <div class="stat-content">
                <div class="stat-icon">
                  <el-icon :size="32"><CircleCheck /></el-icon>
                </div>
                <div class="stat-info">
                  <div class="stat-label">排课成功</div>
                  <div class="stat-value">{{ scheduleResult.successCount }}</div>
                </div>
              </div>
            </el-card>
          </el-col>
          <el-col :span="8">
            <el-card shadow="hover" class="stat-card fail-card">
              <div class="stat-content">
                <div class="stat-icon">
                  <el-icon :size="32"><CircleClose /></el-icon>
                </div>
                <div class="stat-info">
                  <div class="stat-label">排课失败</div>
                  <div class="stat-value">{{ scheduleResult.failCount }}</div>
                </div>
              </div>
            </el-card>
          </el-col>
          <el-col :span="8">
            <el-card shadow="hover" class="stat-card total-card">
              <div class="stat-content">
                <div class="stat-icon">
                  <el-icon :size="32"><Document /></el-icon>
                </div>
                <div class="stat-info">
                  <div class="stat-label">总计</div>
                  <div class="stat-value">{{ scheduleResult.total }}</div>
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>
        
        <!-- 成功列表 -->
        <div v-if="scheduleResult.successList.length > 0" style="margin-bottom: 20px">
          <el-divider content-position="left">
            <el-icon style="color: #67c23a; margin-right: 4px"><CircleCheck /></el-icon>
            排课成功 ({{ scheduleResult.successList.length }})
          </el-divider>
          <el-table :data="scheduleResult.successList" border size="small" max-height="250">
            <el-table-column prop="bookingNo" label="申请编号" width="140" />
            <el-table-column prop="courseName" label="课程名称" min-width="150" />
            <el-table-column prop="labName" label="分配实验室" width="150" />
            <el-table-column v-if="scheduleResult.isHistory" prop="historyYear" label="参考学年" width="120" align="center">
              <template #default="{ row }">
                <el-tag type="info" size="small">{{ row.historyYear }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="80" align="center">
              <template #default>
                <el-tag type="success" size="small">成功</el-tag>
              </template>
            </el-table-column>
          </el-table>
        </div>
        
        <!-- 失败列表 -->
        <div v-if="scheduleResult.failList.length > 0">
          <el-divider content-position="left">
            <el-icon style="color: #f56c6c; margin-right: 4px"><CircleClose /></el-icon>
            排课失败 ({{ scheduleResult.failList.length }})
          </el-divider>
          <el-table :data="scheduleResult.failList" border size="small" max-height="250">
            <el-table-column prop="bookingNo" label="申请编号" width="140" />
            <el-table-column prop="courseName" label="课程名称" min-width="150" />
            <el-table-column prop="reason" label="失败原因" min-width="200">
              <template #default="{ row }">
                <el-text type="danger" size="small">{{ row.reason }}</el-text>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="80" align="center">
              <template #default>
                <el-tag type="danger" size="small">失败</el-tag>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
      
      <template #footer>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <el-button type="primary" plain @click="goToScheduleLog">
            <el-icon style="margin-right: 4px"><Document /></el-icon>
            查看排课日志
          </el-button>
          <el-button type="primary" @click="scheduleResultVisible = false">关闭</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, ElNotification } from 'element-plus'
import { Refresh, MagicStick, ChatDotRound, CircleCheck, CircleClose, Document } from '@element-plus/icons-vue'
import { getBookingList, autoSchedule, manualSchedule, historySchedule, getLabList, sendMessage } from '../utils/api'
import { formatTime, formatWeekday } from '../utils/format'

const router = useRouter()

const loading = ref(false)
const batchLoading = ref(false)
const historyBatchLoading = ref(false)
const messageSending = ref(false)
const scheduling = reactive({})
const tableData = ref([])
const detailVisible = ref(false)
const manualVisible = ref(false)
const messageVisible = ref(false)
const manualSubmitting = ref(false)
const currentRow = ref(null)
const availableLabs = ref([])
const selectedLabIds = ref([])  // 改为数组支持多选
const messageForm = reactive({
  content: ''
})

// 根据 ID 获取实验室信息
const getLabById = (labId) => {
  return availableLabs.value.find(lab => lab.lab_id === labId)
}

// 解析软件环境（software_envs 已经是数组，直接返回）
const parseSoftwareEnv = (softwareEnvs) => {
  if (!softwareEnvs) {
    return []
  }
  
  try {
    // 如果已经是数组，直接返回
    if (Array.isArray(softwareEnvs)) {
      return softwareEnvs
    }
    
    // 如果是对象（旧格式兼容）
    if (typeof softwareEnvs === 'object') {
      const keys = Object.keys(softwareEnvs)
      
      // 检查第一个键是否是数字（多环境配置）
      if (keys.length > 0 && !isNaN(keys[0])) {
        // 多环境配置：{0: {...}, 1: {...}}
        return Object.values(softwareEnvs)
      } else if (keys.includes('os') || keys.includes('software')) {
        // 单环境配置：{os: "...", software: [...]}
        return [softwareEnvs]
      }
    }
    
    return []
  } catch (error) {
    console.error('[parseSoftwareEnv] 解析失败:', error, softwareEnvs)
    return []
  }
}
const scheduleResultVisible = ref(false)
const scheduleResult = ref(null)

const loadData = async () => {
  loading.value = true
  
  try {
    // 查询待排课的申请（status=0）
    const res = await getBookingList({ status: 0 })
    tableData.value = res.data
  } catch (error) {
    console.error('加载申请列表失败:', error)
    ElMessage.error('加载失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

const showDetail = (row) => {
  currentRow.value = row
  detailVisible.value = true
}

const handleSchedule = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定为申请 ${row.booking_no} 自动排课吗？`,
      '确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'success'
      }
    )
    
    scheduling[row.booking_id] = true
    
    const res = await autoSchedule({ bookingId: row.booking_id })
    
    if (res.success) {
      ElNotification({
        title: '排课成功',
        message: `已分配实验室：${res.data.labName}`,
        type: 'success',
        duration: 5000
      })
      loadData()
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('排课失败:', error)
      
      // 自动排课失败，提示手动排课
      ElMessageBox.confirm(
        `自动排课失败：${error.message}<br/><br/>是否进行手动排课？`,
        '提示',
        {
          confirmButtonText: '手动排课',
          cancelButtonText: '取消',
          type: 'warning',
          dangerouslyUseHTMLString: true
        }
      ).then(() => {
        handleManualSchedule(row)
      }).catch(() => {
        // 用户取消
      })
    }
  } finally {
    scheduling[row.booking_id] = false
  }
}

const handleManualSchedule = async (row) => {
  currentRow.value = row
  selectedLabIds.value = []  // 清空已选实验室
  
  try {
    // 加载实验室列表
    const res = await getLabList({ status: 1 })
    availableLabs.value = res.data
    
    // 调试：查看第一个实验室的数据结构
    if (res.data && res.data.length > 0) {
    }
    
    manualVisible.value = true
  } catch (error) {
    ElMessage.error('加载实验室列表失败: ' + error.message)
  }
}

const confirmManualSchedule = async () => {
  if (!selectedLabIds.value || selectedLabIds.value.length === 0) {
    ElMessage.warning('请至少选择一个实验室')
    return
  }
  
  manualSubmitting.value = true
  
  try {
    // 如果选择了多个实验室，使用第一个（或者可以让后端支持多个）
    const labId = selectedLabIds.value[0]
    const res = await manualSchedule({
      bookingId: currentRow.value.booking_id,
      labId: labId
    })
    
    const selectedLabs = selectedLabIds.value.map(id => {
      const lab = getLabById(id)
      return lab ? `${lab.building} ${lab.lab_room}` : ''
    }).filter(Boolean).join('、')
    
    ElNotification({
      title: '手动排课成功',
      message: `已分配实验室：${selectedLabs}`,
      type: 'success',
      duration: 5000
    })
    
    manualVisible.value = false
    loadData()
  } catch (error) {
    console.error('手动排课失败:', error)
    ElMessage.error('手动排课失败: ' + error.message)
  } finally {
    manualSubmitting.value = false
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

// 批量历史排课
const batchHistorySchedule = async () => {
  if (tableData.value.length === 0) {
    ElMessage.warning('没有需要排课的申请')
    return
  }
  
  try {
    await ElMessageBox.confirm(
      `确定对 ${tableData.value.length} 条申请执行批量历史排课吗？<br/><br/>` +
      `系统将根据上一学年相同学期的历史排课记录进行匹配。`,
      '批量历史排课',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info',
        dangerouslyUseHTMLString: true
      }
    )
    
    historyBatchLoading.value = true
    
    let successCount = 0
    let failCount = 0
    const successList = []
    const failList = []
    
    for (const row of tableData.value) {
      try {
        const res = await historySchedule({ bookingId: row.booking_id })
        if (res.success) {
          successCount++
          successList.push({
            bookingNo: row.booking_no,
            courseName: row.course_name,
            labName: `${res.data.building} ${res.data.lab_room}`,
            historyYear: res.data.history_year
          })
        } else {
          failCount++
          failList.push({
            bookingNo: row.booking_no,
            courseName: row.course_name,
            reason: res.message
          })
        }
      } catch (error) {
        failCount++
        failList.push({
          bookingNo: row.booking_no,
          courseName: row.course_name,
          reason: error.message
        })
      }
    }
    
    // 保存结果数据
    scheduleResult.value = {
      successCount,
      failCount,
      total: tableData.value.length,
      successList,
      failList,
      isHistory: true  // 标记为历史排课
    }
    
    // 显示结果对话框
    scheduleResultVisible.value = true
    
    // 刷新列表
    await loadData()
    
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量历史排课失败:', error)
      ElMessage.error('批量历史排课失败: ' + error.message)
    }
  } finally {
    historyBatchLoading.value = false
  }
}

const batchSchedule = async () => {
  if (tableData.value.length === 0) {
    ElMessage.warning('没有需要排课的申请')
    return
  }
  
  try {
    await ElMessageBox.confirm(
      `确定对 ${tableData.value.length} 条申请执行批量自动排课吗？`,
      '批量排课',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    batchLoading.value = true
    
    let successCount = 0
    let failCount = 0
    const successList = []
    const failList = []
    
    for (const row of tableData.value) {
      try {
        const res = await autoSchedule({ bookingId: row.booking_id })
        if (res.success) {
          successCount++
          successList.push({
            bookingNo: row.booking_no,
            courseName: row.course_name,
            labName: res.data.labName
          })
        } else {
          failCount++
          failList.push({
            bookingNo: row.booking_no,
            courseName: row.course_name,
            reason: res.message
          })
        }
      } catch (error) {
        failCount++
        failList.push({
          bookingNo: row.booking_no,
          courseName: row.course_name,
          reason: error.message
        })
      }
    }
    
    // 保存结果数据
    scheduleResult.value = {
      successCount,
      failCount,
      total: tableData.value.length,
      successList,
      failList
    }
    
    // 显示结果详情对话框
    scheduleResultVisible.value = true
    
    // 刷新数据
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量排课失败:', error)
      ElMessage.error('批量排课失败')
    }
  } finally {
    batchLoading.value = false
  }
}

const goToScheduleLog = () => {
  scheduleResultVisible.value = false
  router.push('/schedule-log')
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

/* 排课结果统计卡片样式 */
.stat-card {
  border-radius: 8px;
  transition: all 0.3s;
}

.stat-card:hover {
  transform: translateY(-2px);
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  flex-shrink: 0;
}

.stat-info {
  flex: 1;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  line-height: 1;
}

.success-card .stat-icon {
  background-color: #f0f9ff;
  color: #67c23a;
}

.success-card .stat-value {
  color: #67c23a;
}

.fail-card .stat-icon {
  background-color: #fef0f0;
  color: #f56c6c;
}

.fail-card .stat-value {
  color: #f56c6c;
}

.total-card .stat-icon {
  background-color: #f4f4f5;
  color: #409eff;
}

.total-card .stat-value {
  color: #409eff;
}

/* 实验室详情容器 */
.lab-details-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 500px;  /* 增加最大高度 */
  overflow-y: auto;
  padding: 4px;  /* 添加内边距，避免阴影被裁剪 */
}

.lab-detail-card {
  border-radius: 8px;
  transition: all 0.3s;
  min-height: 200px;  /* 设置最小高度 */
}

.lab-detail-card :deep(.el-card__body) {
  padding: 16px;  /* 增加卡片内边距 */
}

.lab-detail-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.lab-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;  /* 增加底部间距 */
}

.lab-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

/* 软件环境容器 */
.software-env-container {
  min-height: 80px;
  padding: 8px 0;
}

.env-item {
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px dashed #e4e7ed;
}

.env-item-last {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.env-title {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  font-size: 14px;
}

/* 确保 el-descriptions 的内容区域有足够高度 */
.lab-detail-card :deep(.el-descriptions__body .el-descriptions__cell) {
  vertical-align: top;
}

.lab-detail-card :deep(.el-descriptions__content) {
  min-height: 60px;
}
</style>

