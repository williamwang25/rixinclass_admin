<template>
  <div class="system-config-page">
    <el-page-header @back="goBack" content="系统配置管理" />
    
    <el-card class="config-card" shadow="never" v-loading="loading">
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <el-icon><Setting /></el-icon>
            <span>系统配置</span>
          </div>
          <div class="header-right">
            <el-button type="primary" @click="handleSave" :loading="saving">
              <el-icon><Check /></el-icon>
              保存配置
            </el-button>
            <el-button @click="loadConfigs" :loading="loading">
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
          </div>
        </div>
      </template>

      <el-form :model="configForm" label-width="150px" class="config-form">
        <!-- 学年学期配置 -->
        <el-divider content-position="left">
          <el-icon><Calendar /></el-icon>
          <span style="margin-left: 8px;">学年学期配置</span>
        </el-divider>

        <el-form-item label="当前学年" required>
          <el-input 
            v-model="configForm.current_academic_year" 
            placeholder="例如：2025-2026"
            style="width: 300px;"
          >
            <template #append>学年</template>
          </el-input>
          <div class="form-tip">格式：YYYY-YYYY，例如 2025-2026</div>
        </el-form-item>

        <el-form-item label="当前学期" required>
          <el-select 
            v-model="configForm.current_semester" 
            placeholder="请选择学期"
            style="width: 300px;"
          >
            <el-option label="第一学期" value="第一学期" />
            <el-option label="第二学期" value="第二学期" />
          </el-select>
        </el-form-item>

        <!-- 申请时间配置 -->
        <el-divider content-position="left">
          <el-icon><Clock /></el-icon>
          <span style="margin-left: 8px;">申请时间配置</span>
        </el-divider>

        <el-form-item label="申请开始日期">
          <el-date-picker
            v-model="configForm.booking_start_date"
            type="date"
            placeholder="选择开始日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 300px;"
          />
        </el-form-item>

        <el-form-item label="申请截止日期">
          <el-date-picker
            v-model="configForm.booking_end_date"
            type="date"
            placeholder="选择截止日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 300px;"
          />
        </el-form-item>

        <!-- 教学参数配置 -->
        <el-divider content-position="left">
          <el-icon><Document /></el-icon>
          <span style="margin-left: 8px;">教学参数配置</span>
        </el-divider>

        <el-form-item label="最大教学周数">
          <el-input-number 
            v-model="configForm.max_weeks" 
            :min="1" 
            :max="30"
            style="width: 300px;"
          />
          <div class="form-tip">一学期的教学周数，通常为 18-20 周</div>
        </el-form-item>

        <el-form-item label="每天最大节次数">
          <el-input-number 
            v-model="configForm.max_periods_per_day" 
            :min="1" 
            :max="20"
            style="width: 300px;"
          />
          <div class="form-tip">每天的课程节次数，通常为 10-12 节</div>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 配置说明 -->
    <el-card class="info-card" shadow="never">
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <el-icon><InfoFilled /></el-icon>
            <span>配置说明</span>
          </div>
        </div>
      </template>

      <el-descriptions :column="1" border>
        <el-descriptions-item label="当前学年">
          小程序端申请时自动填充，教师无需手动选择
        </el-descriptions-item>
        <el-descriptions-item label="当前学期">
          小程序端申请时自动填充，教师无需手动选择
        </el-descriptions-item>
        <el-descriptions-item label="申请时间">
          控制教师可以提交申请的时间范围
        </el-descriptions-item>
        <el-descriptions-item label="教学参数">
          用于系统排课和时间段选择的参数限制
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 当前配置预览 -->
    <el-card class="preview-card" shadow="never" v-if="!loading">
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <el-icon><View /></el-icon>
            <span>当前配置预览</span>
          </div>
        </div>
      </template>

      <el-descriptions :column="2" border>
        <el-descriptions-item label="当前学年">
          <el-tag type="success">{{ configForm.current_academic_year || '未设置' }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="当前学期">
          <el-tag type="success">{{ configForm.current_semester || '未设置' }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="申请开始日期">
          <el-tag>{{ configForm.booking_start_date || '未设置' }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="申请截止日期">
          <el-tag>{{ configForm.booking_end_date || '未设置' }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="最大教学周数">
          <el-tag type="info">{{ configForm.max_weeks }} 周</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="每天最大节次数">
          <el-tag type="info">{{ configForm.max_periods_per_day }} 节</el-tag>
        </el-descriptions-item>
      </el-descriptions>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Setting, 
  Calendar, 
  Clock, 
  Document, 
  InfoFilled, 
  Refresh, 
  Check,
  View 
} from '@element-plus/icons-vue'
import { getSysConfig, manageSysConfig } from '../utils/api'
import { useRouter } from 'vue-router'

const router = useRouter()
const loading = ref(false)
const saving = ref(false)

// 配置表单
const configForm = reactive({
  current_academic_year: '',
  current_semester: '',
  booking_start_date: '',
  booking_end_date: '',
  max_weeks: 20,
  max_periods_per_day: 12
})

// 返回上一页
const goBack = () => {
  router.back()
}

// 加载配置
const loadConfigs = async () => {
  loading.value = true
  
  try {
    console.log('[SystemConfig] 开始加载配置...')
    
    const res = await getSysConfig()
    
    console.log('[SystemConfig] 加载结果:', res)
    
    if (res.success && res.data) {
      const configs = Array.isArray(res.data) ? res.data : []
      
      console.log('[SystemConfig] 配置数据:', configs)
      
      // 填充表单
      configs.forEach(config => {
        const key = config.config_key
        const value = config.config_value
        
        if (key in configForm) {
          // 数字类型转换
          if (key === 'max_weeks' || key === 'max_periods_per_day') {
            configForm[key] = parseInt(value) || 0
          } else {
            configForm[key] = value || ''
          }
        }
      })
      
      console.log('[SystemConfig] 表单数据:', configForm)
      ElMessage.success('配置加载成功')
    } else {
      throw new Error(res.message || '加载失败')
    }
  } catch (error) {
    console.error('[SystemConfig] 加载失败:', error)
    ElMessage.error('加载失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

// 保存配置
const handleSave = async () => {
  // 验证必填项
  if (!configForm.current_academic_year) {
    ElMessage.warning('请填写当前学年')
    return
  }
  
  if (!configForm.current_semester) {
    ElMessage.warning('请选择当前学期')
    return
  }
  
  // 确认保存
  try {
    await ElMessageBox.confirm(
      '确定要保存系统配置吗？保存后将立即生效。',
      '确认保存',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
  } catch {
    return
  }
  
  saving.value = true
  
  try {
    console.log('[SystemConfig] 开始保存配置...')
    console.log('[SystemConfig] 表单数据:', configForm)
    
    // 构建配置列表
    const configs = [
      {
        configKey: 'current_academic_year',
        configValue: String(configForm.current_academic_year)
      },
      {
        configKey: 'current_semester',
        configValue: String(configForm.current_semester)
      },
      {
        configKey: 'booking_start_date',
        configValue: String(configForm.booking_start_date || '')
      },
      {
        configKey: 'booking_end_date',
        configValue: String(configForm.booking_end_date || '')
      },
      {
        configKey: 'max_weeks',
        configValue: String(configForm.max_weeks)
      },
      {
        configKey: 'max_periods_per_day',
        configValue: String(configForm.max_periods_per_day)
      }
    ]
    
    console.log('[SystemConfig] 提交数据:', configs)
    
    const res = await manageSysConfig({
      action: 'batchUpdate',
      data: { configs }
    })
    
    console.log('[SystemConfig] 保存结果:', res)
    
    if (res.success) {
      ElMessage.success('配置保存成功')
      // 重新加载确认
      await loadConfigs()
    } else {
      throw new Error(res.message || '保存失败')
    }
  } catch (error) {
    console.error('[SystemConfig] 保存失败:', error)
    ElMessage.error('保存失败: ' + error.message)
  } finally {
    saving.value = false
  }
}

// 页面加载时获取配置
onMounted(() => {
  loadConfigs()
})
</script>

<style scoped>
.system-config-page {
  padding: 20px;
}

.el-page-header {
  margin-bottom: 20px;
}

.config-card,
.info-card,
.preview-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left,
.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-left {
  font-weight: bold;
  font-size: 16px;
}

.config-form {
  padding: 20px 0;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.el-divider {
  margin: 30px 0 20px 0;
}
</style>
