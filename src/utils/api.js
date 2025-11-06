// API 封装 - 云函数调用
import { app } from './cloudbase'

/**
 * 调用云函数的通用方法
 * @param {string} name - 云函数名称
 * @param {Object} data - 传递的参数
 * @returns {Promise<Object>} 返回结果
 */
async function callFunction(name, data = {}) {
  try {
    console.log(`[API] 调用云函数: ${name}`, data)
    
    const res = await app.callFunction({
      name,
      data
    })
    
    console.log(`[API] ${name} 返回:`, res)
    
    if (res.result && res.result.success) {
      return res.result
    } else {
      const errorMsg = res.result?.message || '调用失败'
      throw new Error(errorMsg)
    }
  } catch (error) {
    console.error(`[API] ${name} 调用失败:`, error)
    throw error
  }
}

/**
 * 获取统计数据
 * @returns {Promise<Object>} 统计数据
 */
export async function getStatistics() {
  return await callFunction('getStatistics')
}

/**
 * 获取增强统计数据（含图表数据）
 * @returns {Promise<Object>} 详细统计数据
 */
export async function getStatisticsEnhanced() {
  return await callFunction('getStatisticsEnhanced')
}

/**
 * 获取申请列表
 * @param {Object} params - 查询参数
 * @param {number} params.status - 状态筛选（可选）
 * @param {number} params.pageSize - 每页数量
 * @returns {Promise<Object>} 申请列表
 */
export async function getBookingList(params = {}) {
  return await callFunction('getBookingList', params)
}

/**
 * 审核申请
 * @param {Object} params - 审核参数
 * @param {number} params.bookingId - 申请ID
 * @param {string} params.action - 操作（approve/reject）
 * @param {string} params.remark - 审核意见（拒绝时必填）
 * @returns {Promise<Object>} 审核结果
 */
export async function reviewBooking(params) {
  return await callFunction('reviewBooking', params)
}

/**
 * 自动排课
 * @param {Object} params - 排课参数
 * @param {number} params.bookingId - 申请ID
 * @returns {Promise<Object>} 排课结果
 */
export async function autoSchedule(params) {
  return await callFunction('autoSchedule', params)
}

/**
 * 获取排课结果列表
 * @param {Object} params - 查询参数
 * @param {string} params.academicYear - 学年（可选）
 * @param {string} params.semester - 学期（可选）
 * @returns {Promise<Object>} 排课列表
 */
export async function getScheduleList(params = {}) {
  return await callFunction('getScheduleList', params)
}

/**
 * 手动排课
 * @param {Object} params - 排课参数
 * @param {number} params.bookingId - 申请ID
 * @param {number} params.labId - 实验室ID
 * @returns {Promise<Object>} 排课结果
 */
export async function manualSchedule(params) {
  return await callFunction('manualSchedule', params)
}

/**
 * 获取实验室列表
 * @param {Object} params - 查询参数
 * @param {number} params.status - 状态筛选（可选）
 * @returns {Promise<Object>} 实验室列表
 */
export async function getLabList(params = {}) {
  return await callFunction('getLabList', params)
}

/**
 * 实验室管理操作（增删改）
 * @param {Object} params - 操作参数
 * @param {string} params.action - 操作类型（create/update/delete）
 * @param {Object} params.data - 实验室数据
 * @returns {Promise<Object>} 操作结果
 */
export async function manageLabOperation(params) {
  return await callFunction('manageLabOperation', params)
}

/**
 * 获取轮播图列表
 * @param {Object} params - 查询参数
 * @returns {Promise<Object>} 轮播图列表
 */
export async function getCarouselList(params = {}) {
  return await callFunction('getCarouselList', params)
}

/**
 * 轮播图管理操作
 * @param {Object} params - 操作参数
 * @returns {Promise<Object>} 操作结果
 */
export async function manageCarousel(params) {
  return await callFunction('manageCarousel', params)
}

/**
 * 获取公告列表
 * @param {Object} params - 查询参数
 * @returns {Promise<Object>} 公告列表
 */
export async function getNoticeList(params = {}) {
  return await callFunction('getNoticeList', params)
}

/**
 * 公告管理操作
 * @param {Object} params - 操作参数
 * @returns {Promise<Object>} 操作结果
 */
export async function manageNotice(params) {
  return await callFunction('manageNotice', params)
}

/**
 * 发送消息
 * @param {Object} params - 消息参数
 * @returns {Promise<Object>} 发送结果
 */
export async function sendMessage(params) {
  return await callFunction('sendMessage', params)
}

/**
 * 获取个人消息
 * @param {Object} params - 查询参数
 * @returns {Promise<Object>} 消息列表
 */
export async function getMyMessages(params) {
  return await callFunction('getMyMessages', params)
}

/**
 * 标记消息已读
 * @param {Object} params - 参数
 * @returns {Promise<Object>} 操作结果
 */
export async function markMessageRead(params) {
  return await callFunction('markMessageRead', params)
}

/**
 * 获取个人排课记录
 * @param {Object} params - 查询参数
 * @returns {Promise<Object>} 排课记录
 */
export async function getMySchedules(params) {
  return await callFunction('getMySchedules', params)
}

