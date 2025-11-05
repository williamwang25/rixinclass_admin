# 日新智课系统 - AI开发上下文提示

> 此文档用于提供给 AI 开发助手，快速理解项目并开发管理员端系统

---

## 🎯 项目背景

**系统名称：** 日新智课 - 北京工业大学智慧排课系统

**系统组成：**
- **教师端小程序**（已完成60%） - 提交排课申请
- **管理员端Web**（待开发） - 审核申请、自动排课、手动调整

**核心业务流程：**
```
教师提交申请 → 管理员审核 → 自动排课 → 冲突检测 → 手动处理冲突 → 生成排课表
```

---

## 🔧 技术栈

### 已确定技术

- **前端框架：** Vue3 + TypeScript
- **后端服务：** 微信云开发（Serverless）
- **数据库：** 云数据库（NoSQL / JSON 文档型）
- **云函数：** Node.js 18.15 + wx-server-sdk
- **小程序框架：** uni-app

### 管理员端建议技术栈

- **UI框架：** Element Plus / Ant Design Vue
- **状态管理：** Pinia
- **路由：** Vue Router
- **HTTP客户端：** 使用云开发 SDK（`@cloudbase/js-sdk`）

---

## 🗄️ 云数据库结构（重要）

### 数据库类型

**微信云开发文档型数据库（NoSQL）**

**关键特点：**
- 类似 MongoDB 的 JSON 文档存储
- 不支持 SQL，使用 API 链式调用
- 不支持 JOIN，需要手动关联或数据冗余
- 支持 `where().orderBy().limit().get()` 等操作

### ⚠️ 数据格式重要说明

#### 1. 时间字段格式

**存储格式：** ISO 8符串
```javascript
// 导入时
"create_time": "2025-11-03T08:00:00.000Z"

// 查询返回时（云数据库自动转换）
"create_time": Date 对象

// 前端显示时需要格式化
const formatTime = (time) => {
  const date = new Date(time)
  return date.toLocaleString('zh-CN')
}
```

#### 2. JSON 字段需要解析

**问题字段：** `software_env`

```javascript
// 数据库存储（字符串）
"software_env": "{\"os\":\"Windows 10\",\"software\":[...]}"

// 读取后需要解析
const lab = data[0]
const softwareEnv = JSON.parse(lab.software_env)

// 使用时
softwareEnv.software.forEach(s => {
  console.log(s.name, s.version)
})
```

#### 3. 字段命名规范

**时间段字段：** 使用下划线格式

```javascript
// ❌ 错误（文档示例可能用驼峰）
{
  weekStart: 1,
  weekEnd: 16
}

// ✅ 正确（实际数据库格式）
{
  week_start: 1,
  week_end: 16
}
```

**云函数处理：**
```javascript
// createBooking 云函数应该直接存储下划线格式
const slotData = {
  weekday: slot.weekday,
  week_start: slot.weekStart || slot.week_start,
  week_end: slot.weekEnd || slot.week_end,
  period_start: slot.periodStart || slot.period_start,
  period_end: slot.periodEnd || slot.period_end
}
```

### 10个核心集合

#### 1. rx_user - 用户集合

**用途：** 存储教师和管理员信息

**关键字段：**
```javascript
{
  "user_id": Number,        // 业务主键（时间戳）
  "open_id": String,        // 微信OpenID（登录凭证）
  "nick_name": String,      // 昵称
  "name": String,           // 真实姓名
  "phone": String,          // 电话
  "email": String,          // 邮箱
  "user_type": Number,      // 0=教师, 1=管理员
  "status": Number,         // 0=禁用, 1=正常
  "is_deleted": Number      // 0=否, 1=是（软删除）
}
```

#### 2. labs - 实验室集合

**用途：** 实验室基础信息

**关键字段：**
```javascript
{
  "lab_id": Number,
  "lab_room": String,       // 房间号（如 "505"）
  "lab_name": String,       // 实验室名称
  "building": String,       // 所在楼栋
  "floor": Number,          // 楼层
  "capacity": Number,       // 容纳人数
  "software_env": String,   // ⚠️ 软件环境（JSON字符串，需要JSON.parse）
  "hardware_env": String,   // 硬件环境描述
  "support_notes": String,  // 支持课程说明
  "lab_admin": String,      // 负责人
  "status": Number,         // 0=维护, 1=正常, 2=停用
  "remark": String,         // 备注
  "create_time": String,    // ISO时间字符串
  "is_deleted": Number
}
```

