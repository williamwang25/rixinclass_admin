# 日新智课 - 微信小程序项目总结文档

## 📋 项目概况

**项目名称：** 日新智课 - 北京工业大学智慧排课系统（教师端小程序）  
**技术栈：** uni-app (Vue3 + TypeScript) + 微信云开发  
**数据库：** 微信云数据库（JSON文档型数据库 / NoSQL）  
**当前版本：** v1.0  
**开发进度：** 60%（阶段1-3已完成）

---

## 🏗️ 技术架构

### 系统架构图

```
┌─────────────────────────────────────────┐
│  教师端小程序（uni-app / Vue3）          │
│  ├─ 排课申请                             │
│  ├─ 申请查询                             │
│  ├─ 历史记录                             │
│  └─ 个人中心                             │
└─────────────────────────────────────────┘
         ↓ 调用云函数
┌─────────────────────────────────────────┐
│  微信云开发                              │
│  ├─ 云函数（Node.js 18.15）             │
│  │   ├─ login（登录）                   │
│  │   ├─ getUserInfo（用户信息）          │
│  │   ├─ getLabList（实验室列表）         │
│  │   ├─ getLabDetail（实验室详情）       │
│  │   ├─ createBooking（创建申请）        │
│  │   └─ getMyBookings（我的申请）        │
│  │                                       │
│  └─ 云数据库（NoSQL）                    │
│      ├─ rx_user（用户集合）              │
│      ├─ labs（实验室集合）               │
│      ├─ booking（申请集合）              │
│      ├─ booking_time_slots（时间段）     │
│      ├─ schedule（排课结果）             │
│      ├─ schedule_conflict（冲突）        │
│      ├─ notice（通知）                   │
│      ├─ message（消息）                  │
│      ├─ authlog（审核日志）              │
│      ├─ statistics（统计）               │
│      └─ rx_sysconfig（系统配置）         │
└─────────────────────────────────────────┘
         ↑ 需要接入
┌─────────────────────────────────────────┐
│  管理员端（Vue3 - 待开发）               │
│  ├─ 申请审核                             │
│  ├─ 自动排课                             │
│  ├─ 手动排课                             │
│  ├─ 冲突处理                             │
│  └─ 数据看板                             │
└─────────────────────────────────────────┘
```

---

## 📊 云数据库设计（NoSQL）

### 核心特点

- **数据库类型：** 微信云开发文档型数据库（NoSQL）
- **原始设计：** MySQL（已废弃，转为 NoSQL）
- **迁移原因：** 前端 MySQL SDK 功能受限，NoSQL 更适合微信小程序生态

### 集合列表（10个）

| 集合名 | 用途 | 状态 |
|--------|------|------|
| rx_user | 用户信息 | ✅ 已创建 |
| labs | 实验室信息 | ✅ 已创建 |
| booking | 排课申请 | ✅ 已创建 |
| booking_time_slots | 申请时间段 | ✅ 已创建 |
| schedule | 排课结果 | ✅ 已创建 |
| schedule_conflict | 排课冲突 | ✅ 已创建 |
| notice | 公告通知 | ✅ 已创建 |
| message | 消息对话 | 📋 待使用 |
| authlog | 审核日志 | 📋 待使用 |
| statistics | 统计数据 | 📋 待使用 |
| rx_sysconfig | 系统配置 | ✅ 已创建 |

### 数据结构示例

#### rx_user（用户集合）

```json
{
  "_id": "自动生成的文档ID",
  "_openid": "自动注入的用户openid",
  "user_id": 1730620800000,
  "open_id": "oTq4C7vY0erpZtSUDeL40uEUzLws",
  "nick_name": "张教授",
  "avatar": "https://...",
  "name": "张伟",
  "phone": "13800138000",
  "email": "zhangwei@bjut.edu.cn",
  "user_type": 0,
  "status": 1,
  "latest_visit_at": "2025-11-03T08:00:00.000Z",
  "created_at": "2025-11-03T08:00:00.000Z",
  "updated_at": "2025-11-03T08:00:00.000Z",
  "is_deleted": 0
}
```

