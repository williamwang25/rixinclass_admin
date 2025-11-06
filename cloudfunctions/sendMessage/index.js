// 云函数：发送消息
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const { targetUserId, bookingId, messageType, content, senderId } = event
    
    console.log('[sendMessage] 发送消息:', { targetUserId, bookingId, messageType })
    
    // 验证参数
    if (!targetUserId || !content) {
      return {
        success: false,
        message: '缺少必填参数：目标用户、消息内容'
      }
    }
    
    const messageId = Date.now()
    
    // 插入消息记录
    await db.collection('message').add({
      data: {
        message_id: messageId,
        sender_id: senderId || null,
        sender_type: senderId ? 1 : 0,  // 0=系统，1=管理员
        receiver_id: targetUserId,
        booking_id: bookingId || null,
        message_type: messageType || '普通消息',
        content,
        is_read: 0,
        is_deleted: 0,
        create_time: new Date(),
        create_user: senderId,
        update_time: new Date(),
        update_user: null
      }
    })
    
    console.log('[sendMessage] 发送成功, messageId:', messageId)
    
    return {
      success: true,
      message: '消息发送成功'
    }
  } catch (error) {
    console.error('[sendMessage] 失败:', error)
    return {
      success: false,
      message: error.message
    }
  }
}