**⚠️ software_env 是字符串，需要解析：**
```javascript
// 数据库存储格式
"software_env": "{\"os\":\"Windows 10 专业版\",\"software\":[{\"name\":\"Adobe Photoshop\",\"version\":\"2020\"}]}"

// 使用时需要解析
const softwareEnv = JSON.parse(lab.software_env)
// 解析后结构：
{
  "os": "Windows 10 专业版",
  "software": [
    {"name": "Adobe Photoshop", "version": "2020"},
    {"name": "CorelDRAW", "version": "2019"}
  ]
}
```

#### 3. booking - 排课申请集合

**用途：** 教师提交的排课申请

**关键字段：**
```javascript
{
  "booking_id": Number,
  "booking_no": String,     // 申请编号（BK20251103001）
  "user_id": Number,        // 申请教师ID
  "academic_year": String,  // 学年（2025-2026）
  "semester": String,       // 学期（第一学期）
  "course_code": String,    // 课程代码
  "course_type": String,    // 课程类型（实验教学/实验作业/工作实习/毕业设计）
  "course_name": String,    // 课程名称
  "required_hours": Number, // 大纲学时
  "booking_hours": Number,  // 预约学时
  "class_name": String,     // 授课班级
  "student_count": Number,  // 学生人数
  "time_slots": Array,      // 时间段数组
  "software_requirements": String,  // 软件环境要求
  "teacher_name": String,   // 教师姓名
  "teacher_phone": String,  // 教师电话
  "teacher_email": String,  // 教师邮箱
  "status": Number,         // 0=待审, 1=通过, 2=拒绝, 3=取消
  "review_user_id": Number, // 审核人ID
  "review_time": Date,      // 审核时间
  "review_remark": String,  // 审核备注/拒绝原因
  "is_deleted": Number
}
```

**⚠️ time_slots 是数组，字段名使用下划线格式：**
```javascript
// 数据库存储格式
"time_slots": [
  {
    "weekday": 1,        // 1-7代表周一到周日
    "week_start": 1,     // 起始周（下划线格式）
    "week_end": 16,      // 结束周（下划线格式）
    "period_start": 3,   // 起始节次（下划线格式）
    "period_end": 4      // 结束节次（下划线格式）
  }
]

// ⚠️ 注意：前端传入时用驼峰，云函数会转为下划线存储
```

#### 4. schedule - 排课结果集合

**用途：** 最终的排课安排

**关键字段：**
```javascript
{
  "schedule_id": Number,
  "booking_id": Number,     // 关联申请ID
  "lab_id": Number,         // 实验室ID
  "academic_year": String,  // 学年（快照）
  "semester": String,       // 学期（快照）
  "weekday": Number,        // 星期（1-7）
  "week_start": Number,     // 开始周
  "week_end": Number,       // 结束周
  "period_start": Number,   // 开始节次
  "period_end": Number,     // 结束节次
  "course_name": String,    // 课程名（快照）
  "teacher_name": String,   // 教师名（快照）
  "class_name": String,     // 班级（快照）
  "student_count": Number,  // 学生数（快照）
  "is_conflict": Number,    // 0=无冲突, 1=有冲突
  "conflict_reason": String,
  "schedule_type": Number,  // 0=自动, 1=手动
  "status": Number,         // 0=取消, 1=正常
  "is_deleted": Number
}
```

**设计要点：**
- 使用**快照字段**（course_name, teacher_name等）避免关联查询
- 一个申请可能对应多条排课记录（多个时间段）

#### 5. schedule_conflict - 排课冲突集合

**用途：** 记录排课冲突详情

**关键字段：**
```javascript
{
  "conflict_id": Number,
  "schedule_id_1": Number,  // 冲突的排课1
  "schedule_id_2": Number,  // 冲突的排课2
  "booking_id_1": Number,
  "booking_id_2": Number,
  "conflict_type": String,  // time_overlap/lab_occupied/resource_shortage
  "conflict_detail": String,
  "conflict_level": Number, // 0=轻微, 1=一般, 2=严重
  "resolve_status": Number, // 0=未处理, 1=处理中, 2=已解决, 3=已忽略
  "resolve_user_id": Number,
  "resolve_time": Date,
  "resolve_remark": String,
  "is_deleted": Number
}
```

---

## 🚀 云函数 API 参考

### 已实现云函数（6个）

#### 1. login（用户登录）

```javascript
// 调用
wx.cloud.callFunction({
  name: 'login',
  data: {
    nickName: '张老师',
    avatarUrl: 'https://...'
  }
})

// 返回
{
  success: true,
  data: {
    userId: 1730620800000,
    openId: 'oXXX...',
    nickName: '张老师',
    userType: 0,
    isNewUser: false
  }
}
```

#### 2. getUserInfo（获取用户信息）

```javascript
// 调用
wx.cloud.callFunction({
  name: 'getUserInfo',
  data: { userId: 123 }
})
```