**字段说明：**
- `user_type`: 0=教师, 1=管理员
- `status`: 0=禁用, 1=正常
- `user_id`: 业务主键（使用时间戳生成）
- `_id`: NoSQL主键（系统自动生成）

#### booking（排课申请集合）

```json
{
  "_id": "文档ID",
  "booking_id": 1730620800001,
  "booking_no": "BK20251103001",
  "user_id": 1730620800000,
  "academic_year": "2025-2026",
  "semester": "第一学期",
  "course_code": "CS301",
  "course_type": "实验教学",
  "course_name": "计算机图形学",
  "required_hours": 32,
  "booking_hours": 32,
  "class_name": "计算机2301班",
  "student_count": 45,
  "time_slots": [
    {
      "weekday": 1,
      "weekStart": 1,
      "weekEnd": 16,
      "periodStart": 3,
      "periodEnd": 4
    }
  ],
  "software_requirements": "Adobe Photoshop 2020",
  "other_requirements": "需要高性能显卡支持",
  "teacher_name": "张伟",
  "teacher_phone": "13800138000",
  "teacher_email": "zhangwei@bjut.edu.cn",
  "teacher_signature": "https://...",
  "status": 0,
  "review_user_id": null,
  "review_time": null,
  "review_remark": null,
  "create_time": "2025-11-03T08:00:00.000Z",
  "is_deleted": 0
}
```

**状态枚举：**
- `0` = 待审核
- `1` = 已通过
- `2` = 已拒绝
- `3` = 已取消

#### labs（实验室集合）

```json
{
  "_id": "文档ID",
  "lab_id": 1,
  "lab_room": "505",
  "lab_name": "计算机图形学实验室",
  "building": "软件楼",
  "floor": 5,
  "capacity": 50,
  "software_env": {
    "os": "Windows 10 专业版",
    "software": [
      {"name": "Adobe Photoshop", "version": "2020"},
      {"name": "CorelDRAW", "version": "2019"}
    ]
  },
  "hardware_env": "Dell OptiPlex 7080, Intel i7, 16GB RAM",
  "support_notes": "适用于图形学、数字媒体技术等课程",
  "lab_admin": "李老师",
  "status": 1,
  "is_deleted": 0
}
```

**状态枚举：**
- `0` = 维护中
- `1` = 正常
- `2` = 停用

---

## ☁️ 云函数开发策略

### 开发原则

1. **单一职责**：每个云函数只负责一个明确的业务功能
2. **统一响应格式**：所有云函数返回标准格式
3. **完整日志**：使用 console.log 记录关键步骤
4. **错误处理**：try-catch 捕获所有异常

### 标准响应格式

```javascript
// 成功响应
{
  "success": true,
  "message": "操作成功",
  "data": { ... },
  "timestamp": "2025-11-03T08:00:00.000Z"
}

// 失败响应
{
  "success": false,
  "message": "错误信息",
  "error": {
    "message": "详细错误",
    "stack": "错误堆栈"
  }
}
```

### 云函数模板

```javascript
// cloudfunctions/functionName/index.js
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  try {
    // 1. 获取用户身份（可选）
    const wxContext = cloud.getWXContext()
    const openid = wxContext.OPENID
    
    // 2. 参数验证
    const { param1, param2 } = event
    if (!param1) {
      return {
        success: false,
        message: '缺少必填参数: param1'
      }
    }
    
    // 3. 业务逻辑
    console.log('[FUNCTION_NAME] 开始执行...')
    
    // 4. 数据库操作
    const { data } = await db.collection('collection_name')
      .where({ ... })
      .get()
    
    // 5. 返回结果
    console.log('[FUNCTION_NAME] 执行成功')
    return {
      success: true,
      message: '操作成功',
      data: data
    }
    
  } catch (error) {
    console.error('[FUNCTION_NAME] 执行失败:', error)
    return {
      success: false,
      message: error.message,
      error: {
        message: error.message,
        stack: error.stack
      }
    }
  }
}
```

---

## 📦 已完成的云函数（6个）

### 阶段1：用户认证模块 ✅

#### 1. login - 用户登录

