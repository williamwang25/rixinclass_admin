// 云函数：公告管理（增删改）
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const { action, data: noticeData } = event
    
    console.log('[manageNotice] 操作:', action, noticeData)
    
    if (!action) {
      return {
        success: false,
        message: '缺少操作类型参数'
      }
    }
    
    switch (action) {
      case 'create':
        return await createNotice(noticeData)
      case 'update':
        return await updateNotice(noticeData)
      case 'delete':
        return await deleteNotice(noticeData)
      default:
        return {
          success: false,
          message: '不支持的操作类型'
        }
    }
  } catch (error) {
    console.error('[manageNotice] 失败:', error)
    return {
      success: false,
      message: error.message
    }
  }
}

// 创建公告
async function createNotice(data) {
  const { title, content, noticeType, priority, targetUserId } = data
  
  if (!title || !content) {
    return {
      success: false,
      message: '缺少必填字段：标题、内容'
    }
  }
  
  const noticeId = Date.now()
  
  await db.collection('notice').add({
    data: {
      notice_id: noticeId,
      title,
      content,
      notice_type: noticeType || '系统公告',
      priority: priority || 0,
      target_user_id: targetUserId || null,
      booking_id: null,
      sender_id: null,
      is_read: 0,
      is_deleted: 0,
      create_time: new Date(),
      create_user: null,
      update_time: new Date(),
      update_user: null
    }
  })
  
  console.log('[createNotice] 创建成功, noticeId:', noticeId)
  
  return {
    success: true,
    message: '公告创建成功'
  }
}

// 更新公告
async function updateNotice(data) {
  const { noticeId, title, content, noticeType, priority, targetUserId } = data
  
  if (!noticeId) {
    return {
      success: false,
      message: '缺少公告ID'
    }
  }
  
  const updateData = {
    update_time: new Date()
  }
  
  if (title !== undefined) updateData.title = title
  if (content !== undefined) updateData.content = content
  if (noticeType !== undefined) updateData.notice_type = noticeType
  if (priority !== undefined) updateData.priority = priority
  if (targetUserId !== undefined) updateData.target_user_id = targetUserId
  
  const result = await db.collection('notice')
    .where({ notice_id: noticeId })
    .update({
      data: updateData
    })
  
  if (result.stats.updated === 0) {
    return {
      success: false,
      message: '公告不存在'
    }
  }
  
  return {
    success: true,
    message: '公告更新成功'
  }
}

// 删除公告
async function deleteNotice(data) {
  const { noticeId } = data
  
  if (!noticeId) {
    return {
      success: false,
      message: '缺少公告ID'
    }
  }
  
  const result = await db.collection('notice')
    .where({ notice_id: noticeId })
    .update({
      data: {
        is_deleted: 1,
        update_time: new Date()
      }
    })
  
  if (result.stats.updated === 0) {
    return {
      success: false,
      message: '公告不存在'
    }
  }
  
  return {
    success: true,
    message: '公告删除成功'
  }
}

