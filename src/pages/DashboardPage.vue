<template>
  <div class="page-container">
    <el-page-header title="返回" content="数据看板">
      <template #extra>
        <el-tag>{{ currentSemester }}</el-tag>
        <el-button :icon="Refresh" @click="loadData" :loading="loading" style="margin-left: 12px;">刷新</el-button>
      </template>
    </el-page-header>
    
    <!-- 统计卡片 -->
    <div class="stats-grid">
      <stat-card
        :icon="Clock"
        label="待审核申请"
        :value="stats.basic.pending"
        color="warning"
        @click="goToReview"
      />
      
      <stat-card
        :icon="Document"
        label="本学期申请总数"
        :value="stats.basic.total"
        color="primary"
      />
      
      <stat-card
        :icon="Checked"
        label="已排课数量"
        :value="stats.basic.scheduled"
        color="success"
        @click="goToResult"
      />
      
      <stat-card
        :icon="UserFilled"
        label="总学生人数"
        :value="stats.studentStats.total"
        color="danger"
      />
    </div>
    
    <!-- 图表网格 - 第一行 -->
    <el-row :gutter="20" style="margin-bottom: 20px;">
      <!-- 申请状态分布 - 饼图 -->
      <el-col :span="8">
        <el-card shadow="never">
          <template #header>
            <div class="chart-header">
              <el-icon><PieChart /></el-icon>
              <span>申请状态分布</span>
            </div>
          </template>
          <div ref="statusChartRef" style="height: 300px;"></div>
        </el-card>
      </el-col>
      
      <!-- 课程类型分布 - 饼图 -->
      <el-col :span="8">
        <el-card shadow="never">
          <template #header>
            <div class="chart-header">
              <el-icon><PieChart /></el-icon>
              <span>课程类型分布</span>
            </div>
          </template>
          <div ref="courseTypeChartRef" style="height: 300px;"></div>
        </el-card>
      </el-col>
      
      <!-- 统计概览 - 数据卡 -->
      <el-col :span="8">
        <el-card shadow="never">
          <template #header>
            <div class="chart-header">
              <el-icon><DataAnalysis /></el-icon>
              <span>统计概览</span>
            </div>
          </template>
          <div class="overview-stats">
            <div class="overview-item">
              <div class="overview-label">已通过率</div>
              <div class="overview-value" style="color: #67C23A;">
                {{ approvalRate }}%
              </div>
            </div>
            <el-divider />
            <div class="overview-item">
              <div class="overview-label">已排课率</div>
              <div class="overview-value" style="color: #0096C2;">
                {{ scheduleRate }}%
              </div>
            </div>
            <el-divider />
            <div class="overview-item">
              <div class="overview-label">平均学生数</div>
              <div class="overview-value" style="color: #E6A23C;">
                {{ stats.studentStats.average }} 人
              </div>
            </div>
            <el-divider />
            <div class="overview-item">
              <div class="overview-label">实验室总数</div>
              <div class="overview-value" style="color: #909399;">
                {{ stats.labUsageData.length }} 个
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
    
    <!-- 图表网格 - 第二行 -->
    <el-row :gutter="20" style="margin-bottom: 20px;">
      <!-- 最近7天申请趋势 - 折线图 -->
      <el-col :span="16">
        <el-card shadow="never">
          <template #header>
            <div class="chart-header">
              <el-icon><TrendCharts /></el-icon>
              <span>最近7天申请趋势</span>
            </div>
          </template>
          <div ref="trendChartRef" style="height: 320px;"></div>
        </el-card>
      </el-col>
      
      <!-- 教师申请排名 - 条形图 -->
      <el-col :span="8">
        <el-card shadow="never">
          <template #header>
            <div class="chart-header">
              <el-icon><Histogram /></el-icon>
              <span>教师申请排名 Top 5</span>
            </div>
          </template>
          <div ref="teacherRankChartRef" style="height: 320px;"></div>
        </el-card>
      </el-col>
    </el-row>
    
    <!-- 图表网格 - 第三行 -->
    <el-row :gutter="20">
      <!-- 实验室使用率 - 柱状图 -->
      <el-col :span="12">
        <el-card shadow="never">
          <template #header>
            <div class="chart-header">
              <el-icon><Histogram /></el-icon>
              <span>实验室使用率 Top 10</span>
            </div>
          </template>
          <div ref="labUsageChartRef" style="height: 350px;"></div>
        </el-card>
      </el-col>
      
      <!-- 时间段热力图 -->
      <el-col :span="12">
        <el-card shadow="never">
          <template #header>
            <div class="chart-header">
              <el-icon><Grid /></el-icon>
              <span>时间段占用热力图（工作日）</span>
            </div>
          </template>
          <div ref="heatmapChartRef" style="height: 350px;"></div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import { 
  Clock, 
  Document, 
  Checked, 
  UserFilled,
  Refresh,
  PieChart,
  DataAnalysis,
  TrendCharts,
  Histogram,
  Grid
} from '@element-plus/icons-vue'
import StatCard from '../components/StatCard.vue'
import { getStatisticsEnhanced } from '../utils/api'