#### 3. getLabList（实验室列表）

```javascript
// 调用
wx.cloud.callFunction({
  name: 'getLabList',
  data: { status: 1 }  // 可选
})

// 返回
{
  success: true,
  data: [ /* 实验室数组 */ ],
  total: 10
}
```

#### 4. getLabDetail（实验室详情）

```javascript
// 调用
wx.cloud.callFunction({
  name: 'getLabDetail',
  data: { labId: 1 }
})
```

#### 5. createBooking（创建申请）

```javascript
// 调用
wx.cloud.callFunction({
  name: 'createBooking',
  data: {
    userId: 123,
    academicYear: '2025-2026',
    semester: '第一学期',
    courseCode: 'CS301',
    courseType: '实验教学',
    courseName: '计算机图形学',
    requiredHours: 32,
    bookingHours: 32,
    className: '计算机2301班',
    studentCount: 45,
    timeSlots: [
      {
        weekday: 1,
        weekStart: 1,
        weekEnd: 16,
        periodStart: 3,
        periodEnd: 4
      }
    ],
    softwareRequirements: 'Adobe Photoshop 2020',
    otherRequirements: '备注',
    teacherName: '张伟',
    teacherPhone: '13800138000',
    teacherEmail: 'zhangwei@bjut.edu.cn',
    teacherSignature: 'https://...'
  }
})

// 返回
{
  success: true,
  data: {
    bookingId: 1730620800001,
    bookingNo: 'BK20251103001'
  }
}
```

#### 6. getMyBookings（我的申请）

```javascript
// 调用
wx.cloud.callFunction({
  name: 'getMyBookings',
  data: {
    userId: 123,
    status: 0,     // 可选
    pageNum: 1,
    pageSize: 10
  }
})

// 返回
{
  success: true,
  data: [ /* 申请数组 */ ],
  total: 10
}
```

---

## 📋 管理员端待开发云函数

### 阶段4：审核模块

#### getBookingList - 申请列表（管理员视角）

```javascript
// 功能：查看所有申请（不限用户）
exports.main = async (event, context) => {
  const { status, pageNum, pageSize } = event
  
  const where = { is_deleted: 0 }
  if (status !== undefined) where.status = status
  
  const { data } = await db.collection('booking')
    .where(where)
    .orderBy('create_time', 'desc')
    .skip((pageNum - 1) * pageSize)
    .limit(pageSize)
    .get()
  
  const countResult = await db.collection('booking').where(where).count()
  
  return {
    success: true,
    data,
    total: countResult.total
  }
}
```

#### reviewBooking - 审核申请

```javascript
// 功能：通过/拒绝申请
exports.main = async (event, context) => {
  const { bookingId, adminUserId, action, remark } = event
  // action: 'approve' | 'reject'
  
  const newStatus = action === 'approve' ? 1 : 2
  
  // 1. 更新申请状态
  await db.collection('booking')
    .where({ booking_id: bookingId })
    .update({
      data: {
        status: newStatus,
        review_user_id: adminUserId,
        review_time: new Date(),
        review_remark: remark,
        update_time: new Date()
      }
    })
  
  // 2. 记录审核日志
  await db.collection('authlog').add({
    data: {
      audit_id: Date.now(),
      booking_id: bookingId,
      admin_user_id: adminUserId,
      action: action,
      remark: remark,
      create_time: new Date()
    }
  })
  
  // 3. 发送通知给教师
  await db.collection('notice').add({
    data: {
      notice_id: Date.now(),
      title: action === 'approve' ? '申请已通过' : '申请被拒绝',
      content: remark,
      notice_type: action === 'approve' ? '审核通过' : '审核拒绝',
      target_user_id: event.teacherUserId,
      booking_id: bookingId,
      priority: 1,
      create_time: new Date()
    }
  })
  
  // 4. 如果通过，触发自动排课
  if (action === 'approve') {
    // 调用自动排课云函数
    await cloud.callFunction({
      name: 'triggerAutoSchedule',
      data: { bookingId }
    })
  }
  
  return { success: true }
}
```

---

### 阶段5：自动排课模块

#### triggerAutoSchedule - 自动排课核心算法