**路径：** `cloudfunctions/login/`

**功能：**
- 获取微信用户 openid
- 查询用户是否存在
- 新用户自动注册
- 老用户更新访问时间

**调用示例：**
```javascript
const res = await wx.cloud.callFunction({
  name: 'login',
  data: {
    nickName: '张老师',
    avatarUrl: 'https://...'
  }
})
```

**返回数据：**
```javascript
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

#### 2. getUserInfo - 获取用户信息

**路径：** `cloudfunctions/getUserInfo/`

**功能：**
- 根据 user_id 查询用户详细信息
- 检查用户状态
- 返回用户资料

**调用示例：**
```javascript
const res = await wx.cloud.callFunction({
  name: 'getUserInfo',
  data: {
    userId: 1730620800000
  }
})
```

---

### 阶段2：实验室模块 ✅

#### 3. getLabList - 实验室列表

**路径：** `cloudfunctions/getLabList/`

**功能：**
- 查询所有实验室
- 支持状态筛选
- 按楼栋、楼层、房间号排序

**调用示例：**
```javascript
const res = await wx.cloud.callFunction({
  name: 'getLabList',
  data: {
    status: 1  // 可选，1=正常，0=维护，2=停用
  }
})
```

#### 4. getLabDetail - 实验室详情

**路径：** `cloudfunctions/getLabDetail/`

**功能：**
- 查询指定实验室的详细信息
- 包含软硬件环境配置

**调用示例：**
```javascript
const res = await wx.cloud.callFunction({
  name: 'getLabDetail',
  data: {
    labId: 1
  }
})
```

---

### 阶段3：排课申请模块 ✅

#### 5. createBooking - 创建申请

**路径：** `cloudfunctions/createBooking/`

**功能：**
- 创建排课申请记录
- 生成申请编号（BK + 日期 + 随机码）
- 创建时间段记录
- 发送通知给管理员

**调用示例：**
```javascript
const res = await wx.cloud.callFunction({
  name: 'createBooking',
  data: {
    userId: 1730620800000,
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
        weekday: 1,        // 1-7代表周一到周日
        weekStart: 1,      // 起始周
        weekEnd: 16,       // 结束周
        periodStart: 3,    // 起始节次
        periodEnd: 4       // 结束节次
      }
    ],
    softwareRequirements: 'Adobe Photoshop 2020',
    otherRequirements: '需要高性能显卡',
    teacherName: '张伟',
    teacherPhone: '13800138000',
    teacherEmail: 'zhangwei@bjut.edu.cn',
    teacherSignature: 'https://...'
  }
})
```

**返回数据：**
```javascript
{
  success: true,
  data: {
    bookingId: 1730620800001,
    bookingNo: 'BK20251103001'
  }
}
```

#### 6. getMyBookings - 我的申请列表

**路径：** `cloudfunctions/getMyBookings/`

**功能：**
- 查询用户的所有申请
- 支持状态筛选
- 支持分页
- 按时间倒序

**调用示例：**
```javascript
const res = await wx.cloud.callFunction({
  name: 'getMyBookings',
  data: {
    userId: 1730620800000,
    status: 0,     // 可选，0=待审，1=通过，2=拒绝，3=取消
    pageNum: 1,
    pageSize: 10
  }
})
```

**返回数据：**
```javascript
{
  success: true,
  data: [ /* 申请列表 */ ],
  total: 10,
  pageNum: 1,
  pageSize: 10
}
```

---

## 🔧 云数据库 API 使用规范

### 查询操作

```javascript
const db = cloud.database()
const _ = db.command

// 1. 简单查询
const { data } = await db.collection('rx_user')
  .where({
    user_id: 123,
    is_deleted: 0
  })
  .get()

// 2. 操作符查询
const { data } = await db.collection('booking')
  .where({
    status: _.in([0, 1]),  // IN 查询
    create_time: _.gte(startDate) // 大于等于
  })
  .get()

// 3. 排序和分页
const { data } = await db.collection('labs')
  .where({ is_deleted: 0 })
  .orderBy('building', 'asc')
  .orderBy('floor', 'asc')
  .skip(0)
  .limit(10)
  .get()

