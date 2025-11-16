// 云函数：审核排课结果
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const { bookingId, action, remark, scheduleAdjustments } = event
    
    console.log('[reviewBooking] 审核排课结果参数:', { bookingId, action, remark, scheduleAdjustments })
    
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
    
    // 查询申请详情
    const { data: bookings } = await db.collection('booking')
      .where({ booking_id: bookingId })
      .get()
    
    if (bookings.length === 0) {
      return {
        success: false,
        message: '未找到对应的申请记录'
      }
    }
    
    const booking = bookings[0]
    
    if (action === 'approve') {
      // 审核通过：将草稿表的排课结果移动到正式的 schedule 表
      
      // 1. 查询草稿表中的排课结果
      const { data: drafts } = await db.collection('schedule_draft')
        .where({ 
          booking_id: bookingId,
          is_deleted: 0
        })
        .get()
      
      if (drafts.length === 0) {
        return {
          success: false,
          message: '未找到待审核的排课结果'
        }
      }
      
      console.log('[reviewBooking] 找到草稿记录:', drafts.length)
      
      // 2. 如果有手动调整，应用调整
      const adjustmentMap = {}
      if (scheduleAdjustments && scheduleAdjustments.length > 0) {
        for (const adjustment of scheduleAdjustments) {
          adjustmentMap[adjustment.draftId] = adjustment
        }
        console.log('[reviewBooking] 将应用手动调整:', scheduleAdjustments.length)
      }
      
      // 3. 将草稿移动到正式表
      for (const draft of drafts) {
        const adjustment = adjustmentMap[draft.draft_id]
        
        // 准备正式排课数据
        const scheduleData = {
          schedule_id: Date.now() + Math.floor(Math.random() * 1000),
          booking_id: draft.booking_id,
          booking_no: draft.booking_no,
          // 实验室信息（如果有调整则使用调整后的）
          lab_id: adjustment ? adjustment.newLabId : draft.lab_id,
          lab_name: adjustment ? adjustment.newLabName : draft.lab_name,
          building: adjustment ? adjustment.newBuilding : draft.building,
          lab_room: adjustment ? adjustment.newLabRoom : draft.lab_room,
          // 课程信息
          course_code: draft.course_code,
          course_name: draft.course_name,
          course_type: draft.course_type,
          class_name: draft.class_name,
          required_hours: draft.required_hours,
          booking_hours: draft.booking_hours,
          student_count: draft.student_count,
          // 教师信息
          teacher_name: draft.teacher_name,
          teacher_phone: draft.teacher_phone,
          teacher_email: draft.teacher_email,
          // 要求
          software_requirements: draft.software_requirements,
          other_requirements: draft.other_requirements,
          // 时间段
          weekday: draft.weekday,
          week_start: draft.week_start,
          week_end: draft.week_end,
          period_start: draft.period_start,
          period_end: draft.period_end,
          // 学期
          academic_year: draft.academic_year,
          semester: draft.semester,
          // 标记
          is_manual: adjustment ? 1 : draft.is_manual,  // 如果有调整则标记为手动
          status: 1,  // 已确认
          create_time: new Date(),
          is_deleted: 0
        }
        
        // 保存到正式表
        await db.collection('schedule').add({
          data: scheduleData
        })
      }
      
      console.log('[reviewBooking] 已移动到正式表')
      
      // 4. 删除草稿表中的记录
      await db.collection('schedule_draft')
        .where({ booking_id: bookingId })
        .update({
          data: {
            is_deleted: 1,
            update_time: new Date()
          }
        })
      
      // 5. 更新申请状态为最终通过
      await db.collection('booking')
        .where({ booking_id: bookingId })
        .update({
          data: {
            status: 1,  // 最终通过
            review_time: new Date(),
            review_remark: remark || '排课方案审核通过',
            update_time: new Date()
          }
        })
      
      // 发送通过通知
      await db.collection('message').add({
        data: {
          message_id: Date.now(),
          sender_id: null,
          sender_type: 0,  // 系统消息
          receiver_id: booking.user_id,
          booking_id: bookingId,
          message_type: '排课审核结果',
          content: `您的申请 ${booking.booking_no} 的排课方案已审核通过！\n课程：${booking.course_name}\n${remark ? '备注：' + remark : ''}`,
          is_read: 0,
          is_deleted: 0,
          create_time: new Date(),
          create_user: null,
          update_time: new Date(),
          update_user: null
        }
      })
      
      console.log('[reviewBooking] 排课方案审核通过')
      
    } else if (action === 'reject') {
      // 审核拒绝：删除草稿表中的排课结果，申请状态改为拒绝
      
      // 删除草稿表中的排课记录
      await db.collection('schedule_draft')
        .where({ booking_id: bookingId })
        .update({
          data: {
            is_deleted: 1,
            update_time: new Date()
          }
        })
      
      // 更新申请状态为拒绝，重置为待排课状态，允许重新排课
      await db.collection('booking')
        .where({ booking_id: bookingId })
        .update({
          data: {
            status: 0,  // 重置为待排课
            is_scheduled: 0,  // 重置排课标记
            review_time: new Date(),
            review_remark: remark,
            update_time: new Date()
          }
        })
      
      // 注意：拒绝时不通知教师，申请重置为待排课状态
      console.log('[reviewBooking] 排课方案审核拒绝，申请已重置为待排课状态')
    }
    
    return {
      success: true,
      message: action === 'approve' ? '排课方案审核通过' : '排课方案已拒绝'
    }
  } catch (error) {
    console.error('[reviewBooking] 失败:', error)
    return {
      success: false,
      message: error.message
    }
  }
}