```javascript
// 功能：自动匹配实验室并排课
exports.main = async (event, context) => {
  const { bookingId } = event
  
  // 1. 获取申请信息
  const { data: bookings } = await db.collection('booking')
    .where({ booking_id: bookingId, status: 1 })
    .get()
  
  if (!bookings.length) {
    return { success: false, message: '申请不存在或未通过审核' }
  }
  
  const booking = bookings[0]
  
  // 2. 匹配实验室
  const labs = await matchLabs(booking.student_count, booking.software_requirements)
  
  if (!labs.length) {
    return { success: false, message: '没有符合条件的实验室' }
  }
  
  // 3. 检测冲突
  let selectedLab = null
  let hasConflict = false
  
  for (const lab of labs) {
    let conflict = false
    
    for (const slot of booking.time_slots) {
      const hasTimeConflict = await checkTimeConflict(lab.lab_id, slot)
      if (hasTimeConflict) {
        conflict = true
        break
      }
    }
    
    if (!conflict) {
      selectedLab = lab
      break
    }
  }
  
  // 4. 创建排课记录
  if (!selectedLab) {
    selectedLab = labs[0]
    hasConflict = true
  }
  
  for (const slot of booking.time_slots) {
    const scheduleId = Date.now() + Math.random() * 1000
    
    await db.collection('schedule').add({
      data: {
        schedule_id: scheduleId,
        booking_id: booking.booking_id,
        lab_id: selectedLab.lab_id,
        academic_year: booking.academic_year,
        semester: booking.semester,
        weekday: slot.weekday,
        week_start: slot.weekStart,
        week_end: slot.weekEnd,
        period_start: slot.periodStart,
        period_end: slot.periodEnd,
        course_name: booking.course_name,
        teacher_name: booking.teacher_name,
        class_name: booking.class_name,
        student_count: booking.student_count,
        is_conflict: hasConflict ? 1 : 0,
        conflict_reason: hasConflict ? '时间冲突' : null,
        schedule_type: 0, // 自动排课
        status: 1,
        create_time: new Date()
      }
    })
    
    // 如果有冲突，记录冲突详情
    if (hasConflict) {
      // 查找冲突的排课记录
      const { data: conflictSchedules } = await db.collection('schedule')
        .where({
          lab_id: selectedLab.lab_id,
          weekday: slot.weekday,
          week_start: _.lte(slot.weekEnd),
          week_end: _.gte(slot.weekStart),
          period_start: _.lte(slot.periodEnd),
          period_end: _.gte(slot.periodStart),
          status: 1,
          is_deleted: 0
        })
        .limit(1)
        .get()
      
      if (conflictSchedules.length > 0) {
        await db.collection('schedule_conflict').add({
          data: {
            conflict_id: Date.now(),
            schedule_id_1: scheduleId,
            schedule_id_2: conflictSchedules[0].schedule_id,
            booking_id_1: booking.booking_id,
            booking_id_2: conflictSchedules[0].booking_id,
            conflict_type: 'time_overlap',
            conflict_detail: `实验室${selectedLab.lab_name}在周${slot.weekday}第${slot.periodStart}-${slot.periodEnd}节存在冲突`,
            conflict_level: 2,
            resolve_status: 0,
            create_time: new Date()
          }
        })
      }
    }
  }
  
  // 5. 发送通知
  await db.collection('notice').add({
    data: {
      notice_id: Date.now(),
      title: hasConflict ? '排课完成（存在冲突）' : '排课成功',
      content: `您的课程《${booking.course_name}》已${hasConflict ? '完成排课，但存在时间冲突，请等待管理员调整' : '成功排课至' + selectedLab.lab_name}`,
      notice_type: '排课结果',
      target_user_id: booking.user_id,
      booking_id: booking.booking_id,
      priority: hasConflict ? 2 : 0,
      create_time: new Date()
    }
  })
  
  return {
    success: true,
    hasConflict,
    lab: selectedLab
  }
}

// 辅助函数：匹配实验室
async function matchLabs(studentCount, softwareRequirements) {
  const { data: labs } = await db.collection('labs')
    .where({
      capacity: _.gte(studentCount),
      status: 1,
      is_deleted: 0
    })
    .orderBy('capacity', 'asc')
    .get()
  
  // 软件环境匹配
  if (softwareRequirements) {
    return labs.filter(lab => {
      // ⚠️ software_env 是字符串，直接用 includes 匹配
      return lab.software_env && lab.software_env.includes(softwareRequirements)
    })
  }
  
  return labs
}

// 辅助函数：检测时间冲突
async function checkTimeConflict(labId, timeSlot) {
  const { data } = await db.collection('schedule')
    .where({
      lab_id: labId,
      weekday: timeSlot.weekday,
      week_start: _.lte(timeSlot.weekEnd),
      week_end: _.gte(timeSlot.weekStart),
      period_start: _.lte(timeSlot.periodEnd),
      period_end: _.gte(timeSlot.periodStart),
      status: 1,
      is_deleted: 0
    })
    .get()
  
  return data.length > 0
}
```

#### getConflictList - 冲突列表

