<template>
  <div class="page-container">
    <el-page-header title="返回" content="用户管理" />
    
    <el-card shadow="never" class="toolbar-card">
      <div class="toolbar">
        <el-select v-model="userTypeFilter" placeholder="用户类型" @change="loadData" clearable style="width: 150px">
          <el-option label="全部" :value="null" />
          <el-option label="教师" :value="0" />
          <el-option label="管理员" :value="1" />
        </el-select>
        
        <el-select v-model="statusFilter" placeholder="状态筛选" @change="loadData" clearable style="width: 150px">
          <el-option label="全部" :value="null" />
          <el-option label="正常" :value="1" />
          <el-option label="禁用" :value="0" />
        </el-select>
        
        <div style="flex: 1;"></div>
        
        <el-button :icon="Refresh" @click="loadData" :loading="loading">刷新</el-button>
      </div>
    </el-card>
    
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>用户列表</span>
          <el-tag v-if="!loading">共 {{ tableData.length }} 个用户</el-tag>
        </div>
      </template>
      
      <el-table 
        :data="tableData" 
        :loading="loading"
        stripe
        border
      >
        <el-table-column prop="user_id" label="用户ID" width="140" />
        <el-table-column prop="nick_name" label="昵称" width="120" />
        <el-table-column prop="name" label="真实姓名" width="100" />
        <el-table-column prop="phone" label="手机号" width="130" />
        <el-table-column prop="email" label="邮箱" min-width="180" show-overflow-tooltip />
        <el-table-column label="类型" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.user_type === 1 ? 'danger' : 'primary'">
              {{ row.user_type === 1 ? '管理员' : '教师' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'danger'">
              {{ row.status === 1 ? '正常' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="最近访问" width="180">
          <template #default="{ row }">
            {{ formatTime(row.latest_visit_at, 'YYYY-MM-DD HH:mm') }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="240" fixed="right" align="center">
          <template #default="{ row }">
            <el-button type="primary" size="small" round @click="handleEdit(row)">编辑</el-button>
            <el-button 
              :type="row.status === 1 ? 'warning' : 'success'" 
              size="small"
              round
              @click="handleToggleStatus(row)"
            >
              {{ row.status === 1 ? '禁用' : '启用' }}
            </el-button>
            <el-button type="danger" size="small" round @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
    
    <!-- 编辑用户对话框 -->
    <el-dialog v-model="formVisible" title="编辑用户信息" width="600px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="昵称">
          <el-input v-model="form.nickName" disabled />
        </el-form-item>
        
        <el-form-item label="真实姓名" prop="name">
          <el-input v-model="form.name" placeholder="请输入真实姓名" />
        </el-form-item>
        
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="form.phone" placeholder="请输入手机号" maxlength="11" />
        </el-form-item>
        
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="form.email" placeholder="请输入邮箱" />
        </el-form-item>
        
        <el-form-item label="用户类型">
          <el-radio-group v-model="form.userType">
            <el-radio :value="0">教师</el-radio>
            <el-radio :value="1">管理员</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { getUserList, manageUser } from '../utils/api'
import { formatTime } from '../utils/format'

const loading = ref(false)
const submitting = ref(false)
const userTypeFilter = ref(null)
const statusFilter = ref(null)
const tableData = ref([])
const formVisible = ref(false)
const formRef = ref(null)

const form = reactive({
  userId: null,
  nickName: '',
  name: '',
  phone: '',
  email: '',
  userType: 0
})

const rules = {
  name: [{ required: true, message: '请输入真实姓名', trigger: 'blur' }],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }
  ],
  email: [
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' }
  ]
}

const loadData = async () => {
  loading.value = true
  
  try {
    const params = {}
    if (userTypeFilter.value !== null) {
      params.userType = userTypeFilter.value
    }
    if (statusFilter.value !== null) {
      params.status = statusFilter.value
    }
    
    const res = await getUserList(params)
    tableData.value = res.data
  } catch (error) {
    console.error('加载用户列表失败:', error)
    ElMessage.error('加载失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

const handleEdit = (row) => {
  form.userId = row.user_id
  form.nickName = row.nick_name
  form.name = row.name || ''
  form.phone = row.phone || ''
  form.email = row.email || ''
  form.userType = row.user_type
  formVisible.value = true
}

const handleSubmit = async () => {
  try {
    await formRef.value.validate()
    submitting.value = true
    
    await manageUser({
      action: 'update',
      data: {
        userId: form.userId,
        name: form.name,
        phone: form.phone,
        email: form.email,
        userType: form.userType
      }
    })
    
    ElMessage.success('更新成功')
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

const handleToggleStatus = async (row) => {
  const newStatus = row.status === 1 ? 0 : 1
  const action = newStatus === 1 ? '启用' : '禁用'
  
  try {
    await ElMessageBox.confirm(
      `确定${action}用户 "${row.nick_name}" 吗？`,
      '确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await manageUser({
      action: 'updateStatus',
      data: {
        userId: row.user_id,
        status: newStatus
      }
    })
    
    ElMessage.success(`${action}成功`)
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('操作失败:', error)
      ElMessage.error('操作失败: ' + error.message)
    }
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定删除用户 "${row.nick_name}" 吗？此操作不可恢复！`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await manageUser({
      action: 'delete',
      data: { userId: row.user_id }
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

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: bold;
}
</style>

