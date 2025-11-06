<template>
  <div class="page-container">
    <el-page-header title="返回" content="公告管理" />
    
    <!-- 校园轮播图展示 -->
    <el-card shadow="never" :body-style="{ padding: 0 }" style="margin-bottom: 20px;">
      <el-carousel height="300px" indicator-position="outside">
        <el-carousel-item v-for="i in 6" :key="i">
          <img :src="`/carousel/image${i}.jpg`" style="width: 100%; height: 80%; object-fit: contain; background: #f5f5f5;" />
        </el-carousel-item>
      </el-carousel>
    </el-card>
    
    <!-- 通知公告管理 -->
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <div>
            <el-icon><Bell /></el-icon>
            <span>通知公告管理</span>
          </div>
          <div style="display: flex; gap: 12px;">
            <el-button type="primary" :icon="Plus" @click="handleCreateNotice" size="default">
              新增公告
            </el-button>
            <el-button :icon="Refresh" @click="loadNotices" :loading="noticeLoading" size="default">
              刷新
            </el-button>
          </div>
        </div>
      </template>
      
      <el-table :data="noticeData" :loading="noticeLoading" stripe border>
        <el-table-column prop="title" label="标题" min-width="200" />
        <el-table-column prop="notice_type" label="类型" width="120" />
        <el-table-column label="优先级" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.priority === 1 ? 'danger' : 'info'">
              {{ row.priority === 1 ? '重要' : '普通' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="发布时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.create_time, 'YYYY-MM-DD HH:mm') }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right" align="center">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleViewNotice(row)">查看</el-button>
            <el-button link type="warning" @click="handleEditNotice(row)">编辑</el-button>
            <el-button link type="danger" @click="handleDeleteNotice(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    
    <!-- 公告表单对话框 -->
    <el-dialog v-model="noticeFormVisible" :title="isEditNotice ? '编辑公告' : '新增公告'" width="700px">
      <el-form :model="noticeForm" :rules="noticeRules" ref="noticeFormRef" label-width="100px">
        <el-form-item label="标题" prop="title">
          <el-input v-model="noticeForm.title" placeholder="请输入公告标题" />
        </el-form-item>
        <el-form-item label="内容" prop="content">
          <el-input v-model="noticeForm.content" type="textarea" :rows="6" placeholder="请输入公告内容" />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="noticeForm.noticeType" style="width: 100%">
            <el-option label="系统公告" value="系统公告" />
            <el-option label="排课通知" value="排课通知" />
            <el-option label="紧急通知" value="紧急通知" />
          </el-select>
        </el-form-item>
        <el-form-item label="优先级">
          <el-radio-group v-model="noticeForm.priority">
            <el-radio :value="0">普通</el-radio>
            <el-radio :value="1">重要</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="noticeFormVisible = false">取消</el-button>
        <el-button type="primary" @click="submitNotice" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>
    
    <!-- 公告详情对话框 -->
    <el-dialog v-model="noticeDetailVisible" title="公告详情" width="600px">
      <el-descriptions :column="1" border v-if="currentNotice">
        <el-descriptions-item label="标题">{{ currentNotice.title }}</el-descriptions-item>
        <el-descriptions-item label="类型">{{ currentNotice.notice_type }}</el-descriptions-item>
        <el-descriptions-item label="优先级">
          <el-tag :type="currentNotice.priority === 1 ? 'danger' : 'info'">
            {{ currentNotice.priority === 1 ? '重要' : '普通' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="内容">
          <div style="white-space: pre-wrap;">{{ currentNotice.content }}</div>
        </el-descriptions-item>
        <el-descriptions-item label="发布时间">
          {{ formatTime(currentNotice.create_time) }}
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Plus, Picture, Bell } from '@element-plus/icons-vue'
import { getNoticeList, manageNotice } from '../utils/api'
import { formatTime } from '../utils/format'

const noticeLoading = ref(false)
const submitting = ref(false)

const noticeData = ref([])

const noticeFormVisible = ref(false)
const noticeDetailVisible = ref(false)
const isEditNotice = ref(false)
const currentNotice = ref(null)

const noticeFormRef = ref(null)

const noticeForm = reactive({
  noticeId: null,
  title: '',
  content: '',
  noticeType: '系统公告',
  priority: 0
})

const noticeRules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  content: [{ required: true, message: '请输入内容', trigger: 'blur' }]
}

// 加载公告
const loadNotices = async () => {
  noticeLoading.value = true
  try {
    const res = await getNoticeList()
    noticeData.value = res.data
  } catch (error) {
    console.error('加载公告失败:', error)
    ElMessage.error('加载失败: ' + error.message)
  } finally {
    noticeLoading.value = false
  }
}

// 公告操作
const handleCreateNotice = () => {
  isEditNotice.value = false
  Object.assign(noticeForm, {
    noticeId: null,
    title: '',
    content: '',
    noticeType: '系统公告',
    priority: 0
  })
  noticeFormVisible.value = true
}

const handleEditNotice = (row) => {
  isEditNotice.value = true
  Object.assign(noticeForm, {
    noticeId: row.notice_id,
    title: row.title,
    content: row.content,
    noticeType: row.notice_type,
    priority: row.priority
  })
  noticeFormVisible.value = true
}

const handleViewNotice = (row) => {
  currentNotice.value = row
  noticeDetailVisible.value = true
}

const submitNotice = async () => {
  try {
    await noticeFormRef.value.validate()
    submitting.value = true
    
    const action = isEditNotice.value ? 'update' : 'create'
    await manageNotice({
      action,
      data: {
        noticeId: noticeForm.noticeId,
        title: noticeForm.title,
        content: noticeForm.content,
        noticeType: noticeForm.noticeType,
        priority: noticeForm.priority
      }
    })
    
    ElMessage.success(isEditNotice.value ? '更新成功' : '发布成功')
    noticeFormVisible.value = false
    loadNotices()
  } catch (error) {
    if (error !== 'validation') {
      console.error('操作失败:', error)
      ElMessage.error('操作失败: ' + error.message)
    }
  } finally {
    submitting.value = false
  }
}

const handleDeleteNotice = async (row) => {
  try {
    await ElMessageBox.confirm(`确定删除公告"${row.title}"吗？`, '确认删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await manageNotice({
      action: 'delete',
      data: { noticeId: row.notice_id }
    })
    
    ElMessage.success('删除成功')
    loadNotices()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error('删除失败: ' + error.message)
    }
  }
}

onMounted(() => {
  loadNotices()
})
</script>

<style scoped>
.page-container {
  padding: 20px;
}

.el-page-header {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-weight: bold;
}

.card-header > div {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
}
</style>