```javascript
// 功能：查询所有待处理的排课冲突
exports.main = async (event, context) => {
  const { resolveStatus, pageNum = 1, pageSize = 20 } = event
  
  const where = { is_deleted: 0 }
  if (resolveStatus !== undefined) where.resolve_status = resolveStatus
  
  const { data } = await db.collection('schedule_conflict')
    .where(where)
    .orderBy('conflict_level', 'desc')
    .orderBy('create_time', 'asc')
    .skip((pageNum - 1) * pageSize)
    .limit(pageSize)
    .get()
  
  // 关联查询排课详情（需要手动关联）
  const conflicts = []
  for (const conflict of data) {
    const [schedule1, schedule2] = await Promise.all([
      db.collection('schedule').where({ schedule_id: conflict.schedule_id_1 }).get(),
      db.collection('schedule').where({ schedule_id: conflict.schedule_id_2 }).get()
    ])
    
    conflicts.push({
      ...conflict,
      schedule1: schedule1.data[0],
      schedule2: schedule2.data[0]
    })
  }
  
  return {
    success: true,
    data: conflicts
  }
}
```

#### resolveConflict - 处理冲突

```javascript
// 功能：管理员手动解决冲突
exports.main = async (event, context) => {
  const { conflictId, adminUserId, action, newLabId, remark } = event
  // action: 'adjust' | 'reject'
  
  if (action === 'adjust' && newLabId) {
    // 调整到新实验室
    const conflict = await getConflict(conflictId)
    
    await db.collection('schedule')
      .where({ schedule_id: conflict.schedule_id_1 })
      .update({
        data: {
          lab_id: newLabId,
          is_conflict: 0,
          conflict_reason: null,
          schedule_type: 1  // 改为手动排课
        }
      })
  }
  
  // 更新冲突状态
  await db.collection('schedule_conflict')
    .where({ conflict_id: conflictId })
    .update({
      data: {
        resolve_status: 2,
        resolve_user_id: adminUserId,
        resolve_time: new Date(),
        resolve_remark: remark
      }
    })
  
  return { success: true }
}
```

---

## 🎨 管理员端页面设计

### 核心页面

1. **申请审核页面**
   - 表格展示申请列表
   - 快速审核（通过/拒绝）
   - 查看详情
   - 批量操作

2. **排课管理页面**
   - 课程表视图（周视图）
   - 实验室使用情况
   - 冲突高亮显示
   - 拖拽调整排课

3. **冲突处理页面**
   - 冲突列表
   - 冲突详情对比
   - 调整方案选择
   - 一键解决

4. **数据看板**
   - 申请统计（待审/通过/拒绝）
   - 实验室使用率
   - 冲突率分析
   - 教师活跃度

### UI组件建议

```vue
<!-- 申请审核表格 -->
<el-table :data="bookingList">
  <el-table-column prop="booking_no" label="申请编号" />
  <el-table-column prop="course_name" label="课程名称" />
  <el-table-column prop="teacher_name" label="教师" />
  <el-table-column prop="student_count" label="人数" />
  <el-table-column label="操作">
    <template #default="{ row }">
      <el-button type="success" @click="approve(row)">通过</el-button>
      <el-button type="danger" @click="reject(row)">拒绝</el-button>
    </template>
  </el-table-column>
</el-table>

<!-- 课程表视图 -->
<div class="schedule-grid">
  <div v-for="(period, pIndex) in periods" class="period-row">
    <div v-for="(day, dIndex) in weekdays" class="schedule-cell">
      <div v-if="getSchedule(day, period)" class="course-card">
        {{ getSchedule(day, period).course_name }}
      </div>
    </div>
  </div>
</div>
```

---

## 🔐 权限控制

### 数据库安全规则

```javascript
// 云开发控制台 → 数据库 → 安全规则

// rx_user - 用户只能读写自己的数据
{
  "read": "doc._openid == auth.openid",
  "write": "doc._openid == auth.openid"
}

// booking - 用户只能读写自己的申请
{
  "read": "doc.user_id == auth.uid",
  "write": "doc.user_id == auth.uid"
}

// schedule - 所有人可读，只有管理员可写
{
  "read": true,
  "write": "get('database.rx_user.${auth.uid}').user_type == 1"
}

// labs - 所有人可读，只有管理员可写
{
  "read": true,
  "write": "get('database.rx_user.${auth.uid}').user_type == 1"
}
```

### 云函数权限验证

```javascript
// 在需要管理员权限的云函数中添加
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  // 验证是否是管理员
  const { data: users } = await db.collection('rx_user')
    .where({ open_id: openid })
    .get()
  
  if (!users.length || users[0].user_type !== 1) {
    return {
      success: false,
      message: '权限不足，仅限管理员操作'
    }
  }
  
  // ... 后续业务逻辑
}
```

