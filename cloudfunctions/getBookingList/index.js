// 云函数：获取申请列表
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  try {
    const { status, pageSize = 100 } = event
    
    console.log('[getBookingList] 查询参数:', { status, pageSize })
    
    // 构建查询条件
    const where = { is_deleted: 0 }
    if (status !== undefined && status !== null && status !== '') {
      where.status = status
    }
    
    // 查询申请列表
    const { data } = await db.collection('booking')
      .where(where)
      .orderBy('create_time', 'desc')
      .limit(pageSize)
      .get()
    
    // 查询总数
    const { total } = await db.collection('booking')
      .where(where)
      .count()
    
    console.log('[getBookingList] 查询完成:', { total, count: data.length })
    
    return {
      success: true,
      data,
      total
    }
  } catch (error) {
    console.error('[getBookingList] 失败:', error)
    return {
      success: false,
      message: error.message
    }
  }
}

