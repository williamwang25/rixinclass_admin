# 技术方案设计 - 日新智课管理员端

## 技术架构

### 整体架构图

```
┌─────────────────────────────────────────────┐
│         管理员 Web 端（Vue 3）               │
│  ├─ 登录页（CloudBase 匿名登录）              │
│  ├─ 数据看板（统计卡片）                      │
│  ├─ 申请审核（表格 + 操作）                   │
│  ├─ 排课管理（自动排课）                      │
│  └─ 排课结果（只读查看）                      │
└─────────────────────────────────────────────┘
                    ↓ 调用云函数
┌─────────────────────────────────────────────┐
│          腾讯云开发 CloudBase                │
│  ├─ 云函数（Node.js）                        │
│  │   ├─ getBookingList（查询申请）           │
│  │   ├─ reviewBooking（审核申请）            │
│  │   ├─ autoSchedule（自动排课）             │
│  │   ├─ getStatistics（统计数据）            │
│  │   └─ getScheduleList（排课结果）          │
│  │                                           │
│  └─ 云数据库（NoSQL）                        │
│      ├─ booking（申请记录）                   │
│      ├─ rx_user（用户信息）                  │
│      ├─ labs（实验室）                        │
│      ├─ schedule（排课结果）                  │
│      └─ booking_time_slots（时间段）         │
└─────────────────────────────────────────────┘
```

---

## 前端技术栈

### 核心依赖

| 依赖 | 版本 | 用途 |
|------|------|------|
| Vue | 3.5.13 | 前端框架 |
| Vue Router | 4.5.0 | 路由管理 |
| Element Plus | ^2.8.0 | UI 组件库（需新增） |
| @element-plus/icons-vue | ^2.3.1 | 图标库（需新增） |
| @cloudbase/js-sdk | 2.16.0 | 云开发 SDK |
| Vite | 6.3.5 | 构建工具 |
| TailwindCSS | 3.4.17 | CSS 框架（已有，辅助使用） |

### 安装命令

```bash
pnpm add element-plus @element-plus/icons-vue
```

---

## 项目结构设计

```
admin/
├── public/
│   ├── school/                    # 学校资源
│   │   ├── school-logo-377x378.png
│   │   ├── school-logo-with-name-horizontal-1218x378.png
│   │   ├── school-motto-810x134.png
│   │   └── school-library-579x299.png
│   └── carousel/                  # 轮播图
│       └── *.jpg
├── src/
│   ├── main.js                    # 入口文件（配置 Element Plus）
│   ├── App.vue                    # 根组件
│   ├── style.css                  # 全局样式（BJUT 主题）
│   ├── utils/
│   │   ├── cloudbase.js           # 云开发配置
│   │   ├── api.js                 # 云函数调用封装（新增）
│   │   └── format.js              # 格式化工具（新增）
│   ├── components/
│   │   ├── Layout.vue             # 主布局组件（新增）
│   │   └── StatCard.vue           # 统计卡片组件（新增）
│   └── pages/
│       ├── LoginPage.vue          # 登录页（新增）
│       ├── DashboardPage.vue      # 数据看板（新增）
│       ├── ReviewPage.vue         # 申请审核（新增）
│       ├── SchedulePage.vue       # 排课管理（新增）
│       └── ResultPage.vue         # 排课结果（新增）
├── cloudfunctions/                # 云函数（新增）
│   ├── getBookingList/
│   ├── reviewBooking/
│   ├── autoSchedule/
│   ├── getStatistics/
│   └── getScheduleList/
├── index.html
├── vite.config.js
└── package.json
```

---

## 路由设计

### 路由表

| 路径 | 组件 | 名称 | 权限 |
|------|------|------|------|
| `/login` | LoginPage | 登录页 | 公开 |
| `/` | Layout（父路由） | 主布局 | 需登录 |
| `/dashboard` | DashboardPage | 数据看板 | 需登录 |
| `/review` | ReviewPage | 申请审核 | 需登录 |
| `/schedule` | SchedulePage | 排课管理 | 需登录 |
| `/result` | ResultPage | 排课结果 | 需登录 |

### 路由守卫

```javascript
router.beforeEach(async (to, from, next) => {
  // 检查是否已登录
  const auth = app.auth()
  const loginState = await auth.getLoginState()
  
  if (!loginState && to.path !== '/login') {
    // 未登录且访问非登录页，跳转到登录页
    next('/login')
  } else if (loginState && to.path === '/login') {
    // 已登录访问登录页，跳转到首页
    next('/dashboard')
  } else {
    next()
  }
})
```

---

## UI 设计规范

### 主题配色（BJUT 风格）

```css
/* BJUT 官方色 */
--bjut-blue: #0096C2;           /* 主色 */
--bjut-blue-light: #33AAD1;     /* 浅色 */
--bjut-blue-dark: #007399;      /* 深色 */

/* Element Plus 主题覆盖 */
--el-color-primary: #0096C2;
--el-color-success: #67C23A;
--el-color-warning: #E6A23C;
--el-color-danger: #F56C6C;
--el-color-info: #909399;

/* 背景色 */
--bg-page: #F5F5F5;
--bg-card: #FFFFFF;
--bg-menu: #F5F5F5;

/* 边框色 */
--border-color: #DCDCDC;
```