---

## 📊 数据统计查询示例

### 按学期统计

```javascript
const { data: schedules } = await db.collection('schedule')
  .where({
    academic_year: '2025-2026',
    semester: '第一学期',
    is_deleted: 0
  })
  .get()

const stats = {
  totalSchedules: schedules.length,
  totalStudents: schedules.reduce((sum, s) => sum + s.student_count, 0),
  conflictCount: schedules.filter(s => s.is_conflict === 1).length,
  usedLabs: new Set(schedules.map(s => s.lab_id)).size
}
```

### 实验室使用率

```javascript
// 聚合查询
const result = await db.collection('schedule')
  .aggregate()
  .match({
    academic_year: '2025-2026',
    semester: '第一学期',
    is_deleted: 0
  })
  .group({
    _id: '$lab_id',
    count: { $sum: 1 },
    total_hours: {
      $sum: {
        $multiply: [
          { $subtract: ['$period_end', '$period_start'] },
          { $subtract: ['$week_end', '$week_start'] }
        ]
      }
    }
  })
  .end()
```

---

## 🔗 前后端联调

### Web 端初始化云开发

```javascript
// main.ts
import cloudbase from '@cloudbase/js-sdk'

const app = cloudbase.init({
  env: 'cloud1-1gt445eta224436c'
})

// 匿名登录
const auth = app.auth({ persistence: 'local' })
await auth.signInAnonymously()

// 使用数据库
const db = app.database()
const { data } = await db.collection('booking').get()

// 调用云函数
const res = await app.callFunction({
  name: 'getBookingList',
  data: { status: 0 }
})
```

### 跨域和权限

- 云开发**自动处理跨域**
- Web 端需要配置**安全域名**
- 在云控制台添加管理后台域名

---

## ⚡ 性能优化建议

### 1. 索引优化

在云控制台为常用查询字段创建索引：
- `booking`: `user_id`, `status`, `academic_year`
- `schedule`: `lab_id + weekday`, `booking_id`
- `rx_user`: `open_id`, `user_type`

### 2. 数据冗余

使用快照字段避免关联查询：
- `schedule` 表存储 `course_name`, `teacher_name`（而不是查询 booking）
- `booking` 表存储 `teacher_name`（而不是查询 rx_user）

### 3. 分页查询

大数据量查询必须分页：
```javascript
const pageSize = 20
const { data } = await db.collection('booking')
  .skip((pageNum - 1) * pageSize)
  .limit(pageSize)
  .get()
```

---

## 🐛 常见问题

### 1. NoSQL 不支持 JOIN

**问题：** 需要查询申请及其关联的实验室信息

**解决：** 手动关联查询
```javascript
// 先查申请
const { data: bookings } = await db.collection('booking').get()

// 再查实验室（批量）
const labIds = [...new Set(bookings.map(b => b.lab_id))]
const { data: labs } = await db.collection('labs')
  .where({
    lab_id: _.in(labIds)
  })
  .get()

// 前端组合数据
const result = bookings.map(booking => ({
  ...booking,
  lab: labs.find(l => l.lab_id === booking.lab_id)
}))
```

### 2. 时间冲突检测

**问题：** 判断两个时间段是否重叠

**逻辑：**
```javascript
// 时间段A: [weekStart1, weekEnd1] [periodStart1, periodEnd1]
// 时间段B: [weekStart2, weekEnd2] [periodStart2, periodEnd2]

// 重叠条件：
weekStart1 <= weekEnd2 && weekEnd1 >= weekStart2 &&
periodStart1 <= periodEnd2 && periodEnd1 >= periodStart2
```

**NoSQL 查询：**
```javascript
const { data } = await db.collection('schedule')
  .where({
    lab_id: labId,
    weekday: weekday,
    week_start: _.lte(weekEnd),
    week_end: _.gte(weekStart),
    period_start: _.lte(periodEnd),
    period_end: _.gte(periodStart)
  })
  .get()
```

### 3. 批量操作

**问题：** 需要批量通过申请

**解决：** 循环调用或使用云函数批处理
```javascript
// 前端批量调用
for (const booking of selectedBookings) {
  await wx.cloud.callFunction({
    name: 'reviewBooking',
    data: {
      bookingId: booking.booking_id,
      action: 'approve'
    }
  })
}
```

---

## 📦 交付物清单

### 给管理员前端开发的文件

**核心文件：**
1. `PROJECT_SUMMARY.md` - 项目总结（本文件）
2. `AI_CONTEXT_PROMPT.md` - AI开发提示（本文件）
3. `database/*.json` - 数据库导入文件
4. `cloudfunctions/` - 所有云函数源码
5. `!prompt/rixin-db.md` - 数据库设计文档