const router = useRouter()
const loading = ref(false)

// 统计数据
const stats = ref({
  basic: {
    pending: 0,
    total: 0,
    scheduled: 0,
    approved: 0,
    rejected: 0,
    conflict: 0
  },
  statusDistribution: [],
  trendData: [],
  labUsageData: [],
  courseTypeDistribution: [],
  studentStats: {
    total: 0,
    average: 0
  },
  timeHeatmap: [],
  teacherRanking: [],
  currentSemester: {
    year: '',
    semester: ''
  }
})

// 图表引用
const statusChartRef = ref(null)
const courseTypeChartRef = ref(null)
const trendChartRef = ref(null)
const labUsageChartRef = ref(null)
const heatmapChartRef = ref(null)
const teacherRankChartRef = ref(null)

// 图表实例
let statusChart = null
let courseTypeChart = null
let trendChart = null
let labUsageChart = null
let heatmapChart = null
let teacherRankChart = null

// 计算属性
const currentSemester = computed(() => {
  return `${stats.value.currentSemester.year} ${stats.value.currentSemester.semester}`
})

const approvalRate = computed(() => {
  const total = stats.value.basic.total
  if (total === 0) return 0
  return Math.round((stats.value.basic.approved / total) * 100)
})

const scheduleRate = computed(() => {
  const approved = stats.value.basic.approved
  if (approved === 0) return 0
  return Math.round((stats.value.basic.scheduled / approved) * 100)
})

// 加载数据
const loadData = async () => {
  loading.value = true
  
  try {
    const res = await getStatisticsEnhanced()
    stats.value = res.data
    
    // 渲染所有图表
    await nextTick()
    renderAllCharts()
  } catch (error) {
    console.error('加载统计数据失败:', error)
    ElMessage.error('加载失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

// 渲染所有图表
const renderAllCharts = () => {
  renderStatusChart()
  renderCourseTypeChart()
  renderTrendChart()
  renderLabUsageChart()
  renderHeatmapChart()
  renderTeacherRankChart()
}

// 1. 申请状态分布饼图
const renderStatusChart = () => {
  if (!statusChartRef.value) return
  
  if (!statusChart) {
    statusChart = echarts.init(statusChartRef.value)
  }
  
  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'center'
    },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: true,
          formatter: '{b}\n{c}'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 16,
            fontWeight: 'bold'
          }
        },
        data: stats.value.statusDistribution,
        color: ['#E6A23C', '#67C23A', '#F56C6C']
      }
    ]
  }
  
  statusChart.setOption(option)
}

// 2. 课程类型分布饼图
const renderCourseTypeChart = () => {
  if (!courseTypeChartRef.value) return
  
  if (!courseTypeChart) {
    courseTypeChart = echarts.init(courseTypeChartRef.value)
  }
  
  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)'
    },
    legend: {
      bottom: 0,
      left: 'center'
    },
    series: [
      {
        type: 'pie',
        radius: '65%',
        center: ['50%', '45%'],
        data: stats.value.courseTypeDistribution,
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        },
        color: ['#0096C2', '#67C23A', '#E6A23C', '#F56C6C', '#909399']
      }
    ]
  }
  
  courseTypeChart.setOption(option)
}

// 3. 最近7天申请趋势折线图
const renderTrendChart = () => {
  if (!trendChartRef.value) return
  
  if (!trendChart) {
    trendChart = echarts.init(trendChartRef.value)
  }
  
  const dates = stats.value.trendData.map(d => d.date)
  const counts = stats.value.trendData.map(d => d.count)
  
  const option = {
    tooltip: {
      trigger: 'axis'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates
    },
    yAxis: {
      type: 'value',
      minInterval: 1
    },
    series: [
      {
        name: '申请数量',
        type: 'line',
        smooth: true,
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(0, 150, 194, 0.3)' },
              { offset: 1, color: 'rgba(0, 150, 194, 0.05)' }
            ]
          }
        },
        lineStyle: {
          width: 3,
          color: '#0096C2'
        },
        itemStyle: {
          color: '#0096C2'
        },
        data: counts
      }
    ]
  }
  
  trendChart.setOption(option)
}