// 4. 统计数量
const countResult = await db.collection('booking')
  .where({ user_id: 123 })
  .count()
console.log('总数:', countResult.total)
```

### 新增操作

```javascript
// 插入文档
await db.collection('booking').add({
  data: {
    booking_id: Date.now(),
    user_id: 123,
    course_name: '测试课程',
    status: 0,
    create_time: new Date(),
    is_deleted: 0
  }
})
```

### 更新操作

```javascript
// 1. 通过文档ID更新
await db.collection('rx_user')
  .doc('文档_id')
  .update({
    data: {
      latest_visit_at: new Date()
    }
  })

// 2. 条件批量更新
await db.collection('booking')
  .where({
    booking_id: 123
  })
  .update({
    data: {
      status: 1,
      review_time: new Date()
    }
  })
```

### 删除操作（软删除）

```javascript
// 软删除（推荐）
await db.collection('booking')
  .where({ booking_id: 123 })
  .update({
    data: {
      is_deleted: 1
    }
  })

// 物理删除（不推荐）
await db.collection('booking')
  .doc('文档_id')
  .remove()
```

---

## 📱 前端开发规范

### 项目结构

```
src/
├── App.vue                    # 应用入口（初始化云开发）
├── utils/
│   └── db.ts                  # 云数据库工具函数
├── pages/                     # 主包页面
│   ├── index/                 # 首页
│   ├── test/                  # 测试中心
│   ├── me/                    # 个人中心
│   └── notice/                # 通知中心
└── pages-sub/                 # 分包页面
    ├── apply/                 # 排课申请
    ├── query/                 # 申请查询
    ├── record/                # 历史记录
    └── test/                  # 测试页面
        ├── auth.vue           # 认证测试
        ├── lab.vue            # 实验室测试
        └── booking.vue        # 申请测试

cloudfunctions/                # 云函数目录
├── login/                     # 登录
├── getUserInfo/               # 用户信息
├── getLabList/                # 实验室列表
├── getLabDetail/              # 实验室详情
├── createBooking/             # 创建申请
└── getMyBookings/             # 我的申请

vite-plugins/                  # Vite 插件
├── copy-cloudfunctions.ts     # 自动复制云函数
└── setup-miniprogram-npm.ts   # 自动配置 npm
```

### 初始化代码（App.vue）

```vue
<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app'

onLaunch(() => {
  // 初始化云开发
  wx.cloud.init({
    env: 'cloud1-1gt445eta224436c',
    traceUser: true
  })
  
  console.log('云开发初始化完成')
  
  // 初始化云数据库
  // #ifdef MP-WEIXIN
  try {
    const db = wx.cloud.database()
    globalThis.$db = db
    globalThis.$_ = db.command
    
    console.log('云数据库初始化完成')
  } catch (error) {
    console.error('云数据库初始化失败:', error)
  }
  // #endif
})
</script>
```

### 调用云函数示例

```typescript
// src/utils/db.ts
export async function login(nickName: string, avatarUrl: string) {
  try {
    const res = await wx.cloud.callFunction({
      name: 'login',
      data: { nickName, avatarUrl }
    }) as any
    
    if (!res.result || !res.result.success) {
      throw new Error(res.result?.message || '登录失败')
    }
    
    return {
      success: true,
      data: res.result.data
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.message
    }
  }
}
```

---

## 🔄 开发流程

### 编译流程

```bash
# 1. 开发时编译
pnpm dev:mp

# 2. 自动执行（Vite 插件）
✅ 复制 cloudfunctions/ → dist/dev/mp-weixin/cloudfunctions/
✅ 配置 project.config.json

# 3. 部署云函数（微信开发者工具）
右键 cloudfunctions/xxx → 上传并部署

# 4. 测试
底部"测试"标签 → 选择测试模块
```

### 数据库导入流程

```
1. 云开发控制台 → 数据库
2. 创建集合（如 rx_user、labs、booking 等）
3. 导入数据
   - 文件路径：database/xxx.json
   - 格式：JSON Lines（每行一个JSON对象）
   - 冲突模式：Insert（插入）
