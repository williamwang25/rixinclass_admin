// 云函数：获取用户列表
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const { userType, status, pageSize = 100 } = event
    
    console.log('[getUserList] 查询参数:', { userType, status, pageSize })
    
    // 构建查询条件
    const where = { is_deleted: 0 }
    
    if (userType !== undefined && userType !== null && userType !== '') {
      where.user_type = userType
    }
    
    if (status !== undefined && status !== null && status !== '') {
      where.status = status
    }
    
    // 查询用户列表
    const { data } = await db.collection('rx_user')
      .where(where)
      .orderBy('created_at', 'desc')
      .limit(pageSize)
      .get()
    
    // 查询总数
    const { total } = await db.collection('rx_user')
      .where(where)
      .count()
    
    console.log('[getUserList] 查询完成:', { total, count: data.length })
    
    return {
      success: true,
      data,
      total
    }
  } catch (error) {
    console.error('[getUserList] 失败:', error)
    return {
      success: false,
      message: error.message
    }
  }
}