// 4. 实验室使用率柱状图
const renderLabUsageChart = () => {
  if (!labUsageChartRef.value) return
  
  if (!labUsageChart) {
    labUsageChart = echarts.init(labUsageChartRef.value)
  }
  
  const labNames = stats.value.labUsageData.map(d => d.name)
  const usageCounts = stats.value.labUsageData.map(d => d.value)
  
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      formatter: (params) => {
        const data = stats.value.labUsageData[params[0].dataIndex]
        return `${params[0].name}<br/>使用次数: ${params[0].value}<br/>容量: ${data.capacity}人`
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: labNames,
      axisLabel: {
        interval: 0,
        rotate: 30,
        fontSize: 11
      }
    },
    yAxis: {
      type: 'value',
      minInterval: 1
    },
    series: [
      {
        name: '使用次数',
        type: 'bar',
        data: usageCounts,
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: '#0096C2' },
              { offset: 1, color: '#33AAD1' }
            ]
          },
          borderRadius: [4, 4, 0, 0]
        },
        emphasis: {
          itemStyle: {
            color: '#007399'
          }
        }
      }
    ]
  }
  
  labUsageChart.setOption(option)
}

// 5. 时间段热力图
const renderHeatmapChart = () => {
  if (!heatmapChartRef.value) return
  
  if (!heatmapChart) {
    heatmapChart = echarts.init(heatmapChartRef.value)
  }
  
  const weekdays = ['周一', '周二', '周三', '周四', '周五']
  const periods = Array.from({ length: 12 }, (_, i) => `第${i + 1}节`)
  
  const heatmapData = stats.value.timeHeatmap.map(item => [
    item.weekday - 1,
    item.period - 1,
    item.count
  ])
  
  const maxCount = Math.max(...heatmapData.map(d => d[2]), 1)
  
  const option = {
    tooltip: {
      position: 'top',
      formatter: (params) => {
        return `${weekdays[params.data[0]]} ${periods[params.data[1]]}<br/>占用: ${params.data[2]} 次`
      }
    },
    grid: {
      height: '70%',
      top: '5%',
      left: '8%',
      right: '3%'
    },
    xAxis: {
      type: 'category',
      data: weekdays,
      splitArea: {
        show: true
      }
    },
    yAxis: {
      type: 'category',
      data: periods,
      splitArea: {
        show: true
      },
      axisLabel: {
        fontSize: 11
      }
    },
    visualMap: {
      min: 0,
      max: maxCount,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: '0%',
      inRange: {
        color: ['#e6f4ff', '#0096C2', '#007399']
      }
    },
    series: [
      {
        type: 'heatmap',
        data: heatmapData,
        label: {
          show: true,
          fontSize: 10
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }
    ]
  }
  
  heatmapChart.setOption(option)
}

// 6. 教师申请排名条形图
const renderTeacherRankChart = () => {
  if (!teacherRankChartRef.value) return
  
  if (!teacherRankChart) {
    teacherRankChart = echarts.init(teacherRankChartRef.value)
  }
  
  const topTeachers = stats.value.teacherRanking.slice(0, 5)
  const teacherNames = topTeachers.map(d => d.name)
  const teacherCounts = topTeachers.map(d => d.value)
  
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    grid: {
      left: '15%',
      right: '4%',
      bottom: '3%',
      top: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      minInterval: 1
    },
    yAxis: {
      type: 'category',
      data: teacherNames,
      axisLabel: {
        fontSize: 12
      }
    },
    series: [
      {
        name: '申请数量',
        type: 'bar',
        data: teacherCounts,
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 1,
            y2: 0,
            colorStops: [
              { offset: 0, color: '#67C23A' },
              { offset: 1, color: '#85CE61' }
            ]
          },
          borderRadius: [0, 4, 4, 0]
        },
        label: {
          show: true,
          position: 'right',
          formatter: '{c} 次'
        }
      }
    ]
  }
  
  teacherRankChart.setOption(option)
}

// 跳转
const goToReview = () => {
  router.push('/review')
}

const goToResult = () => {
  router.push('/result')
}

// 窗口大小变化时重新渲染
const handleResize = () => {
  statusChart?.resize()
  courseTypeChart?.resize()
  trendChart?.resize()
  labUsageChart?.resize()
  heatmapChart?.resize()
  teacherRankChart?.resize()
}

onMounted(() => {
  loadData()
  window.addEventListener('resize', handleResize)
})

// 组件卸载时销毁图表
import { onBeforeUnmount } from 'vue'

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  statusChart?.dispose()
  courseTypeChart?.dispose()
  trendChart?.dispose()
  labUsageChart?.dispose()
  heatmapChart?.dispose()
  teacherRankChart?.dispose()
})
</script>

<style scoped>
.page-container {
  padding: 20px;
}

.el-page-header {
  margin-bottom: 20px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 20px;
}

.chart-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: bold;
  font-size: 14px;
}

.overview-stats {
  padding: 10px 0;
}

.overview-item {
  text-align: center;
  padding: 15px 0;
}

.overview-label {
  font-size: 13px;
  color: #909399;
  margin-bottom: 8px;
}

.overview-value {
  font-size: 32px;
  font-weight: bold;
}

@media (max-width: 1400px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