4. 验证数据
```

---

## 📊 已完成功能清单

### 教师端小程序（60%）

- ✅ **用户认证**
  - 微信登录（自动注册）
  - 用户信息查询
  - 个人信息管理

- ✅ **实验室查询**
  - 实验室列表
  - 实验室详情
  - 状态筛选

- ✅ **排课申请**
  - 填写申请表单
  - 选择时间段（支持多个）
  - 电子签名
  - 提交申请

- ✅ **申请查询**
  - 我的申请列表
  - 状态筛选（待审/通过/拒绝）
  - 查看详情
  - 修改申请（拒绝后）
  - 取消申请（待审时）

- 📋 **待开发**
  - 通知中心（查看审核结果）
  - 历史记录（往年申请）
  - 消息对话（与管理员沟通）

---

## 🚧 管理员端待开发功能

### 业务流程

```
1. 获取申请列表
   ↓
2. 系统自动排课
   ├─ 匹配实验室（容量、软件环境）
   ├─ 检测时间冲突
   └─ 生成排课结果
   ↓
3. 管理员审核
   ├─ 查看排课结果
   ├─ 通过/拒绝申请
   └─ 发送通知给教师
   ↓
4. 冲突处理（如有）
   ├─ 查看冲突详情
   ├─ 手动调整排课
   └─ 解决冲突
   ↓
5. 导出排课表
```

### 需要开发的云函数

#### 阶段4：管理员审核模块

**4.1 getBookingList** - 获取申请列表
```javascript
// 功能：管理员查看所有待审核的申请
{
  name: 'getBookingList',
  data: {
    status: 0,      // 状态筛选
    pageNum: 1,
    pageSize: 20
  }
}
```

**4.2 reviewBooking** - 审核申请
```javascript
// 功能：通过或拒绝申请
{
  name: 'reviewBooking',
  data: {
    bookingId: 123,
    adminUserId: 456,
    action: 'approve',  // approve=通过, reject=拒绝
    remark: '审核意见'
  }
}
```

#### 阶段5：自动排课模块

**5.1 triggerAutoSchedule** - 自动排课
```javascript
// 功能：
// 1. 获取已通过但未排课的申请
// 2. 根据学生人数匹配实验室
// 3. 根据软件环境匹配实验室
// 4. 检测时间冲突
// 5. 无冲突则创建排课记录
// 6. 有冲突则记录冲突详情

{
  name: 'triggerAutoSchedule',
  data: {
    bookingId: 123
  }
}
```

**5.2 checkConflict** - 检测冲突
```javascript
// 功能：检测指定时间段是否有冲突
{
  name: 'checkConflict',
  data: {
    labId: 1,
    weekday: 1,
    weekStart: 1,
    weekEnd: 16,
    periodStart: 3,
    periodEnd: 4
  }
}
```

**5.3 resolveConflict** - 处理冲突
```javascript
// 功能：管理员手动解决排课冲突
{
  name: 'resolveConflict',
  data: {
    conflictId: 123,
    adminUserId: 456,
    solution: 'manual',  // manual=手动排课, reject=拒绝申请
    newLabId: 2,         // 如果是手动排课，指定新实验室
    remark: '解决方案说明'
  }
}
```

#### 阶段6：数据导出模块

**6.1 exportSchedule** - 导出排课表
```javascript
// 功能：导出指定学期的排课表（Excel）
{
  name: 'exportSchedule',
  data: {
    academicYear: '2025-2026',
    semester: '第一学期',
    format: 'excel'  // excel, pdf
  }
}
```

**6.2 getStatistics** - 获取统计数据
```javascript
// 功能：数据看板统计
{
  name: 'getStatistics',
  data: {
    type: 'semester',  // daily, weekly, monthly, semester
    academicYear: '2025-2026',
    semester: '第一学期'
  }
}
```

---

## 🎯 自动排课算法设计

### 核心逻辑

```javascript
// 伪代码
async function autoSchedule(booking) {
  // 1. 匹配实验室
  const labs = await matchLabs(booking.student_count, booking.software_requirements)
  
  // 2. 遍历实验室，检测冲突
  for (const lab of labs) {
    let hasConflict = false
    
    for (const slot of booking.time_slots) {
      const conflict = await checkTimeConflict(lab.lab_id, slot)
      if (conflict) {
        hasConflict = true
        break
      }
    }
    
    // 3. 无冲突，创建排课记录
    if (!hasConflict) {
      await createSchedule(booking, lab)
      return { success: true, lab }
    }
  }
  
  // 4. 所有实验室都冲突，记录冲突详情
  await recordConflict(booking, labs[0])
  return { success: false, conflict: true }
}

