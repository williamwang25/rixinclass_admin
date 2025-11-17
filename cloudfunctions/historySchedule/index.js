// 云函数：基于历史排课记录进行自动排课
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  try {
    const { bookingId } = event
    
    console.log('[historySchedule] 开始历史排课:', { bookingId })
    
    // 参数验证
    if (!bookingId) {
      return {
        success: false,
        message: '缺少必填参数 bookingId'
      }
    }
    
    // 1. 获取当前申请信息
    const { data: bookings } = await db.collection('booking')
      .where({ 
        booking_id: bookingId,
        is_deleted: 0
      })
      .get()
    
    if (!bookings || bookings.length === 0) {
      return {
        success: false,
        message: '申请不存在'
      }
    }
    
    const currentBooking = bookings[0]
    console.log('[historySchedule] 当前申请:', {
      course_name: currentBooking.course_name,
      academic_year: currentBooking.academic_year,
      semester: currentBooking.semester
    })
    
    // 2. 查找历史排课记录（上一学年，相同学期，相同课程名称）
    const previousYear = getPreviousAcademicYear(currentBooking.academic_year)
    console.log('[historySchedule] 查找历史记录:', {
      academic_year: previousYear,
      semester: currentBooking.semester,
      course_name: currentBooking.course_name
    })
    
    // 查询所有匹配的历史排课记录（可能有多个教室）
    const { data: historySchedules } = await db.collection('schedule')
      .where({
        course_name: currentBooking.course_name,
        academic_year: previousYear,
        semester: currentBooking.semester,
        is_deleted: 0
      })
      .orderBy('create_time', 'desc')
      .get()
    
    if (!historySchedules || historySchedules.length === 0) {
      console.log('[historySchedule] 未找到历史排课记录')
      
      // 记录失败日志
      await cloud.callFunction({
        name: 'createScheduleLog',
        data: {
          bookingId: currentBooking.booking_id,
          bookingNo: currentBooking.booking_no,
          adminUserId: 1,
          adminName: '系统历史排课',
          actionType: 'history_schedule',
          actionResult: 'failure',
          studentCount: currentBooking.student_count,
          failureReason: `未找到 ${previousYear} 学年 ${currentBooking.semester} 课程"${currentBooking.course_name}"的历史排课记录`,
          timeSlots: currentBooking.time_slots || [],
          courseName: currentBooking.course_name,
          teacherName: currentBooking.teacher_name,
          academicYear: currentBooking.academic_year,
          semester: currentBooking.semester
        }
      })
      
      return {
        success: false,
        message: `未找到 ${previousYear} 学年 ${currentBooking.semester} 课程"${currentBooking.course_name}"的历史排课记录`
      }
    }
    
    // 按 booking_id 分组，获取最近的一次排课（可能包含多个教室）
    const bookingGroups = {}
    historySchedules.forEach(record => {
      const bid = record.booking_id
      if (!bookingGroups[bid]) {
        bookingGroups[bid] = []
      }
      bookingGroups[bid].push(record)
    })
    
    // 获取最新的 booking_id 组
    const latestBookingId = Object.keys(bookingGroups)[0]
    const historyRecords = bookingGroups[latestBookingId]
    
    console.log('[historySchedule] 找到历史记录:', {
      booking_id: latestBookingId,
      lab_count: historyRecords.length,
      labs: historyRecords.map(r => ({ lab_room: r.lab_room, building: r.building }))
    })
    
    // 3. 验证所有历史实验室是否仍然可用，并按 lab_room 匹配
    const validLabs = []
    const unavailableLabs = []
    
    for (const historyRecord of historyRecords) {
      // 按 lab_room 查找实验室
      const { data: labs } = await db.collection('labs')
        .where({
          lab_room: historyRecord.lab_room,
          building: historyRecord.building,
          status: 1,
          is_deleted: 0
        })
        .get()
      
      if (labs && labs.length > 0) {
        validLabs.push({
          historyRecord: historyRecord,
          lab: labs[0]
        })
      } else {
        unavailableLabs.push(historyRecord)
      }
    }
    
    if (validLabs.length === 0) {
      const labNames = historyRecords.map(r => `${r.building} ${r.lab_room}`).join('、')
      
      // 记录失败日志
      await cloud.callFunction({
        name: 'createScheduleLog',
        data: {
          bookingId: currentBooking.booking_id,
          bookingNo: currentBooking.booking_no,
          adminUserId: 1,
          adminName: '系统历史排课',
          actionType: 'history_schedule',
          actionResult: 'failure',
          studentCount: currentBooking.student_count,
          failureReason: `历史实验室"${labNames}"均已不可用`,
          timeSlots: currentBooking.time_slots || [],
          courseName: currentBooking.course_name,
          teacherName: currentBooking.teacher_name,
          academicYear: currentBooking.academic_year,
          semester: currentBooking.semester
        }
      })
      
      return {
        success: false,
        message: `历史实验室"${labNames}"均已不可用`
      }
    }
    
    console.log('[historySchedule] 可用实验室:', validLabs.length, '个')
    
    // 4. 创建排课草稿（为每个实验室创建草稿）
    const timeSlots = currentBooking.time_slots || []
    const draftId = Date.now()
    const drafts = []
    
    for (const labItem of validLabs) {
      for (const slot of timeSlots) {
        drafts.push({
          draft_id: draftId + drafts.length,
          booking_id: currentBooking.booking_id,
          booking_no: currentBooking.booking_no,
          lab_id: labItem.lab.lab_id,
          lab_name: labItem.lab.lab_name,
          building: labItem.lab.building,
          lab_room: labItem.lab.lab_room,
          course_code: currentBooking.course_code,
          course_name: currentBooking.course_name,
          course_type: currentBooking.course_type,
          class_name: currentBooking.class_name,
          required_hours: currentBooking.required_hours,
          booking_hours: currentBooking.booking_hours,
          student_count: currentBooking.student_count,
          teacher_name: currentBooking.teacher_name,
          teacher_phone: currentBooking.teacher_phone,
          teacher_email: currentBooking.teacher_email,
          software_requirements: currentBooking.software_requirements,
          other_requirements: currentBooking.other_requirements,
          weekday: slot.weekday,
          week_start: slot.weekStart,
          week_end: slot.weekEnd,
          period_start: slot.periodStart,
          period_end: slot.periodEnd,
          academic_year: currentBooking.academic_year,
          semester: currentBooking.semester,
          is_manual: 0,
          create_time: new Date(),
          create_user: null,
          update_time: new Date(),
          update_user: null,
          is_deleted: 0
        })
      }
    }
    
    // 批量插入草稿
    await db.collection('schedule_draft').add({
      data: drafts
    })
    
    // 7. 更新申请状态为已排课待审核
    await db.collection('booking')
      .where({ booking_id: currentBooking.booking_id })
      .update({
        data: {
          status: 3,
          update_time: new Date()
        }
      })
    
    // 5. 记录排课成功日志
    const labNames = validLabs.map(item => `${item.lab.building} ${item.lab.lab_room}`).join('、')
    const firstLab = validLabs[0].lab
    const totalCapacity = validLabs.reduce((sum, item) => sum + item.lab.capacity, 0)
    
    await cloud.callFunction({
      name: 'createScheduleLog',
      data: {
        bookingId: currentBooking.booking_id,
        bookingNo: currentBooking.booking_no,
        adminUserId: 1,
        adminName: '系统历史排课',
        actionType: 'history_schedule',
        actionResult: 'success',
        labId: firstLab.lab_id,
        labName: labNames,
        building: firstLab.building,
        labRoom: firstLab.lab_room,
        studentCount: currentBooking.student_count,
        labCapacity: totalCapacity,
        softwareRequirements: currentBooking.software_requirements || '',
        matchReason: `基于 ${previousYear} 学年历史排课记录匹配（${validLabs.length}个实验室）`,
        timeSlots: timeSlots,
        courseName: currentBooking.course_name,
        teacherName: currentBooking.teacher_name,
        academicYear: currentBooking.academic_year,
        semester: currentBooking.semester
      }
    })
    
    console.log('[historySchedule] 历史排课成功')
    
    return {
      success: true,
      message: `已根据历史记录分配实验室：${labNames}`,
      data: {
        lab_id: firstLab.lab_id,
        lab_name: labNames,
        building: firstLab.building,
        lab_room: validLabs.map(item => item.lab.lab_room).join('、'),
        history_year: previousYear,
        lab_count: validLabs.length,
        drafts: drafts
      }
    }
    
  } catch (error) {
    console.error('[historySchedule] 失败:', error)
    return {
      success: false,
      message: '历史排课失败: ' + error.message
    }
  }
}

// 获取上一学年
function getPreviousAcademicYear(currentYear) {
  // 例如: "2024-2025" -> "2023-2024"
  if (!currentYear || !currentYear.includes('-')) {
    return null
  }
  
  const [startYear, endYear] = currentYear.split('-')
  const prevStartYear = parseInt(startYear) - 1
  const prevEndYear = parseInt(endYear) - 1
  
  return `${prevStartYear}-${prevEndYear}`
}
