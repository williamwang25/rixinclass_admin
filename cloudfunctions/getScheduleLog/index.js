// 云函数：获取排课日志列表
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

/**
 * 验证分页参数
 * @param {number} pageNum - 页码
 * @param {number} pageSize - 每页数量
 * @returns {Object} 验证结果
 */
function validatePaginationParams(pageNum, pageSize) {
  const errors = []
  
  if (pageNum < 1) {
    errors.push('页码必须大于0')
  }
  
  if (pageSize < 1 || pageSize > 100) {
    errors.push('每页数量必须在1-100之间')
  }
  
  return {
    valid: errors.length === 0,
    message: errors.join(', ')
  }
}

/**
 * 构建查询条件
 * @param {Object} params - 查询参数
 * @returns {Object} 查询条件对象
 */
function buildWhereCondition(params) {
  const { actionType, actionResult, adminUserId, startDate, endDate } = params
  const where = { is_deleted: 0 }
  
  // 操作类型筛选
  if (actionType && ['auto_schedule', 'manual_schedule'].includes(actionType)) {
    where.action_type = actionType
  }
  
  // 操作结果筛选
  if (actionResult && ['success', 'failure'].includes(actionResult)) {
    where.action_result = actionResult
  }
  
  // 管理员筛选
  if (adminUserId && typeof adminUserId === 'number') {
    where.admin_user_id = adminUserId
  }
  
  // 时间范围筛选
  if (startDate || endDate) {
    where.create_time = {}
    
    if (startDate) {
      try {
        where.create_time[_.gte] = new Date(startDate)
      } catch (error) {
        console.warn('[buildWhereCondition] 开始日期格式错误:', startDate)
      }
    }
    
    if (endDate) {
      try {
        // 结束日期设置为当天的23:59:59
        const endDateTime = new Date(endDate)
        endDateTime.setHours(23, 59, 59, 999)
        where.create_time[_.lte] = endDateTime
      } catch (error) {
        console.warn('[buildWhereCondition] 结束日期格式错误:', endDate)
      }
    }
  }
  
  return where
}

/**
 * 查询日志数据
 * @param {Object} where - 查询条件
 * @param {number} skip - 跳过记录数
 * @param {number} pageSize - 每页数量
 * @returns {Promise<Object>} 查询结果
 */
async function queryScheduleLogs(where, skip, pageSize) {
  // 并行执行数据查询和总数统计
  const [dataResult, countResult] = await Promise.all([
    db.collection('schedulelog')
      .where(where)
      .orderBy('create_time', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get(),
    db.collection('schedulelog')
      .where(where)
      .count()
  ])
  
  return {
    data: dataResult.data,
    total: countResult.total
  }
}

exports.main = async (event, context) => {
  const startTime = Date.now()
  
  try {
    // 解析参数并设置默认值
    const {
      actionType,
      actionResult,
      adminUserId,
      startDate,
      endDate,
      pageSize = 20,
      pageNum = 1,
      bookingId  // 支持按申请ID查询
    } = event
    
    console.log('[getScheduleLog] 开始查询排课日志:', {
      actionType,
      actionResult,
      adminUserId,
      startDate,
      endDate,
      pageSize,
      pageNum,
      bookingId,
      requestId: context.requestId
    })
    
    // 1. 参数验证
    const validation = validatePaginationParams(pageNum, pageSize)
    if (!validation.valid) {
      console.error('[getScheduleLog] 分页参数验证失败:', validation.message)
      return {
        success: false,
        message: validation.message,
        requestId: context.requestId
      }
    }
    
    // 2. 构建查询条件
    const where = buildWhereCondition({ actionType, actionResult, adminUserId, startDate, endDate })
    
    // 如果指定了申请ID，添加到查询条件
    if (bookingId) {
      where.booking_id = bookingId
    }
    
    // 3. 计算跳过的记录数
    const skip = (pageNum - 1) * pageSize
    
    // 4. 查询数据
    const { data, total } = await queryScheduleLogs(where, skip, pageSize)
    
    const duration = Date.now() - startTime
    const totalPages = Math.ceil(total / pageSize)
    
    console.log('[getScheduleLog] 查询完成:', {
      total,
      count: data.length,
      pageNum,
      pageSize,
      totalPages,
      duration: `${duration}ms`,
      requestId: context.requestId
    })
    
    return {
      success: true,
      data,
      total,
      pageNum,
      pageSize,
      totalPages,
      requestId: context.requestId
    }
    
  } catch (error) {
    const duration = Date.now() - startTime
    console.error('[getScheduleLog] 执行失败:', {
      error: error.message,
      stack: error.stack,
      event,
      duration: `${duration}ms`,
      requestId: context.requestId
    })
    
    return {
      success: false,
      message: error.message,
      requestId: context.requestId
    }
  }
}
