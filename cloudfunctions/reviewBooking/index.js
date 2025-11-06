// 云函数：审核申请
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const { bookingId, action, remark } = event
    
    console.log('[reviewBooking] 审核参数:', { bookingId, action, remark })
    
    // 参数验证
    if (!bookingId || !action) {
      return {
        success: false,
        message: '缺少必填参数'
      }
    }
    
    if (action === 'reject' && !remark) {
      return {
        success: false,
        message: '拒绝时必须填写理由'
      }
    }
    
    // 更新申请状态
    const updateData = {
      status: action === 'approve' ? 1 : 2,
      review_time: new Date(),
      review_remark: remark || null,
      update_time: new Date()
    }
    
    // 如果是审核通过，初始化 is_scheduled 字段为 0（未排课）
    if (action === 'approve') {
      updateData.is_scheduled = 0
    }
    
    const result = await db.collection('booking')
      .where({ booking_id: bookingId })
      .update({
        data: updateData
      })
    
    console.log('[reviewBooking] 更新结果:', result)
    
    if (result.stats.updated === 0) {
      return {
        success: false,
        message: '未找到对应的申请记录'
      }
    }
    
    // 如果是拒绝操作，自动发送消息通知教师
    if (action === 'reject') {
      // 查询申请详情获取用户ID和申请编号
      const { data: bookings } = await db.collection('booking')
        .where({ booking_id: bookingId })
        .get()
      
      if (bookings.length > 0) {
        const booking = bookings[0]
        
        await db.collection('message').add({
          data: {
            message_id: Date.now(),
            sender_id: null,
            sender_type: 0,  // 系统消息
            receiver_id: booking.user_id,
            booking_id: bookingId,
            message_type: '审核结果',
            content: `您的申请 ${booking.booking_no} 已被拒绝。\n拒绝原因：${remark}`,
            is_read: 0,
            is_deleted: 0,
            create_time: new Date(),
            create_user: null,
            update_time: new Date(),
            update_user: null
          }
        })
        
        console.log('[reviewBooking] 已发送拒绝通知')
      }
    }
    
    return {
      success: true,
      message: action === 'approve' ? '审核通过' : '已拒绝'
    }
  } catch (error) {
    console.error('[reviewBooking] 失败:', error)
    return {
      success: false,
      message: error.message
    }
  }
}

