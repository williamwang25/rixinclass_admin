// 云函数：获取实验室列表
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const { status } = event
    
    console.log('[getLabList] 查询参数:', { status })
    
    // 构建查询条件
    const where = { is_deleted: 0 }
    if (status !== undefined && status !== null && status !== '') {
      where.status = status
    }
    
    // 查询实验室列表
    const { data } = await db.collection('labs')
      .where(where)
      .orderBy('building', 'asc')
      .orderBy('floor', 'asc')
      .orderBy('lab_room', 'asc')
      .limit(1000)
      .get()
    
    console.log('[getLabList] 查询完成:', { count: data.length })
    
    return {
      success: true,
      data
    }
  } catch (error) {
    console.error('[getLabList] 失败:', error)
    return {
      success: false,
      message: error.message
    }
  }
}

