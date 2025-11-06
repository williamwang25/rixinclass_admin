// 云函数：轮播图管理（增删改）
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const { action, data: carouselData } = event
    
    console.log('[manageCarousel] 操作:', action, carouselData)
    
    if (!action) {
      return {
        success: false,
        message: '缺少操作类型参数'
      }
    }
    
    switch (action) {
      case 'create':
        return await createCarousel(carouselData)
      case 'update':
        return await updateCarousel(carouselData)
      case 'delete':
        return await deleteCarousel(carouselData)
      default:
        return {
          success: false,
          message: '不支持的操作类型'
        }
    }
  } catch (error) {
    console.error('[manageCarousel] 失败:', error)
    return {
      success: false,
      message: error.message
    }
  }
}

// 创建轮播图
async function createCarousel(data) {
  const { title, imageUrl, linkUrl, sortOrder } = data
  
  if (!title || !imageUrl) {
    return {
      success: false,
      message: '缺少必填字段：标题、图片地址'
    }
  }
  
  const carouselId = Date.now()
  
  await db.collection('carousel').add({
    data: {
      carousel_id: carouselId,
      title,
      image_url: imageUrl,
      link_url: linkUrl || '',
      sort_order: sortOrder || 0,
      status: 1,
      is_deleted: 0,
      create_time: new Date(),
      update_time: new Date()
    }
  })
  
  console.log('[createCarousel] 创建成功, carouselId:', carouselId)
  
  return {
    success: true,
    message: '轮播图创建成功'
  }
}

// 更新轮播图
async function updateCarousel(data) {
  const { carouselId, title, imageUrl, linkUrl, sortOrder, status } = data
  
  if (!carouselId) {
    return {
      success: false,
      message: '缺少轮播图ID'
    }
  }
  
  const updateData = {
    update_time: new Date()
  }
  
  if (title !== undefined) updateData.title = title
  if (imageUrl !== undefined) updateData.image_url = imageUrl
  if (linkUrl !== undefined) updateData.link_url = linkUrl
  if (sortOrder !== undefined) updateData.sort_order = sortOrder
  if (status !== undefined) updateData.status = status
  
  const result = await db.collection('carousel')
    .where({ carousel_id: carouselId })
    .update({
      data: updateData
    })
  
  if (result.stats.updated === 0) {
    return {
      success: false,
      message: '轮播图不存在'
    }
  }
  
  return {
    success: true,
    message: '轮播图更新成功'
  }
}

// 删除轮播图
async function deleteCarousel(data) {
  const { carouselId } = data
  
  if (!carouselId) {
    return {
      success: false,
      message: '缺少轮播图ID'
    }
  }
  
  const result = await db.collection('carousel')
    .where({ carousel_id: carouselId })
    .update({
      data: {
        is_deleted: 1,
        update_time: new Date()
      }
    })
  
  if (result.stats.updated === 0) {
    return {
      success: false,
      message: '轮播图不存在'
    }
  }
  
  return {
    success: true,
    message: '轮播图删除成功'
  }
}

