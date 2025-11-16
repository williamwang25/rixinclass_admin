// 云函数：获取排课草稿列表
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const { bookingId } = event
    
    console.log('[getScheduleDraft] 查询参数:', { bookingId })
    
    // 参数验证
    if (!bookingId) {
      return {
        success: false,
        message: '缺少必填参数 bookingId'
      }
    }
    
    // 查询草稿表中的排课结果
    const { data } = await db.collection('schedule_draft')
      .where({ 
        booking_id: bookingId,
        is_deleted: 0
      })
      .orderBy('create_time', 'desc')
      .get()
    
    console.log('[getScheduleDraft] 查询完成:', { count: data.length })
    
    return {
      success: true,
      data
    }
  } catch (error) {
    console.error('[getScheduleDraft] 失败:', error)
    return {
      success: false,
      message: error.message
    }
  }
}
