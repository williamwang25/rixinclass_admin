// 云函数：实验室管理操作（增删改）
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const { action, data: labData } = event
    
    console.log('[manageLabOperation] 操作:', action, labData)
    
    if (!action) {
      return {
        success: false,
        message: '缺少操作类型参数'
      }
    }
    
    switch (action) {
      case 'create':
        return await createLab(labData)
      case 'update':
        return await updateLab(labData)
      case 'delete':
        return await deleteLab(labData)
      default:
        return {
          success: false,
          message: '不支持的操作类型'
        }
    }
  } catch (error) {
    console.error('[manageLabOperation] 失败:', error)
    return {
      success: false,
      message: error.message
    }
  }
}

// 创建实验室
async function createLab(labData) {
  const { labRoom, labName, building, floor, capacity, softwareEnv, hardwareEnv, supportNotes, labAdmin } = labData
  
  // 验证必填字段
  if (!labRoom || !labName || !building || !capacity) {
    return {
      success: false,
      message: '缺少必填字段：房间号、实验室名称、楼栋、容量'
    }
  }
  
  // 生成 lab_id
  const labId = Date.now()
  
  await db.collection('labs').add({
    data: {
      lab_id: labId,
      lab_room: labRoom,
      lab_name: labName,
      building,
      floor: floor || 1,
      capacity,
      software_env: softwareEnv || {},
      hardware_env: hardwareEnv || '',
      support_notes: supportNotes || '',
      lab_admin: labAdmin || '',
      status: 1,  // 默认正常
      is_deleted: 0,
      create_time: new Date(),
      update_time: new Date()
    }
  })
  
  console.log('[createLab] 创建成功, labId:', labId)
  
  return {
    success: true,
    message: '实验室创建成功',
    data: { labId }
  }
}

// 更新实验室
async function updateLab(labData) {
  const { labId, labRoom, labName, building, floor, capacity, softwareEnv, hardwareEnv, supportNotes, labAdmin, status } = labData
  
  if (!labId) {
    return {
      success: false,
      message: '缺少实验室ID'
    }
  }
  
  const updateData = {
    update_time: new Date()
  }
  
  if (labRoom !== undefined) updateData.lab_room = labRoom
  if (labName !== undefined) updateData.lab_name = labName
  if (building !== undefined) updateData.building = building
  if (floor !== undefined) updateData.floor = floor
  if (capacity !== undefined) updateData.capacity = capacity
  if (softwareEnv !== undefined) updateData.software_env = softwareEnv
  if (hardwareEnv !== undefined) updateData.hardware_env = hardwareEnv
  if (supportNotes !== undefined) updateData.support_notes = supportNotes
  if (labAdmin !== undefined) updateData.lab_admin = labAdmin
  if (status !== undefined) updateData.status = status
  
  const result = await db.collection('labs')
    .where({ lab_id: labId })
    .update({
      data: updateData
    })
  
  if (result.stats.updated === 0) {
    return {
      success: false,
      message: '实验室不存在'
    }
  }
  
  console.log('[updateLab] 更新成功, labId:', labId)
  
  return {
    success: true,
    message: '实验室更新成功'
  }
}

// 删除实验室（软删除）
async function deleteLab(labData) {
  const { labId } = labData
  
  if (!labId) {
    return {
      success: false,
      message: '缺少实验室ID'
    }
  }
  
  const result = await db.collection('labs')
    .where({ lab_id: labId })
    .update({
      data: {
        is_deleted: 1,
        update_time: new Date()
      }
    })
  
  if (result.stats.updated === 0) {
    return {
      success: false,
      message: '实验室不存在'
    }
  }
  
  console.log('[deleteLab] 删除成功, labId:', labId)
  
  return {
    success: true,
    message: '实验室删除成功'
  }
}

