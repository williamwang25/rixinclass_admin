// 云函数：获取统计数据
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  try {
    console.log('[getStatistics] 开始获取统计数据')
    
    // 获取当前学期（简化版，实际应从配置表获取）
    const currentYear = '2025-2026'
    const currentSemester = '第一学期'
    
    // 1. 待审核数量
    const { total: pending } = await db.collection('booking')
      .where({
        status: 0,
        is_deleted: 0
      })
      .count()
    
    // 2. 本学期申请总数
    const { total } = await db.collection('booking')
      .where({
        academic_year: currentYear,
        semester: currentSemester,
        is_deleted: 0
      })
      .count()
    
    // 3. 已排课数量
    const { total: scheduled } = await db.collection('booking')
      .where({
        status: 1,
        is_scheduled: 1,
        is_deleted: 0
      })
      .count()
    
    // 4. 冲突数量（MVP版本暂为0，实际应查询 schedule_conflict 表）
    const conflict = 0
    
    console.log('[getStatistics] 统计完成:', { pending, total, scheduled, conflict })
    
    return {
      success: true,
      data: {
        pending,
        total,
        scheduled,
        conflict
      }
    }
  } catch (error) {
    console.error('[getStatistics] 失败:', error)
    return {
      success: false,
      message: error.message
    }
  }
}

