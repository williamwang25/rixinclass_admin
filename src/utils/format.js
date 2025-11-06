// 格式化工具函数

/**
 * 格式化时间
 * @param {Date|string} time - 时间对象或字符串
 * @param {string} format - 格式（默认：YYYY-MM-DD HH:mm:ss）
 * @returns {string} 格式化后的时间字符串
 */
export function formatTime(time, format = 'YYYY-MM-DD HH:mm:ss') {
  if (!time) return '-'
  
  const date = new Date(time)
  if (isNaN(date.getTime())) return '-'
  
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  const second = String(date.getSeconds()).padStart(2, '0')
  
  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hour)
    .replace('mm', minute)
    .replace('ss', second)
}

/**
 * 格式化申请状态
 * @param {number} status - 状态码（0=待审核，1=已通过，2=已拒绝）
 * @returns {Object} 状态信息 { text, type, class }
 */
export function formatStatus(status) {
  const statusMap = {
    0: { text: '待审核', type: 'warning', class: 'status-pending' },
    1: { text: '已通过', type: 'success', class: 'status-approved' },
    2: { text: '已拒绝', type: 'danger', class: 'status-rejected' },
    3: { text: '已取消', type: 'info', class: 'status-cancelled' }
  }
  
  return statusMap[status] || { text: '未知', type: 'info', class: '' }
}

/**
 * 格式化星期
 * @param {number} weekday - 星期几（1-7）
 * @returns {string} 星期文本
 */
export function formatWeekday(weekday) {
  const weekMap = {
    1: '周一',
    2: '周二',
    3: '周三',
    4: '周四',
    5: '周五',
    6: '周六',
    7: '周日'
  }
  return weekMap[weekday] || '-'
}

/**
 * 格式化时间段
 * @param {Object} slot - 时间段对象
 * @returns {string} 时间段文本
 */
export function formatTimeSlot(slot) {
  if (!slot) return '-'
  
  const weekday = formatWeekday(slot.weekday)
  const weeks = `第${slot.week_start}-${slot.week_end}周`
  const periods = `第${slot.period_start}-${slot.period_end}节`
  
  return `${weekday} ${weeks} ${periods}`
}

/**
 * 格式化实验室信息
 * @param {Object} lab - 实验室对象
 * @returns {string} 实验室文本
 */
export function formatLab(lab) {
  if (!lab) return '-'
  return `${lab.building || ''} ${lab.lab_room || ''}`
}

