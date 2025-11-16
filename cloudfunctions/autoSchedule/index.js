// 云函数：自动排课
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

/**
 * 可组合的教室组配置
 * 每组教室可以同时使用，容量叠加
 */
const COMBINABLE_LAB_GROUPS = [
  {
    groupId: 1,
    groupName: '软件楼5楼组合教室',
    labRooms: ['505-506', '518-519'],  // 房间号
    description: '505-506和518-519可以组合使用'
  },
  {
    groupId: 2,
    groupName: '软件楼7楼组合教室',
    labRooms: ['713-714', '718-719'],  // 房间号
    description: '713-714和718-719可以组合使用'
  }
]

/**
 * 检查教室是否属于某个可组合组
 * @param {string} labRoom - 教室房间号
 * @returns {Object|null} 所属的组，如果不属于任何组则返回null
 */
function findCombinableGroup(labRoom) {
  for (const group of COMBINABLE_LAB_GROUPS) {
    if (group.labRooms.includes(labRoom)) {
      return group
    }
  }
  return null
}

/**
 * 检测时间冲突（单个教室）
 * @param {number} labId - 实验室ID
 * @param {Object} timeSlot - 时间段
 * @returns {Promise<boolean>} 是否冲突
 */
async function checkConflict(labId, timeSlot) {
  // 检查正式表
  const { data: scheduleData } = await db.collection('schedule')
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
  
  if (scheduleData.length > 0) {
    return true
  }
  
  // 检查草稿表
  const { data: draftData } = await db.collection('schedule_draft')
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
  
  return draftData.length > 0
}

/**
 * 检测组合教室的冲突（组内所有教室都要检查）
 * @param {Array} labIds - 教室ID数组
 * @param {Object} timeSlot - 时间段
 * @returns {Promise<boolean>} 是否有冲突
 */
async function checkCombinedConflict(labIds, timeSlot) {
  for (const labId of labIds) {
    if (await checkConflict(labId, timeSlot)) {
      return true
    }
  }
  return false
}

/**
 * 查询组合教室
 * @param {number} studentCount - 学生人数
 * @param {string} softwareRequirements - 软件要求
 * @returns {Promise<Array>} 可用的组合教室方案
 */
async function findCombinedLabs(studentCount, softwareRequirements) {
  const combinedOptions = []
  
  for (const group of COMBINABLE_LAB_GROUPS) {
    // 查询该组内的所有教室
    const { data: groupLabs } = await db.collection('labs')
      .where({
        lab_room: _.in(group.labRooms),
        status: 1,
        is_deleted: 0
      })
      .get()
    
    // 如果组内教室数量不完整，跳过
    if (groupLabs.length !== group.labRooms.length) {
      console.log('[findCombinedLabs] 组合教室不完整:', group.groupName, '找到', groupLabs.length, '个，需要', group.labRooms.length, '个')
      continue
    }
    
    // 计算总容量
    const totalCapacity = groupLabs.reduce((sum, lab) => sum + (lab.capacity || 0), 0)
    
    // 检查容量是否满足
    if (totalCapacity < studentCount) {
      console.log('[findCombinedLabs] 组合教室容量不足:', group.groupName, '总容量', totalCapacity, '需要', studentCount)
      continue
    }
    
    // 检查软件环境（至少一个教室满足即可）
    const hasSoftwareMatch = groupLabs.some(lab => matchSoftwareEnv(lab, softwareRequirements))
    
    if (!hasSoftwareMatch && softwareRequirements && softwareRequirements.trim() !== '') {
      console.log('[findCombinedLabs] 组合教室软件环境不匹配:', group.groupName)
      continue
    }
    
    // 添加到可选方案
    combinedOptions.push({
      isCombined: true,
      groupId: group.groupId,
      groupName: group.groupName,
      labs: groupLabs,
      totalCapacity: totalCapacity,
      labIds: groupLabs.map(l => l.lab_id),
      labNames: groupLabs.map(l => `${l.building} ${l.lab_room}`).join(' + ')
    })
    
    console.log('[findCombinedLabs] 找到可用组合:', group.groupName, '总容量', totalCapacity)
  }
  
  return combinedOptions
}

/**
 * 提取软件名称核心部分（去除版本号）
 * @param {string} softwareName - 软件名称
 * @returns {string} 核心软件名
 */
function extractSoftwareCore(softwareName) {
  // 去除版本号：数字、点号、v、V等
  // 例如：Wireshark 3.6.2 -> wireshark
  //       Visual Studio 2022 -> visual studio
  //       Python3.9 -> python
  return softwareName
    .toLowerCase()
    .replace(/\s*v?\d+(\.\d+)*\s*/gi, ' ')  // 去除版本号
    .replace(/\s+/g, ' ')  // 合并多余空格
    .trim()
}

