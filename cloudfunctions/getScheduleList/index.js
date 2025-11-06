// 云函数：获取排课结果列表
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const { academicYear, semester } = event
    
    console.log('[getScheduleList] 查询参数:', { academicYear, semester })
    
    // 构建查询条件
    const where = { is_deleted: 0 }
    if (academicYear) {
      where.academic_year = academicYear
    }
    if (semester) {
      where.semester = semester
    }
    
    // 查询排课结果
    const { data } = await db.collection('schedule')
      .where(where)
      .orderBy('create_time', 'desc')
      .limit(1000)
      .get()
    
    console.log('[getScheduleList] 查询完成:', { count: data.length })
    
    return {
      success: true,
      data
    }
  } catch (error) {
    console.error('[getScheduleList] 失败:', error)
    return {
      success: false,
      message: error.message
    }
  }
}