// 匹配实验室
async function matchLabs(studentCount, softwareRequirements) {
  const db = cloud.database()
  const _ = db.command
  
  // 查询容量足够的实验室
  const { data: labs } = await db.collection('labs')
    .where({
      capacity: _.gte(studentCount),
      status: 1,
      is_deleted: 0
    })
    .orderBy('capacity', 'asc') // 优先分配容量小的
    .get()
  
  // 软件环境匹配（简化版，可优化）
  if (softwareRequirements) {
    return labs.filter(lab => {
      const envStr = JSON.stringify(lab.software_env)
      return envStr.includes(softwareRequirements)
    })
  }
  
  return labs
}

// 检测时间冲突
async function checkTimeConflict(labId, timeSlot) {
  const db = cloud.database()
  const _ = db.command
  
  const { data: conflicts } = await db.collection('schedule')
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
  
  return conflicts.length > 0
}
```

---

## 📝 数据库设计要点

### NoSQL vs MySQL 差异

| 特性 | MySQL | NoSQL（云数据库） |
|------|-------|-------------------|
| 主键 | user_id（自增） | _id（自动生成） + user_id（业务ID） |
| 关联 | 外键（已移除） | 软关联（通过ID关联） |
| 查询 | SQL语句 | API链式调用 |
| 事务 | 支持 | 不支持（需手动处理） |
| 索引 | CREATE INDEX | 云控制台创建 |
| 时间 | DATETIME | Date 对象或字符串 |

### 注意事项

1. **业务主键**
   - 使用 `Date.now()` 生成唯一ID
   - 存储在业务字段中（如 `user_id`, `booking_id`）
   - `_id` 是 NoSQL 的主键，不作为业务ID

2. **时间处理**
   - 存储：`new Date()` 或 ISO字符串
   - 查询：使用 Date 对象或字符串均可
   - 显示：前端格式化

3. **软删除**
   - 所有删除操作只标记 `is_deleted = 1`
   - 查询时都要加 `is_deleted: 0` 条件

4. **关联查询**
   - NoSQL 不支持 JOIN
   - 需要多次查询或数据冗余
   - 建议使用快照字段（如 `teacher_name`）

---

## 🚀 部署清单

### 已部署

- ✅ 云函数：login, getUserInfo, getLabList, getLabDetail, createBooking, getMyBookings
- ✅ 云数据库：rx_user, labs, booking（含示例数据）
- ✅ 前端页面：排课申请、申请查询

### 待部署

- 📋 云函数：reviewBooking, triggerAutoSchedule, checkConflict, resolveConflict
- 📋 云数据库：schedule, schedule_conflict, notice（业务数据）
- 📋 管理员端：完整系统

---

## 📚 关键文件说明

### 数据库文件

- `database/*.json` - 云数据库导入文件（JSON Lines格式）
- `!prompt/rixindb.sql` - 原始 MySQL 设计（参考）
- `!prompt/rixin-db.md` - 数据库设计文档
- `database/jsondb.md` - 云数据库API文档

### 云函数文件

- `cloudfunctions/*/index.js` - 云函数逻辑
- `cloudfunctions/*/package.json` - 依赖配置

### 配置文件

- `vite.config.ts` - 已添加自动化插件
- `src/App.vue` - 云开发初始化
- `src/utils/db.ts` - 工具函数

---

## 🎯 管理员端开发建议

### 技术选型

**推荐：** Vue3 + Element Plus + TypeScript

**理由：**
- 与小程序技术栈一致（Vue3）
- 复用云函数和数据库
- 管理后台组件库丰富

### 核心功能

1. **申请管理**
   - 待审核列表
   - 快速审核（通过/拒绝）
   - 批量审核

2. **自动排课**
   - 触发自动排课
   - 查看排课结果
   - 冲突提示

3. **手动排课**
   - 查看冲突详情
   - 调整实验室
   - 调整时间段

4. **数据看板**
   - 申请统计
   - 实验室使用率
   - 冲突分析

### 数据访问

**Web端访问云数据库：**
```javascript
// 使用 @cloudbase/js-sdk
import cloudbase from '@cloudbase/js-sdk'

const app = cloudbase.init({
  env: 'cloud1-1gt445eta224436c'
})

// 匿名登录
await app.auth().signInAnonymously()

// 访问数据库
const db = app.database()
const { data } = await db.collection('booking').get()
```

**或者调用云函数：**
```javascript
// 使用云函数 API
const res = await app.callFunction({
  name: 'getBookingList',
  data: { status: 0 }
})
```

---

## ⚠️ 重要提醒

### 1. 环境ID配置

所有项目都必须使用同一个云开发环境ID：
```
cloud1-1gt445eta224436c
```

### 2. 云函数共享

小程序和管理端**共享同一套云函数**，不需要重复开发。

### 3. 数据库权限

- 小程序端：读写自己的数据
- 管理员端：需要配置管理员权限
- 在云控制台配置数据库权限规则

### 4. 安全规则示例

```javascript
// 云数据库安全规则
{
  "read": true,  // 所有人可读
  "write": "auth.openid == doc._openid"  // 只能写自己的数据
}

// 管理员集合需要特殊配置
{
  "read": "doc.user_type == 1",  // 只有管理员可读
  "write": "doc.user_type == 1"  // 只有管理员可写
}
```

---

## 📂 导出文件清单

将以下文件/目录提供给管理员前端开发：

### 必需文件

1. **数据库设计**
   - `database/*.json` - 数据导入文件
   - `!prompt/rixin-db.md` - 设计文档
   - `database/jsondb.md` - API文档

2. **云函数**
   - `cloudfunctions/` - 整个目录
   - 包含：login, getUserInfo, getLabList, getLabDetail, createBooking, getMyBookings

3. **业务逻辑**
   - `!prompt/日新智课front.md` - 业务需求
   - `FINAL_ARCHITECTURE.md` - 架构说明

### 参考文件

4. **前端实现参考**
   - `src/pages-sub/apply/` - 申请页面实现
   - `src/pages-sub/query/` - 查询页面实现
   - `src/utils/db.ts` - 工具函数

5. **测试代码**
   - `src/pages-sub/test/` - 测试页面（含完整测试用例）

---

## 🔗 环境信息

```
云开发环境ID: cloud1-1gt445eta224436c
小程序 AppID: wxa2abb91f64032a2b
数据库类型: 云数据库（NoSQL / JSON 文档型）
云函数运行时: Node.js 18.15
依赖包: wx-server-sdk@latest, @cloudbase/node-sdk@^2.5.0
```

---

## 📞 技术支持

### 云函数调试

- **查看日志：** 云开发控制台 → 云函数 → 选择函数 → 日志
- **在线调试：** 云开发控制台 → 云函数 → 在线调试

### 数据库调试

- **查看数据：** 云开发控制台 → 数据库 → 选择集合
- **执行查询：** 使用云开发控制台的查询工具

### 常见问题

1. **云函数超时**：默认3秒，可在控制台调整到60秒
2. **数据库限制**：单次查询最多1000条，需要分页
3. **文档大小**：单个文档最大512KB

---

## 🎉 项目亮点

1. **自动化部署**：Vite 插件自动复制云函数
2. **完整测试**：每个功能都有对应测试页面
3. **代码规范**：统一的响应格式和错误处理
4. **数据完整**：10个集合覆盖所有业务场景
5. **易于扩展**：清晰的模块划分和注释

---

**文档创建时间：** 2025-11-03  
**文档版本：** v1.0  
**适用场景：** 管理员前端项目开发参考  
**维护状态：** ✅ 持续更新