### 布局尺寸

```css
/* 左侧菜单 */
--menu-width-expanded: 200px;
--menu-width-collapsed: 64px;

/* 顶部导航 */
--header-height: 60px;

/* 内容区 */
--content-padding: 20px;
--card-radius: 4px;
```

### 组件规范

**卡片：**
- 使用 `el-card`
- 阴影：`shadow="hover"`
- 间距：margin-bottom: 20px

**表格：**
- 使用 `el-table`
- 边框：`:border="true"`
- 斑马纹：`:stripe="true"`
- 高亮：`:highlight-current-row="true"`

**按钮：**
- 主按钮：`type="primary"`（BJUT 蓝）
- 成功：`type="success"`
- 警告：`type="warning"`
- 危险：`type="danger"`

**标签：**
- 待审核：`type="warning"`
- 已通过：`type="success"`
- 已拒绝：`type="danger"`

---

## API 设计（云函数调用）

### 封装方式

```javascript
// src/utils/api.js
import { app } from './cloudbase'

/**
 * 调用云函数的通用方法
 */
async function callFunction(name, data = {}) {
  try {
    const res = await app.callFunction({
      name,
      data
    })
    
    if (res.result && res.result.success) {
      return res.result
    } else {
      throw new Error(res.result?.message || '调用失败')
    }
  } catch (error) {
    console.error(`[API] ${name} 调用失败:`, error)
    throw error
  }
}

/**
 * 获取申请列表
 */
export async function getBookingList(params) {
  return await callFunction('getBookingList', params)
}

/**
 * 审核申请
 */
export async function reviewBooking(params) {
  return await callFunction('reviewBooking', params)
}

// ... 其他API
```

### API 调用示例

```javascript
// 在组件中使用
import { getBookingList, reviewBooking } from '@/utils/api'
import { ElMessage } from 'element-plus'

// 查询列表
const fetchList = async () => {
  try {
    const res = await getBookingList({ status: 0 })
    tableData.value = res.data
  } catch (error) {
    ElMessage.error('加载失败: ' + error.message)
  }
}

// 审核通过
const handleApprove = async (bookingId) => {
  try {
    await reviewBooking({
      bookingId,
      action: 'approve'
    })
    ElMessage.success('审核成功')
    fetchList() // 刷新列表
  } catch (error) {
    ElMessage.error('审核失败: ' + error.message)
  }
}
```

---

## 数据流设计

### 申请审核流程

```
用户操作 → 前端组件 → API调用 → 云函数 → 数据库更新 → 返回结果 → 更新UI
```

**详细步骤：**

1. 用户点击"通过"按钮
2. 前端调用 `reviewBooking({ bookingId: 123, action: 'approve' })`
3. 云函数 `reviewBooking` 更新 `booking` 集合的 `status` 字段
4. 返回 `{ success: true, message: '审核成功' }`
5. 前端显示成功提示并刷新列表

### 自动排课流程

```
点击排课按钮 → 调用 autoSchedule → 匹配实验室 → 检测冲突 → 创建排课记录/返回冲突
```

**算法流程：**

1. 根据 `booking_id` 查询申请详情
2. 查询所有正常状态的实验室（`status = 1`）
3. 按容量从小到大排序
4. 遍历实验室：
   - 检查容量是否满足：`lab.capacity >= booking.student_count`
   - 检查时间是否冲突：查询 `schedule` 集合
   - 无冲突则创建排课记录并返回成功
5. 所有实验室都冲突则返回失败

---

## 云函数设计

### 函数 1: getBookingList

**文件路径：** `cloudfunctions/getBookingList/index.js`

**功能：** 查询申请列表

**参数：**
```javascript
{
  status: 0,      // 可选，0=待审核，1=已通过，2=已拒绝
  pageSize: 100   // 固定100（MVP不分页）
}
```

**实现逻辑：**
```javascript
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  try {
    const { status, pageSize = 100 } = event
    
    // 构建查询条件
    const where = { is_deleted: 0 }
    if (status !== undefined) {
      where.status = status
    }
    
    // 查询申请
    const { data } = await db.collection('booking')
      .where(where)
      .orderBy('create_time', 'desc')
      .limit(pageSize)
      .get()
    
    // 查询总数
    const { total } = await db.collection('booking')
      .where(where)
      .count()
    
    return {
      success: true,
      data,
      total
    }
  } catch (error) {
    console.error('[getBookingList] 失败:', error)
    return {
      success: false,
      message: error.message
    }
  }
}
```

---

### 函数 2: reviewBooking

**文件路径：** `cloudfunctions/reviewBooking/index.js`

**功能：** 审核申请

**参数：**
```javascript
{
  bookingId: 123,
  action: 'approve',    // approve=通过, reject=拒绝
  remark: '审核意见'    // 拒绝时必填
}
```

