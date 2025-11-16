// 云函数：手动排课
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  try {
    const { bookingId, labId } = event
    
    console.log('[manualSchedule] 开始手动排课:', { bookingId, labId })
    
    if (!bookingId || !labId) {
      return {
        success: false,
        message: '缺少必填参数'
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
    
    // 2. 查询实验室详情
    const { data: labs } = await db.collection('labs')
      .where({ lab_id: labId })
      .get()
    
    if (labs.length === 0) {
      return { success: false, message: '实验室不存在' }
    }
    
    const lab = labs[0]
    
    // 3. 检查容量
    if (lab.capacity < booking.student_count) {
      // 记录手动排课失败日志（容量不足）
      await cloud.callFunction({
        name: 'createScheduleLog',
        data: {
          bookingId: bookingId,
          bookingNo: booking.booking_no,
          adminUserId: 1, // TODO: 从context获取管理员ID
          adminName: '管理员手动排课',
          actionType: 'manual_schedule',
          actionResult: 'failure',
          labId: lab.lab_id,
          labName: `${lab.building} ${lab.lab_room}`,
          building: lab.building,
          labRoom: lab.lab_room,
          studentCount: booking.student_count,
          labCapacity: lab.capacity,
          softwareRequirements: booking.software_requirements,
          failureReason: `实验室容量不足：实验室容量${lab.capacity}人，申请需要${booking.student_count}人`,
          courseName: booking.course_name,
          teacherName: booking.teacher_name,
          academicYear: booking.academic_year,
          semester: booking.semester
        }
      })
      
      return {
        success: false,
        message: `实验室容量不足：实验室容量${lab.capacity}人，申请需要${booking.student_count}人`
      }
    }
    
    // 4. 查询时间段
    const { data: timeSlots } = await db.collection('booking_time_slots')
      .where({ booking_id: bookingId, is_deleted: 0 })
      .get()
    
    if (timeSlots.length === 0) {
      return { success: false, message: '未找到时间段信息' }
    }
    
    // 5. 检测冲突（手动排课也需要检测冲突）
    for (const slot of timeSlots) {
      const { data: conflicts } = await db.collection('schedule')
        .where({
          lab_id: labId,
          weekday: slot.weekday,
          week_start: _.lte(slot.week_end),
          week_end: _.gte(slot.week_start),
          period_start: _.lte(slot.period_end),
          period_end: _.gte(slot.period_start),
          is_deleted: 0
        })
        .get()
      
      if (conflicts.length > 0) {
        // 记录手动排课失败日志（时间冲突）
        await cloud.callFunction({
          name: 'createScheduleLog',
          data: {
            bookingId: bookingId,
            bookingNo: booking.booking_no,
            adminUserId: 1, // TODO: 从context获取管理员ID
            adminName: '管理员手动排课',
            actionType: 'manual_schedule',
            actionResult: 'failure',
            labId: lab.lab_id,
            labName: `${lab.building} ${lab.lab_room}`,
            building: lab.building,
            labRoom: lab.lab_room,
            studentCount: booking.student_count,
            labCapacity: lab.capacity,
            softwareRequirements: booking.software_requirements,
            failureReason: `时间段冲突：${slot.weekday === 1 ? '周一' : '周' + ['二','三','四','五','六','日'][slot.weekday-2]} 第${slot.week_start}-${slot.week_end}周 第${slot.period_start}-${slot.period_end}节 已被占用`,
            timeSlots: timeSlots,
            courseName: booking.course_name,
            teacherName: booking.teacher_name,
            academicYear: booking.academic_year,
            semester: booking.semester
          }
        })
        
        return {
          success: false,
          message: `时间段冲突：${slot.weekday === 1 ? '周一' : '周' + ['二','三','四','五','六','日'][slot.weekday-2]} 第${slot.week_start}-${slot.week_end}周 第${slot.period_start}-${slot.period_end}节 已被占用`
        }
      }
    }
    
    // 6. 创建排课记录
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
          is_manual: 1,  // 手动排课
          create_time: new Date(),
          is_deleted: 0
        }
      })
    }
    
    // 7. 更新申请状态为已排课
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
        content: `您的申请 ${booking.booking_no}《${booking.course_name}》已完成排课！\n实验室：${lab.building} ${lab.lab_room}\n容量：${lab.capacity}人\n（手动排课）`,
        is_read: 0,
        is_deleted: 0,
        create_time: new Date(),
        create_user: null,
        update_time: new Date(),
        update_user: null
      }
    })
    
    console.log('[manualSchedule] 手动排课成功，已发送通知')
    
    // 记录手动排课成功日志
    await cloud.callFunction({
      name: 'createScheduleLog',
      data: {
        bookingId: bookingId,
        bookingNo: booking.booking_no,
        adminUserId: 1, // TODO: 从context获取管理员ID
        adminName: '管理员手动排课',
        actionType: 'manual_schedule',
        actionResult: 'success',
        labId: lab.lab_id,
        labName: `${lab.building} ${lab.lab_room}`,
        building: lab.building,
        labRoom: lab.lab_room,
        studentCount: booking.student_count,
        labCapacity: lab.capacity,
        softwareRequirements: booking.software_requirements,
        matchedSoftware: lab.software_env,
        matchReason: `管理员手动选择，实验室容量充足(${lab.capacity}>=${booking.student_count})`,
        timeSlots: timeSlots,
        courseName: booking.course_name,
        teacherName: booking.teacher_name,
        academicYear: booking.academic_year,
        semester: booking.semester
      }
    })
    
    return {
      success: true,
      message: '手动排课成功',
      data: {
        labId: lab.lab_id,
        labName: `${lab.building} ${lab.lab_room}`,
        capacity: lab.capacity
      }
    }
  } catch (error) {
    console.error('[manualSchedule] 失败:', error)
    return {
      success: false,
      message: error.message
    }
  }
}

