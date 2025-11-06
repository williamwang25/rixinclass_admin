<template>
  <div class="page-container">
    <el-page-header title="返回" content="实验室管理" />
    
    <el-card shadow="never" class="toolbar-card">
      <div class="toolbar">
        <el-button type="primary" :icon="Plus" @click="handleCreate">
          新增实验室
        </el-button>
        
        <el-select v-model="statusFilter" placeholder="状态筛选" @change="loadData" clearable style="width: 150px">
          <el-option label="全部" :value="null" />
          <el-option label="正常" :value="1" />
          <el-option label="维护中" :value="0" />
          <el-option label="停用" :value="2" />
        </el-select>
        
        <el-button :icon="Refresh" @click="loadData" :loading="loading">刷新</el-button>
      </div>
    </el-card>
    
    <el-card shadow="never">
      <el-table 
        :data="tableData" 
        :loading="loading"
        stripe
        border
      >
        <el-table-column prop="lab_room" label="房间号" width="100" />
        <el-table-column prop="lab_name" label="实验室名称" min-width="150" />
        <el-table-column prop="building" label="楼栋" width="120" />
        <el-table-column prop="floor" label="楼层" width="80" align="center" />
        <el-table-column prop="capacity" label="容量" width="80" align="center">
          <template #default="{ row }">
            <el-tag size="small">{{ row.capacity }}人</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="formatLabStatus(row.status).type">
              {{ formatLabStatus(row.status).text }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="lab_admin" label="管理员" width="100" />
        <el-table-column label="操作" width="220" fixed="right" align="center">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleEdit(row)">编辑</el-button>
            <el-button link type="info" @click="handleDetail(row)">详情</el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
    
    <!-- 新增/编辑对话框 -->
    <el-dialog v-model="formVisible" :title="isEdit ? '编辑实验室' : '新增实验室'" width="700px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="120px">
        <el-form-item label="房间号" prop="labRoom">
          <el-input v-model="form.labRoom" placeholder="如：505" />
        </el-form-item>
        
        <el-form-item label="实验室名称" prop="labName">
          <el-input v-model="form.labName" placeholder="如：计算机图形学实验室" />
        </el-form-item>
        
        <el-form-item label="楼栋" prop="building">
          <el-input v-model="form.building" placeholder="如：软件楼" />
        </el-form-item>
        
        <el-form-item label="楼层" prop="floor">
          <el-input-number v-model="form.floor" :min="1" :max="30" />
        </el-form-item>
        
        <el-form-item label="容量" prop="capacity">
          <el-input-number v-model="form.capacity" :min="1" :max="200" />
          <span style="margin-left: 10px; color: #909399;">人</span>
        </el-form-item>
        
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio :value="1">正常</el-radio>
            <el-radio :value="0">维护中</el-radio>
            <el-radio :value="2">停用</el-radio>
          </el-radio-group>
        </el-form-item>
        
        <el-form-item label="硬件环境">
          <el-input v-model="form.hardwareEnv" type="textarea" :rows="2" placeholder="如：Dell OptiPlex 7080, Intel i7, 16GB RAM" />
        </el-form-item>
        
        <el-form-item label="说明备注">
          <el-input v-model="form.supportNotes" type="textarea" :rows="2" placeholder="适用课程、特殊说明等" />
        </el-form-item>
        
        <el-form-item label="管理员">
          <el-input v-model="form.labAdmin" placeholder="如：李老师" />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>
    
    <!-- 详情对话框 -->
    <el-dialog v-model="detailVisible" title="实验室详情" width="700px">
      <el-descriptions :column="2" border v-if="currentRow">
        <el-descriptions-item label="房间号">{{ currentRow.lab_room }}</el-descriptions-item>
        <el-descriptions-item label="实验室名称">{{ currentRow.lab_name }}</el-descriptions-item>
        <el-descriptions-item label="楼栋">{{ currentRow.building }}</el-descriptions-item>
        <el-descriptions-item label="楼层">{{ currentRow.floor }}楼</el-descriptions-item>
        <el-descriptions-item label="容量">{{ currentRow.capacity }}人</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="formatLabStatus(currentRow.status).type">
            {{ formatLabStatus(currentRow.status).text }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="硬件环境" :span="2">{{ currentRow.hardware_env || '-' }}</el-descriptions-item>
        <el-descriptions-item label="说明备注" :span="2">{{ currentRow.support_notes || '-' }}</el-descriptions-item>
        <el-descriptions-item label="管理员" :span="2">{{ currentRow.lab_admin || '-' }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Plus } from '@element-plus/icons-vue'
import { getLabList, manageLabOperation } from '../utils/api'

const loading = ref(false)
const submitting = ref(false)
const statusFilter = ref(null)
const tableData = ref([])
const formVisible = ref(false)
const detailVisible = ref(false)
const isEdit = ref(false)
const currentRow = ref(null)
const formRef = ref(null)

const form = reactive({
  labId: null,
  labRoom: '',
  labName: '',
  building: '',
  floor: 1,
  capacity: 50,
  status: 1,
  hardwareEnv: '',
  supportNotes: '',
  labAdmin: ''
})

const rules = {
  labRoom: [{ required: true, message: '请输入房间号', trigger: 'blur' }],
  labName: [{ required: true, message: '请输入实验室名称', trigger: 'blur' }],
  building: [{ required: true, message: '请输入楼栋', trigger: 'blur' }],
  floor: [{ required: true, message: '请选择楼层', trigger: 'change' }],
  capacity: [{ required: true, message: '请输入容量', trigger: 'change' }]
}

const formatLabStatus = (status) => {
  const statusMap = {
    0: { text: '维护中', type: 'warning' },
    1: { text: '正常', type: 'success' },
    2: { text: '停用', type: 'danger' }
  }
  return statusMap[status] || { text: '未知', type: 'info' }
}

const loadData = async () => {
  loading.value = true
  
  try {
    const params = {}
    if (statusFilter.value !== null) {
      params.status = statusFilter.value
    }
    
    const res = await getLabList(params)
    tableData.value = res.data
  } catch (error) {
    console.error('加载实验室列表失败:', error)
    ElMessage.error('加载失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  form.labId = null
  form.labRoom = ''
  form.labName = ''
  form.building = ''
  form.floor = 1
  form.capacity = 50
  form.status = 1
  form.hardwareEnv = ''
  form.supportNotes = ''
  form.labAdmin = ''
}

const handleCreate = () => {
  isEdit.value = false
  resetForm()
  formVisible.value = true
}

const handleEdit = (row) => {
  isEdit.value = true
  form.labId = row.lab_id
  form.labRoom = row.lab_room
  form.labName = row.lab_name
  form.building = row.building
  form.floor = row.floor
  form.capacity = row.capacity
  form.status = row.status
  form.hardwareEnv = row.hardware_env || ''
  form.supportNotes = row.support_notes || ''
  form.labAdmin = row.lab_admin || ''
  formVisible.value = true
}

const handleDetail = (row) => {
  currentRow.value = row
  detailVisible.value = true
}

const handleSubmit = async () => {
  try {
    await formRef.value.validate()
    
    submitting.value = true
    
    const action = isEdit.value ? 'update' : 'create'
    const data = {
      labRoom: form.labRoom,
      labName: form.labName,
      building: form.building,
      floor: form.floor,
      capacity: form.capacity,
      status: form.status,
      hardwareEnv: form.hardwareEnv,
      supportNotes: form.supportNotes,
      labAdmin: form.labAdmin
    }
    
    if (isEdit.value) {
      data.labId = form.labId
    }
    
    await manageLabOperation({ action, data })
    
    ElMessage.success(isEdit.value ? '更新成功' : '创建成功')
    formVisible.value = false
    loadData()
  } catch (error) {
    if (error !== 'validation') {
      console.error('操作失败:', error)
      ElMessage.error('操作失败: ' + error.message)
    }
  } finally {
    submitting.value = false
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定删除实验室 "${row.building} ${row.lab_room}" 吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await manageLabOperation({
      action: 'delete',
      data: { labId: row.lab_id }
    })
    
    ElMessage.success('删除成功')
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error('删除失败: ' + error.message)
    }
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