/**
 * 匹配软件环境（改进版：模糊匹配，不考虑版本号）
 * @param {Object} lab - 实验室信息
 * @param {string} requiredSoftware - 申请的软件要求
 * @returns {boolean} 是否匹配
 */
function matchSoftwareEnv(lab, requiredSoftware) {
  // 如果没有软件要求，则任何实验室都可以
  if (!requiredSoftware || requiredSoftware.trim() === '') {
    console.log('[matchSoftwareEnv] 无软件要求，匹配成功')
    return true
  }
  
  // 如果实验室没有配置软件环境，则不匹配
  if (!lab.software_envs || lab.software_envs.length === 0) {
    console.log('[matchSoftwareEnv] 实验室无软件环境配置')
    return false
  }
  
  // 将申请的软件要求分词并提取核心名称
  const requiredKeywords = requiredSoftware
    .split(/[,，;；\n]+/)  // 按逗号、分号、换行分隔
    .map(s => extractSoftwareCore(s))
    .filter(k => k.length > 0)
  
  console.log('[matchSoftwareEnv] 软件要求核心关键词:', requiredKeywords)
  
  // 遍历实验室的每个软件环境
  for (const env of lab.software_envs) {
    if (!env.software || env.software.length === 0) {
      continue
    }
    
    // 提取环境中所有软件的核心名称
    const envSoftwareCores = env.software.map(s => extractSoftwareCore(s))
    const envOsCore = extractSoftwareCore(env.os || '')
    const allCores = [...envSoftwareCores, envOsCore].join(' ')
    
    console.log('[matchSoftwareEnv] 环境软件核心:', envSoftwareCores)
    
    // 检查每个必需软件是否都能找到匹配
    const matchedKeywords = []
    const unmatchedKeywords = []
    
    for (const keyword of requiredKeywords) {
      // 模糊匹配：只要包含关键词即可
      const matched = envSoftwareCores.some(core => 
        core.includes(keyword) || keyword.includes(core)
      ) || allCores.includes(keyword)
      
      if (matched) {
        matchedKeywords.push(keyword)
      } else {
        unmatchedKeywords.push(keyword)
      }
    }
    
    // 如果所有关键词都匹配，则完全匹配
    if (unmatchedKeywords.length === 0) {
      console.log('[matchSoftwareEnv] 完全匹配 - 环境ID:', env.env_id)
      return true
    }
    
    // 如果至少匹配70%的关键词，也认为匹配（宽松策略）
    const matchRate = matchedKeywords.length / requiredKeywords.length
    if (matchRate >= 0.7) {
      console.log('[matchSoftwareEnv] 部分匹配成功 - 环境ID:', env.env_id, 
        '匹配度:', matchedKeywords.length, '/', requiredKeywords.length,
        '已匹配:', matchedKeywords,
        '未匹配:', unmatchedKeywords)
      return true
    }
  }
  
  console.log('[matchSoftwareEnv] 无匹配环境')
  return false
}