**参考文件：**
6. `src/pages-sub/apply/index.vue` - 申请页面实现
7. `src/pages-sub/query/index.vue` - 查询页面实现
8. `src/utils/db.ts` - 工具函数参考

---

## 🎯 下一步开发指南

### 管理员端开发步骤

1. **环境准备**
   ```bash
   # 创建 Vue3 项目
   npm create vite@latest admin-rixinclass -- --template vue-ts
   cd admin-rixinclass
   npm install
   
   # 安装依赖
   npm install @cloudbase/js-sdk
   npm install element-plus
   npm install pinia vue-router
   ```

2. **云开发初始化**
   ```javascript
   // src/utils/cloudbase.ts
   import cloudbase from '@cloudbase/js-sdk'
   
   export const app = cloudbase.init({
     env: 'cloud1-1gt445eta224436c'
   })
   
   export const auth = app.auth({ persistence: 'local' })
   export const db = app.database()
   ```

3. **部署云函数**
   - 复制 `cloudfunctions/` 到新项目
   - 添加管理员相关的云函数
   - 在微信开发者工具中部署

4. **开发页面**
   - 申请审核页
   - 排课管理页
   - 冲突处理页
   - 数据看板

---

## 🔑 关键代码片段

### 获取待审核申请

```javascript
const { data } = await db.collection('booking')
  .where({
    status: 0,  // 待审核
    is_deleted: 0
  })
  .orderBy('create_time', 'desc')
  .limit(50)
  .get()
```

### 查询某实验室的排课情况

```javascript
const { data } = await db.collection('schedule')
  .where({
    lab_id: 1,
    academic_year: '2025-2026',
    semester: '第一学期',
    is_deleted: 0
  })
  .orderBy('weekday', 'asc')
  .orderBy('period_start', 'asc')
  .get()
```

### 生成课程表数据结构

```javascript
// 课程表：weekday × period
const scheduleGrid = {}

for (let day = 1; day <= 5; day++) {
  scheduleGrid[day] = {}
  for (let period = 1; period <= 12; period++) {
    scheduleGrid[day][period] = []
  }
}

// 填充排课数据
schedules.forEach(s => {
  for (let period = s.period_start; period <= s.period_end; period++) {
    scheduleGrid[s.weekday][period].push(s)
  }
})
```

---

## ✅ 验收标准

### 功能验收

- [ ] 能查看所有待审核申请
- [ ] 能通过/拒绝申请
- [ ] 自动排课能正常运行
- [ ] 能检测并显示时间冲突
- [ ] 能手动调整排课
- [ ] 能解决冲突
- [ ] 能导出排课表
- [ ] 数据看板正常显示

### 性能验收

- [ ] 申请列表加载 < 2秒
- [ ] 自动排课执行 < 5秒
- [ ] 页面操作流畅无卡顿

---

---

## 📖 数据解析完整指南

### 云数据库返回数据的实际格式

#### 示例：查询用户

```javascript
// 调用
const { data } = await db.collection('rx_user')
  .where({ user_id: 123 })
  .get()

// 返回的 data[0] 格式
{
  "_id": "cloud://cloud1-xxx.7269-cloud1-xxx/rx_user/abc123",
  "_openid": "oTq4C7vY0erpZtSUDeL40uEUzLws",
  "user_id": 1730620800000,
  "open_id": "oTq4C7vY0erpZtSUDeL40uEUzLws",
  "nick_name": "张教授",
  "avatar": "https://...",
  "name": "张伟",
  "user_type": 0,
  "status": 1,
  "latest_visit_at": Date,    // ⚠️ 自动转为 Date 对象
  "created_at": Date,         // ⚠️ 自动转为 Date 对象
  "is_deleted": 0
}
```

#### 示例：查询实验室

```javascript
const { data } = await db.collection('labs').get()

// data[0] 格式
{
  "_id": "xxx",
  "lab_id": 1,
  "lab_room": "505",
  "lab_name": "计算机图形学实验室",
  "software_env": "{\"os\":\"Windows 10\",\"software\":[...]}", // ⚠️ 字符串！
  "create_time": Date,        // ⚠️ 自动转为 Date 对象
  // ...
}

// 解析 software_env
const softwareEnv = JSON.parse(data[0].software_env)
console.log(softwareEnv.os)  // "Windows 10 专业版"
console.log(softwareEnv.software[0].name)  // "Adobe Photoshop"
```

#### 示例：查询申请

