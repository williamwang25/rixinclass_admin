// 云函数：创建排课日志
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

/**
 * 验证必填参数
 * @param {Object} params - 参数对象
 * @returns {Object} 验证结果
 */
function validateRequiredParams(params) {
  const { bookingId, adminUserId, actionType, actionResult } = params
  
  const requiredFields = [
    { field: 'bookingId', value: bookingId, name: '申请ID' },
    { field: 'adminUserId', value: adminUserId, name: '管理员ID' },
    { field: 'actionType', value: actionType, name: '操作类型' },
    { field: 'actionResult', value: actionResult, name: '操作结果' }
  ]
  
  const missingFields = requiredFields.filter(item => !item.value)
  
  if (missingFields.length > 0) {
    return {
      valid: false,
      message: `缺少必填参数: ${missingFields.map(item => item.name).join(', ')}`
    }
  }
  
  // 验证枚举值
  if (!['auto_schedule', 'manual_schedule', 'history_schedule'].includes(actionType)) {
    return {
      valid: false,
      message: '操作类型必须为 auto_schedule、manual_schedule 或 history_schedule'
    }
  }
  
  if (!['success', 'failure'].includes(actionResult)) {
    return {
      valid: false,
      message: '操作结果必须为 success 或 failure'
    }
  }
  
  return { valid: true }
}

/**
 * 构建日志数据对象
 * @param {Object} params - 输入参数
 * @param {number} logId - 日志ID
 * @returns {Object} 日志数据对象
 */
function buildLogData(params, logId) {
  const {
    bookingId,
    bookingNo,
    adminUserId,
    adminName,
    actionType,
    actionResult,
    labId,
    labName,
    building,
    labRoom,
    studentCount,
    labCapacity,
    softwareRequirements,
    matchedSoftware,
    matchReason,
    failureReason,
    timeSlots,
    courseName,
    teacherName,
    academicYear,
    semester
  } = params
  
  return {
    log_id: logId,
    booking_id: bookingId,
    booking_no: bookingNo || '',
    admin_user_id: adminUserId,
    admin_name: adminName || '',
    action_type: actionType,
    action_result: actionResult,
    lab_id: labId || null,
    lab_name: labName || null,
    building: building || null,
    lab_room: labRoom || null,
    student_count: studentCount || 0,
    lab_capacity: labCapacity || null,
    software_requirements: softwareRequirements || '',
    matched_software: matchedSoftware || null,
    match_reason: matchReason || null,
    failure_reason: failureReason || null,
    time_slots: timeSlots || [],
    course_name: courseName || '',
    teacher_name: teacherName || '',
    academic_year: academicYear || '',
    semester: semester || '',
    create_time: new Date(),
    create_user: adminUserId,
    update_time: new Date(),
    update_user: null,
    is_deleted: 0
  }
}

exports.main = async (event, context) => {
  const startTime = Date.now()
  
  try {
    console.log('[createScheduleLog] 开始创建排课日志:', {
      bookingId: event.bookingId,
      actionType: event.actionType,
      actionResult: event.actionResult,
      requestId: context.requestId
    })
    
    // 1. 参数验证
    const validation = validateRequiredParams(event)
    if (!validation.valid) {
      console.error('[createScheduleLog] 参数验证失败:', validation.message)
      return {
        success: false,
        message: validation.message,
        requestId: context.requestId
      }
    }
    
    // 2. 生成日志ID
    const logId = Date.now() + Math.floor(Math.random() * 1000)
    
    // 3. 构建日志数据
    const logData = buildLogData(event, logId)
    
    // 4. 插入日志记录
    const result = await db.collection('schedulelog').add({
      data: logData
    })
    
    const duration = Date.now() - startTime
    console.log('[createScheduleLog] 排课日志创建成功:', {
      logId,
      docId: result._id,
      duration: `${duration}ms`,
      requestId: context.requestId
    })
    
    return {
      success: true,
      message: '排课日志创建成功',
      data: {
        logId,
        docId: result._id
      },
      requestId: context.requestId
    }
    
  } catch (error) {
    const duration = Date.now() - startTime
    console.error('[createScheduleLog] 执行失败:', {
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