exports.main = async (event, context) => {
  try {
    const { bookingId } = event
    
    console.log('[autoSchedule] 开始自动排课:', bookingId)
    
    if (!bookingId) {
      console.error('[autoSchedule] 缺少申请ID参数')
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
      console.error('[autoSchedule] 申请不存在:', bookingId)
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
      // 记录失败日志
      await cloud.callFunction({
        name: 'createScheduleLog',
        data: {
          bookingId: bookingId,
          bookingNo: booking.booking_no,
          adminUserId: 1,
          adminName: '系统自动排课',
          actionType: 'auto_schedule',
          actionResult: 'failure',
          studentCount: booking.student_count,
          softwareRequirements: booking.software_requirements || '',
          failureReason: '未找到时间段信息',
          timeSlots: [],
          courseName: booking.course_name,
          teacherName: booking.teacher_name,
          academicYear: booking.academic_year,
          semester: booking.semester
        }
      })
      
      return { success: false, message: '未找到时间段信息' }
    }
    
    console.log('[autoSchedule] 时间段数量:', timeSlots.length)
    
    // 3. 查询单个实验室（按容量排序）
    const { data: singleLabs } = await db.collection('labs')
      .where({
        capacity: _.gte(booking.student_count),
        status: 1,
        is_deleted: 0
      })
      .orderBy('capacity', 'asc')
      .get()
    
    console.log('[autoSchedule] 单个教室候选数量:', singleLabs.length)
    
    // 4. 查询组合教室
    const combinedLabs = await findCombinedLabs(booking.student_count, booking.software_requirements)
    console.log('[autoSchedule] 组合教室候选数量:', combinedLabs.length)
    
    // 5. 如果单个教室和组合教室都没有，则失败
    if (singleLabs.length === 0 && combinedLabs.length === 0) {
      // 记录失败日志
      await cloud.callFunction({
        name: 'createScheduleLog',
        data: {
          bookingId: bookingId,
          bookingNo: booking.booking_no,
          adminUserId: 1,
          adminName: '系统自动排课',
          actionType: 'auto_schedule',
          actionResult: 'failure',
          studentCount: booking.student_count,
          softwareRequirements: booking.software_requirements || '',
          failureReason: `没有容量满足 ${booking.student_count} 人的实验室（包括组合教室）`,
          timeSlots: timeSlots,
          courseName: booking.course_name,
          teacherName: booking.teacher_name,
          academicYear: booking.academic_year,
          semester: booking.semester
        }
      })
      
      return { 
        success: false, 
        message: `没有容量满足 ${booking.student_count} 人的实验室（包括组合教室）` 
      }
    }
    
    console.log('[autoSchedule] 软件要求:', booking.software_requirements || '无')
    
    // 6. 优先尝试组合教室（如果有的话）
    for (const combined of combinedLabs) {
      console.log('[autoSchedule] 检查组合教室:', combined.groupName)
      
      // 检测组合教室的时间冲突
      let hasConflict = false
      
      for (const slot of timeSlots) {
        if (await checkCombinedConflict(combined.labIds, slot)) {
          console.log('[autoSchedule] 组合教室冲突:', {
            groupName: combined.groupName,
            slot
          })
          hasConflict = true
          break
        }
      }
      
      // 无冲突则使用组合教室
      if (!hasConflict) {
        console.log('[autoSchedule] 找到可用组合教室:', {
          groupName: combined.groupName,
          labNames: combined.labNames,
          totalCapacity: combined.totalCapacity
        })
        
        // 保存到草稿表，等待管理员审核
        // 组合教室：为每个教室创建排课记录
        for (const slot of timeSlots) {
          for (const lab of combined.labs) {
            await db.collection('schedule_draft').add({
              data: {
                draft_id: Date.now() + Math.floor(Math.random() * 1000),
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
                is_combined: 1,  // 标记为组合教室
                combined_group_id: combined.groupId,  // 组合教室组ID
                create_time: new Date(),
                is_deleted: 0
              }
            })
          }
        }
        
        // 更新申请状态为已生成初步排课结果（待审核）
        await db.collection('booking')
          .where({ booking_id: bookingId })
          .update({
            data: { 
              status: 3,  // 新状态：已排课待审核
              is_scheduled: 1,
              update_time: new Date()
            }
          })
        
        // 注意：此时不通知教师，等管理员审核通过后再通知
        
        console.log('[autoSchedule] 已发送初步排课通知')
        
        // 记录排课成功日志（组合教室）
        await cloud.callFunction({
          name: 'createScheduleLog',
          data: {
            bookingId: bookingId,
            bookingNo: booking.booking_no,
            adminUserId: 1,
            adminName: '系统自动排课',
            actionType: 'auto_schedule',
            actionResult: 'success',
            labId: combined.labIds.join(','),
            labName: combined.labNames,
            building: combined.labs[0].building,
            labRoom: combined.labs.map(l => l.lab_room).join(' + '),
            studentCount: booking.student_count,
            labCapacity: combined.totalCapacity,
            softwareRequirements: booking.software_requirements,
            matchReason: `组合教室容量充足(${combined.totalCapacity}>=${booking.student_count})，软件环境匹配`,
            timeSlots: timeSlots,
            courseName: booking.course_name,
            teacherName: booking.teacher_name,
            academicYear: booking.academic_year,
            semester: booking.semester
          }
        })
        
        return {
          success: true,
          message: '排课成功（组合教室）',
          data: {
            isCombined: true,
            groupName: combined.groupName,
            labNames: combined.labNames,
            totalCapacity: combined.totalCapacity
          }
        }
      }
    }
    
    // 7. 尝试单个教室
    for (const lab of singleLabs) {
      // 检查软件环境是否匹配
      if (!matchSoftwareEnv(lab, booking.software_requirements)) {
        console.log('[autoSchedule] 实验室软件环境不匹配:', {
          labId: lab.lab_id,
          labName: lab.lab_name
        })
        continue
      }
      
      console.log('[autoSchedule] 实验室软件环境匹配:', {
        labId: lab.lab_id,
        labName: lab.lab_name
      })
      
      // 检测时间冲突
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
      
      // 无冲突则创建排课记录
      if (!hasConflict) {
        console.log('[autoSchedule] 找到可用实验室:', {
          labId: lab.lab_id,
          labName: lab.lab_name
        })
        
        // 保存到草稿表，等待管理员审核
        for (const slot of timeSlots) {
          await db.collection('schedule_draft').add({
            data: {
              draft_id: Date.now() + Math.floor(Math.random() * 1000),
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
              is_combined: 0,  // 非组合教室
              create_time: new Date(),
              is_deleted: 0
            }
          })
        }
        
        // 更新申请状态
        await db.collection('booking')
          .where({ booking_id: bookingId })
          .update({
            data: { 
              status: 3,
              is_scheduled: 1,
              update_time: new Date()
            }
          })
        
        // 记录排课成功日志
        await cloud.callFunction({
          name: 'createScheduleLog',
          data: {
            bookingId: bookingId,
            bookingNo: booking.booking_no,
            adminUserId: 1,
            adminName: '系统自动排课',
            actionType: 'auto_schedule',
            actionResult: 'success',
            labId: lab.lab_id,
            labName: `${lab.building} ${lab.lab_room}`,
            building: lab.building,
            labRoom: lab.lab_room,
            studentCount: booking.student_count,
            labCapacity: lab.capacity,
            softwareRequirements: booking.software_requirements,
            matchReason: `实验室容量充足(${lab.capacity}>=${booking.student_count})，软件环境匹配`,
            timeSlots: timeSlots,
            courseName: booking.course_name,
            teacherName: booking.teacher_name,
            academicYear: booking.academic_year,
            semester: booking.semester
          }
        })
        
        return {
          success: true,
          message: '排课成功',
          data: {
            isCombined: false,
            labId: lab.lab_id,
            labName: `${lab.building} ${lab.lab_room}`,
            capacity: lab.capacity
          }
        }
      }
    }
    
    // 8. 所有实验室都不满足条件
    console.log('[autoSchedule] 所有实验室都不满足条件')
    
    // 区分失败原因
    const hasAnySoftwareMatch = singleLabs.some(lab => matchSoftwareEnv(lab, booking.software_requirements))
    
    if (!hasAnySoftwareMatch) {
      // 记录软件环境不匹配的失败日志
      await cloud.callFunction({
        name: 'createScheduleLog',
        data: {
          bookingId: bookingId,
          bookingNo: booking.booking_no,
          adminUserId: 1, // TODO: 从context获取管理员ID
          adminName: '系统自动排课',
          actionType: 'auto_schedule',
          actionResult: 'failure',
          studentCount: booking.student_count,
          softwareRequirements: booking.software_requirements,
          failureReason: '没有实验室的软件环境满足申请要求',
          timeSlots: timeSlots,
          courseName: booking.course_name,
          teacherName: booking.teacher_name,
          academicYear: booking.academic_year,
          semester: booking.semester
        }
      })
      
      return {
        success: false,
        message: '没有实验室的软件环境满足申请要求，请手动选择实验室'
      }
    } else {
      console.log('[autoSchedule] 未找到合适的实验室')
      
      // 记录排课失败日志
      await cloud.callFunction({
        name: 'createScheduleLog',
        data: {
          bookingId: bookingId,
          bookingNo: booking.booking_no,
          adminUserId: 1, // TODO: 从context获取管理员ID
          adminName: '系统自动排课',
          actionType: 'auto_schedule',
          actionResult: 'failure',
          studentCount: booking.student_count,
          softwareRequirements: booking.software_requirements,
          failureReason: '无可用实验室：容量不足或软件环境不匹配',
          timeSlots: timeSlots,
          courseName: booking.course_name,
          teacherName: booking.teacher_name,
          academicYear: booking.academic_year,
          semester: booking.semester
        }
      })
      
      return {
        success: false,
        message: '无可用实验室：容量不足或软件环境不匹配'
      }
    }
  } catch (error) {
    console.error('[autoSchedule] 失败:', error)
    
    // 记录异常失败日志
    try {
      // 尝试获取申请信息用于日志
      let bookingInfo = {}
      try {
        const { data: bookings } = await db.collection('booking')
          .where({ booking_id: bookingId })
          .get()
        if (bookings.length > 0) {
          bookingInfo = bookings[0]
        }
      } catch (e) {
        console.error('[autoSchedule] 获取申请信息失败:', e)
      }
      
      await cloud.callFunction({
        name: 'createScheduleLog',
        data: {
          bookingId: bookingId,
          bookingNo: bookingInfo.booking_no || 'Unknown',
          adminUserId: 1,
          adminName: '系统自动排课',
          actionType: 'auto_schedule',
          actionResult: 'failure',
          studentCount: bookingInfo.student_count || 0,
          softwareRequirements: bookingInfo.software_requirements || '',
          failureReason: `系统异常：${error.message}`,
          timeSlots: [],
          courseName: bookingInfo.course_name || '',
          teacherName: bookingInfo.teacher_name || '',
          academicYear: bookingInfo.academic_year || '',
          semester: bookingInfo.semester || ''
        }
      })
    } catch (logError) {
      console.error('[autoSchedule] 记录失败日志时出错:', logError)
    }
    
    return {
      success: false,
      message: error.message
    }
  }
}
