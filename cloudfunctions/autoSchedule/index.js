// 云函数：自动排课
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

/**
 * 检测时间冲突
 * @param {number} labId - 实验室ID
 * @param {Object} timeSlot - 时间段
 * @returns {Promise<boolean>} 是否冲突
 */
async function checkConflict(labId, timeSlot) {
  const { data } = await db.collection('schedule')
    .where({
      lab_id: labId,
      weekday: timeSlot.weekday,
      week_start: _.lte(timeSlot.week_end),
      week_end: _.gte(timeSlot.week_start),
      period_start: _.lte(timeSlot.period_end),
      period_end: _.gte(timeSlot.period_start),
      is_deleted: 0
    })
    .get()
  
  return data.length > 0
}

exports.main = async (event, context) => {
  try {
    const { bookingId } = event
    
    console.log('[autoSchedule] 开始自动排课:', bookingId)
    
    if (!bookingId) {
      return {
        success: false,
        message: '缺少申请ID参数'
      }
    }
    
    // 1. 查询申请详情
    const { data: bookings } = await db.collection('booking')
      .where({ booking_id: bookingId })
      .get()
    
    if (bookings.length === 0) {
      return { success: false, message: '申请不存在' }
    }
    
    const booking = bookings[0]
    console.log('[autoSchedule] 申请详情:', {
      bookingId: booking.booking_id,
      studentCount: booking.student_count,
      courseName: booking.course_name
    })
    
    // 2. 查询时间段
    const { data: timeSlots } = await db.collection('booking_time_slots')
      .where({ booking_id: bookingId, is_deleted: 0 })
      .get()
    
    if (timeSlots.length === 0) {
      return { success: false, message: '未找到时间段信息' }
    }
    
    console.log('[autoSchedule] 时间段数量:', timeSlots.length)
    
    // 3. 查询实验室（按容量排序）
    const { data: labs } = await db.collection('labs')
      .where({
        capacity: _.gte(booking.student_count),
        status: 1,
        is_deleted: 0
      })
      .orderBy('capacity', 'asc')
      .get()
    
    if (labs.length === 0) {
      return { 
        success: false, 
        message: `没有容量满足 ${booking.student_count} 人的实验室` 
      }
    }
    
    console.log('[autoSchedule] 候选实验室数量:', labs.length)
    
    // 4. 遍历实验室检测冲突
    for (const lab of labs) {
      let hasConflict = false
      
      for (const slot of timeSlots) {
        if (await checkConflict(lab.lab_id, slot)) {
          console.log('[autoSchedule] 实验室冲突:', {
            labId: lab.lab_id,
            labName: lab.lab_name,
            slot
          })
          hasConflict = true
          break
        }
      }
      
      // 5. 无冲突则创建排课记录
      if (!hasConflict) {
        console.log('[autoSchedule] 找到可用实验室:', {
          labId: lab.lab_id,
          labName: lab.lab_name
        })
        
        for (const slot of timeSlots) {
          await db.collection('schedule').add({
            data: {
              schedule_id: Date.now() + Math.floor(Math.random() * 1000),
              booking_id: bookingId,
              booking_no: booking.booking_no,
              // 实验室信息
              lab_id: lab.lab_id,
              lab_name: lab.lab_name,
              building: lab.building,
              lab_room: lab.lab_room,
              // 课程信息
              course_code: booking.course_code || '',
              course_name: booking.course_name,
              course_type: booking.course_type || '实验教学',
              class_name: booking.class_name || '',
              required_hours: booking.required_hours || 0,
              booking_hours: booking.booking_hours || 0,
              student_count: booking.student_count,
              // 教师信息
              teacher_name: booking.teacher_name,
              teacher_phone: booking.teacher_phone || '',
              teacher_email: booking.teacher_email || '',
              // 要求
              software_requirements: booking.software_requirements || '',
              other_requirements: booking.other_requirements || '',
              // 时间段
              weekday: slot.weekday,
              week_start: slot.week_start,
              week_end: slot.week_end,
              period_start: slot.period_start,
              period_end: slot.period_end,
              // 学期
              academic_year: booking.academic_year,
              semester: booking.semester,
              // 标记
              is_manual: 0,  // 自动排课
              create_time: new Date(),
              is_deleted: 0
            }
          })
        }
        
        // 更新申请状态为已排课
        await db.collection('booking')
          .where({ booking_id: bookingId })
          .update({
            data: { 
              is_scheduled: 1,
              update_time: new Date()
            }
          })
        
        // 自动发送排课成功通知
        await db.collection('message').add({
          data: {
            message_id: Date.now() + Math.floor(Math.random() * 1000),
            sender_id: null,
            sender_type: 0,  // 系统消息
            receiver_id: booking.user_id,
            booking_id: bookingId,
            message_type: '排课通知',
            content: `您的申请 ${booking.booking_no}《${booking.course_name}》已完成排课！\n实验室：${lab.building} ${lab.lab_room}\n容量：${lab.capacity}人`,
            is_read: 0,
            is_deleted: 0,
            create_time: new Date(),
            create_user: null,
            update_time: new Date(),
            update_user: null
          }
        })
        
        console.log('[autoSchedule] 已发送排课通知')
        
        return {
          success: true,
          message: '排课成功',
          data: {
            labId: lab.lab_id,
            labName: `${lab.building} ${lab.lab_room}`,
            capacity: lab.capacity
          }
        }
      }
    }
    
    // 6. 所有实验室都冲突
    console.log('[autoSchedule] 所有实验室都冲突')
    return {
      success: false,
      message: '所有实验室在该时间段都已被占用，请手动调整'
    }
  } catch (error) {
    console.error('[autoSchedule] 失败:', error)
    return {
      success: false,
      message: error.message
    }
  }
}

