// 云函数：获取增强统计数据
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  try {
    console.log('[getStatisticsEnhanced] 开始获取详细统计数据')
    
    // 获取当前学期
    const currentYear = '2025-2026'
    const currentSemester = '第一学期'
    
    // 获取最近7天的日期
    const last7Days = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      last7Days.push(date.toISOString().split('T')[0])
    }
    
    // ===== 1. 基础统计 =====
    const [
      pendingResult,
      totalResult,
      scheduledResult,
      approvedResult,
      rejectedResult
    ] = await Promise.all([
      // 待审核数量
      db.collection('booking').where({ status: 0, is_deleted: 0 }).count(),
      // 本学期申请总数
      db.collection('booking').where({ 
        academic_year: currentYear, 
        semester: currentSemester, 
        is_deleted: 0 
      }).count(),
      // 已排课数量
      db.collection('booking').where({ status: 1, is_scheduled: 1, is_deleted: 0 }).count(),
      // 已通过数量
      db.collection('booking').where({ status: 1, is_deleted: 0 }).count(),
      // 已拒绝数量
      db.collection('booking').where({ status: 2, is_deleted: 0 }).count()
    ])
    
    const basicStats = {
      pending: pendingResult.total,
      total: totalResult.total,
      scheduled: scheduledResult.total,
      approved: approvedResult.total,
      rejected: rejectedResult.total,
      conflict: 0  // MVP暂为0
    }
    
    // ===== 2. 申请状态分布（饼图数据） =====
    const statusDistribution = [
      { name: '待审核', value: basicStats.pending },
      { name: '已通过', value: basicStats.approved },
      { name: '已拒绝', value: basicStats.rejected }
    ]
    
    // ===== 3. 最近7天申请趋势（折线图数据） =====
    const trendData = await Promise.all(
      last7Days.map(async (date) => {
        const startDate = new Date(date)
        startDate.setHours(0, 0, 0, 0)
        const endDate = new Date(date)
        endDate.setHours(23, 59, 59, 999)
        
        const { total } = await db.collection('booking')
          .where({
            create_time: _.gte(startDate).and(_.lte(endDate)),
            is_deleted: 0
          })
          .count()
        
        return {
          date: date.substring(5),  // MM-DD
          count: total
        }
      })
    )
    
    // ===== 4. 实验室使用率（柱状图数据） =====
    const { data: labs } = await db.collection('labs')
      .where({ status: 1, is_deleted: 0 })
      .get()
    
    const labUsageData = await Promise.all(
      labs.slice(0, 10).map(async (lab) => {
        const { total } = await db.collection('schedule')
          .where({ lab_id: lab.lab_id, is_deleted: 0 })
          .count()
        
        return {
          name: `${lab.building} ${lab.lab_room}`,
          value: total,
          capacity: lab.capacity
        }
      })
    )
    
    // 按使用次数排序
    labUsageData.sort((a, b) => b.value - a.value)
    
    // ===== 5. 课程类型分布（饼图数据） =====
    const { data: bookings } = await db.collection('booking')
      .where({
        academic_year: currentYear,
        semester: currentSemester,
        is_deleted: 0
      })
      .get()
    
    const courseTypeMap = new Map()
    bookings.forEach(b => {
      const type = b.course_type || '实验教学'
      courseTypeMap.set(type, (courseTypeMap.get(type) || 0) + 1)
    })
    
    const courseTypeDistribution = Array.from(courseTypeMap.entries()).map(([name, value]) => ({
      name,
      value
    }))
    
    // ===== 6. 学生人数统计 =====
    const totalStudents = bookings.reduce((sum, b) => sum + (b.student_count || 0), 0)
    const avgStudents = bookings.length > 0 ? Math.round(totalStudents / bookings.length) : 0
    
    // ===== 7. 时间段分布（热力图数据） =====
    const { data: schedules } = await db.collection('schedule')
      .where({
        academic_year: currentYear,
        semester: currentSemester,
        is_deleted: 0
      })
      .get()
    
    const timeHeatmap = []
    for (let weekday = 1; weekday <= 5; weekday++) {
      for (let period = 1; period <= 12; period++) {
        const count = schedules.filter(s => 
          s.weekday === weekday && 
          s.period_start <= period && 
          s.period_end >= period
        ).length
        
        timeHeatmap.push({
          weekday,
          period,
          count
        })
      }
    }
    
    // ===== 8. 教师申请排名（Top 10） =====
    const teacherMap = new Map()
    bookings.forEach(b => {
      const teacher = b.teacher_name || '未知'
      teacherMap.set(teacher, (teacherMap.get(teacher) || 0) + 1)
    })
    
    const teacherRanking = Array.from(teacherMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
    
    console.log('[getStatisticsEnhanced] 统计完成')
    
    return {
      success: true,
      data: {
        basic: basicStats,
        statusDistribution,
        trendData,
        labUsageData,
        courseTypeDistribution,
        studentStats: {
          total: totalStudents,
          average: avgStudents
        },
        timeHeatmap,
        teacherRanking,
        currentSemester: {
          year: currentYear,
          semester: currentSemester
        }
      }
    }
  } catch (error) {
    console.error('[getStatisticsEnhanced] 失败:', error)
    return {
      success: false,
      message: error.message
    }
  }
}