```javascript
const { data } = await db.collection('booking').get()

// data[0] 格式
{
  "_id": "xxx",
  "booking_id": 1,
  "booking_no": "BK20251103001",
  "time_slots": [            // ⚠️ 数组，字段名是下划线
    {
      "weekday": 1,
      "week_start": 1,       // ⚠️ 下划线格式
      "week_end": 16,
      "period_start": 3,
      "period_end": 4
    }
  ],
  "create_time": Date,       // ⚠️ Date 对象
  // ...
}

// 使用时间段
data[0].time_slots.forEach(slot => {
  console.log(slot.week_start, slot.week_end)  // 注意：下划线
})
```

### 前端显示数据格式化

```javascript
// 1. 格式化时间
function formatTime(time) {
  if (!time) return ''
  const date = new Date(time)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}`
}

// 2. 解析软件环境
function parseSoftwareEnv(envStr) {
  try {
    return JSON.parse(envStr)
  } catch (e) {
    return { os: '', software: [] }
  }
}

// 3. 格式化时间段
function formatTimeSlot(slot) {
  const weekdays = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日']
  return `${weekdays[slot.weekday]} ${slot.week_start}-${slot.week_end}周（${slot.period_start}-${slot.period_end}节）`
}

// 使用示例
const lab = data[0]
const env = parseSoftwareEnv(lab.software_env)
console.log('操作系统:', env.os)
console.log('软件列表:', env.software.map(s => `${s.name} ${s.version}`).join(', '))
```

### 字段命名对照表

| 前端（驼峰） | 数据库（下划线） | 说明 |
|-------------|----------------|------|
| weekStart | week_start | 起始周 |
| weekEnd | week_end | 结束周 |
| periodStart | period_start | 起始节 |
| periodEnd | period_end | 结束节 |
| softwareEnv | software_env | 软件环境 |
| hardwareEnv | hardware_env | 硬件环境 |
| createTime | create_time | 创建时间 |
| updateTime | update_time | 更新时间 |
| isDeleted | is_deleted | 是否删除 |

**建议：** 在云函数中统一处理字段名转换

---

## 🔧 数据处理工具函数

### 推荐在项目中创建

```javascript
// utils/dataParser.ts

/**
 * 解析软件环境字符串
 */
export function parseSoftwareEnv(envStr: string) {
  if (!envStr) return { os: '', software: [] }
  try {
    return JSON.parse(envStr)
  } catch (e) {
    console.error('解析软件环境失败:', e)
    return { os: '', software: [] }
  }
}

/**
 * 格式化时间
 */
export function formatTime(time: any, format = 'datetime') {
  if (!time) return ''
  const date = new Date(time)
  
  if (format === 'date') {
    return date.toLocaleDateString('zh-CN')
  }
  
  if (format === 'time') {
    return date.toLocaleTimeString('zh-CN')
  }
  
  return date.toLocaleString('zh-CN')
}

/**
 * 格式化时间段
 */
export function formatTimeSlot(slot: any) {
  const weekdays = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日']
  const weekday = weekdays[slot.weekday] || `周${slot.weekday}`
  const weeks = `${slot.week_start}-${slot.week_end}周`
  const periods = `${slot.period_start}-${slot.period_end}节`
  return `${weekday} ${weeks}（${periods}）`
}

/**
 * 转换申请数据格式（数据库 → 前端）
 */
export function parseBooking(dbBooking: any) {
  return {
    id: dbBooking.booking_no,
    bookingId: dbBooking.booking_id,
    courseName: dbBooking.course_name,
    courseCode: dbBooking.course_code,
    courseType: dbBooking.course_type,
    academicYear: dbBooking.academic_year,
    semester: dbBooking.semester,
    className: dbBooking.class_name,
    studentCount: dbBooking.student_count,
    teacherName: dbBooking.teacher_name,
    teacherPhone: dbBooking.teacher_phone,
    teacherEmail: dbBooking.teacher_email,
    status: dbBooking.status,
    statusText: ['待审核', '已通过', '已拒绝', '已取消'][dbBooking.status],
    createTime: formatTime(dbBooking.create_time),
    reviewTime: dbBooking.review_time ? formatTime(dbBooking.review_time) : null,
    reviewRemark: dbBooking.review_remark,
    timeSlots: (dbBooking.time_slots || []).map((slot: any) => ({
      weekday: slot.weekday,
      weekStart: slot.week_start,
      weekEnd: slot.week_end,
      periodStart: slot.period_start,
      periodEnd: slot.period_end,
      formatted: formatTimeSlot(slot)
    }))
  }
}
```

---

**文档用途：** 提供给 AI 开发助手，用于开发管理员端系统  
**最后更新：** 2025-11-03  
**文档状态：** ✅ 完整可用（已修正数据格式）