**实现逻辑：**
```javascript
exports.main = async (event, context) => {
  try {
    const { bookingId, action, remark } = event
    
    // 验证参数
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
    
    // 更新申请状态
    const updateData = {
      status: action === 'approve' ? 1 : 2,
      review_time: new Date(),
      review_remark: remark || null
    }
    
    await db.collection('booking')
      .where({ booking_id: bookingId })
      .update({
        data: updateData
      })
    
    return {
      success: true,
      message: action === 'approve' ? '审核通过' : '已拒绝'
    }
  } catch (error) {
    console.error('[reviewBooking] 失败:', error)
    return {
      success: false,
      message: error.message
    }
  }
}
```

---

### 函数 3: autoSchedule

**文件路径：** `cloudfunctions/autoSchedule/index.js`

**功能：** 自动排课

**参数：**
```javascript
{
  bookingId: 123
}
```

**核心算法：**
```javascript
// 检测时间冲突
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

// 主函数
exports.main = async (event, context) => {
  try {
    const { bookingId } = event
    
    // 1. 查询申请详情
    const { data: bookings } = await db.collection('booking')
      .where({ booking_id: bookingId })
      .get()
    
    if (bookings.length === 0) {
      return { success: false, message: '申请不存在' }
    }
    
    const booking = bookings[0]
    
    // 2. 查询时间段
    const { data: timeSlots } = await db.collection('booking_time_slots')
      .where({ booking_id: bookingId })
      .get()
    
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
      return { success: false, message: '没有满足条件的实验室' }
    }
    
    // 4. 遍历实验室检测冲突
    for (const lab of labs) {
      let hasConflict = false
      
      for (const slot of timeSlots) {
        if (await checkConflict(lab.lab_id, slot)) {
          hasConflict = true
          break
        }
      }
      
      // 5. 无冲突则创建排课记录
      if (!hasConflict) {
        for (const slot of timeSlots) {
          await db.collection('schedule').add({
            data: {
              schedule_id: Date.now(),
              booking_id: bookingId,
              lab_id: lab.lab_id,
              lab_name: lab.lab_name,
              course_name: booking.course_name,
              teacher_name: booking.teacher_name,
              weekday: slot.weekday,
              week_start: slot.week_start,
              week_end: slot.week_end,
              period_start: slot.period_start,
              period_end: slot.period_end,
              create_time: new Date(),
              is_deleted: 0
            }
          })
        }
        
        // 更新申请状态为已排课
        await db.collection('booking')
          .where({ booking_id: bookingId })
          .update({
            data: { is_scheduled: 1 }
          })
        
        return {
          success: true,
          message: '排课成功',
          data: {
            labId: lab.lab_id,
            labName: `${lab.building} ${lab.lab_room}`
          }
        }
      }
    }
    
    // 6. 所有实验室都冲突
    return {
      success: false,
      message: '所有实验室在该时间段都已被占用'
    }
  } catch (error) {
    console.error('[autoSchedule] 失败:', error)
    return {
      success: false,
      message: error.message
    }
  }
}
```

---

### 函数 4: getStatistics

**功能：** 获取统计数据

**返回：**
```javascript
{
  success: true,
  data: {
    pending: 5,      // 待审核数量
    total: 20,       // 本学期总数
    scheduled: 12,   // 已排课数量
    conflict: 0      // 冲突数量（MVP为0）
  }
}
```

---

### 函数 5: getScheduleList

**功能：** 查询排课结果

**参数：**
```javascript
{
  academicYear: '2025-2026',  // 可选
  semester: '第一学期'        // 可选
}
```

---

## 部署策略

### 云函数部署

```bash
# 在微信开发者工具中
# 1. 右键 cloudfunctions/xxx
# 2. 点击"上传并部署：云端安装依赖"
```

### 静态托管部署

```bash
# 1. 构建
pnpm build

# 2. 上传到静态托管
# 可使用 CloudBase CLI 或控制台上传 dist 目录
```

---

## 安全考虑

### 数据库权限

```javascript
// booking 集合权限规则
{
  "read": true,  // 所有人可读
  "write": "auth != null"  // 已登录可写
}

// schedule 集合权限规则
{
  "read": true,  // 所有人可读
  "write": false  // 仅云函数可写
}
```

### 云函数权限

- 所有云函数都需要登录后才能调用
- 敏感操作（审核、排课）需在云函数中验证权限

---

## 测试策略

### 单元测试（可选）

- 测试 API 调用封装
- 测试格式化工具函数

### 集成测试

1. 登录流程测试
2. 申请审核流程测试
3. 自动排课流程测试
4. 数据展示测试

### 手动测试清单

- [ ] 登录页正常加载
- [ ] 匿名登录成功
- [ ] 数据看板统计正确
- [ ] 申请列表加载正常
- [ ] 审核通过/拒绝功能正常
- [ ] 自动排课成功/失败提示正确
- [ ] 排课结果展示正常
- [ ] 路由跳转正常
- [ ] 响应式布局正常

---

**文档版本：** v1.0  
**创建时间：** 2025-11-05  
**技术确认：** 待用户确认

