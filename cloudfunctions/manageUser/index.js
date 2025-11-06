// 云函数：用户管理操作
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const { action, data: userData } = event
    
    console.log('[manageUser] 操作:', action, userData)
    
    if (!action) {
      return {
        success: false,
        message: '缺少操作类型参数'
      }
    }
    
    switch (action) {
      case 'update':
        return await updateUser(userData)
      case 'updateStatus':
        return await updateUserStatus(userData)
      case 'delete':
        return await deleteUser(userData)
      default:
        return {
          success: false,
          message: '不支持的操作类型'
        }
    }
  } catch (error) {
    console.error('[manageUser] 失败:', error)
    return {
      success: false,
      message: error.message
    }
  }
}

// 更新用户信息
async function updateUser(userData) {
  const { userId, name, phone, email, userType } = userData
  
  if (!userId) {
    return {
      success: false,
      message: '缺少用户ID'
    }
  }
  
  const updateData = {
    updated_at: new Date()
  }
  
  if (name !== undefined) updateData.name = name
  if (phone !== undefined) updateData.phone = phone
  if (email !== undefined) updateData.email = email
  if (userType !== undefined) updateData.user_type = userType
  
  const result = await db.collection('rx_user')
    .where({ user_id: userId })
    .update({
      data: updateData
    })
  
  if (result.stats.updated === 0) {
    return {
      success: false,
      message: '用户不存在'
    }
  }
  
  console.log('[updateUser] 更新成功, userId:', userId)
  
  return {
    success: true,
    message: '用户信息更新成功'
  }
}

// 更新用户状态
async function updateUserStatus(userData) {
  const { userId, status } = userData
  
  if (!userId || status === undefined) {
    return {
      success: false,
      message: '缺少必填参数'
    }
  }
  
  const result = await db.collection('rx_user')
    .where({ user_id: userId })
    .update({
      data: {
        status,
        updated_at: new Date()
      }
    })
  
  if (result.stats.updated === 0) {
    return {
      success: false,
      message: '用户不存在'
    }
  }
  
  console.log('[updateUserStatus] 状态更新成功, userId:', userId, 'status:', status)
  
  return {
    success: true,
    message: status === 1 ? '用户已启用' : '用户已禁用'
  }
}

// 删除用户（软删除）
async function deleteUser(userData) {
  const { userId } = userData
  
  if (!userId) {
    return {
      success: false,
      message: '缺少用户ID'
    }
  }
  
  const result = await db.collection('rx_user')
    .where({ user_id: userId })
    .update({
      data: {
        is_deleted: 1,
        updated_at: new Date()
      }
    })
  
  if (result.stats.updated === 0) {
    return {
      success: false,
      message: '用户不存在'
    }
  }
  
  console.log('[deleteUser] 删除成功, userId:', userId)
  
  return {
    success: true,
    message: '用户删除成功'
  }
}

