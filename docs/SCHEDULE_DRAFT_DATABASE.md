# 排课草稿数据库设计文档

## 数据库集合：schedule_draft

### 集合说明
存储自动排课生成的初步排课方案，等待管理员审核。审核通过后才会移动到正式的 `schedule` 表中。

### 字段定义

| 字段名 | 类型 | 必填 | 说明 | 示例值 |
|--------|------|------|------|--------|
| draft_id | Number | 是 | 草稿ID（主键） | 1731763200001 |
| booking_id | Number | 是 | 关联的申请ID | 1731763200000 |
| booking_no | String | 是 | 申请编号 | "BK20251116-0001" |
| lab_id | Number | 是 | 实验室ID | 101 |
| lab_name | String | 是 | 实验室名称 | "计算机实验室1" |
| building | String | 是 | 楼栋 | "软件楼" |
| lab_room | String | 是 | 房间号 | "505" |
| course_code | String | 否 | 课程代码 | "8153.0" |
| course_name | String | 是 | 课程名称 | "计算机网络实验" |
| course_type | String | 是 | 课程类型 | "实验教学" |
| class_name | String | 否 | 班级 | "230801;230802" |
| required_hours | Number | 否 | 所需学时 | 32 |
| booking_hours | Number | 否 | 申请学时 | 32 |
| student_count | Number | 是 | 学生人数 | 79 |
| teacher_name | String | 是 | 教师姓名 | "朱婉婷" |
| teacher_phone | String | 否 | 教师电话 | "13811152938" |
| teacher_email | String | 否 | 教师邮箱 | "zhuwt@bjut.edu.cn" |
| software_requirements | String | 否 | 软件环境要求 | "Wireshark" |
| other_requirements | String | 否 | 其他要求 | "网络环境要求" |
| weekday | Number | 是 | 星期几（1-7） | 2 |
| week_start | Number | 是 | 开始周次 | 9 |
| week_end | Number | 是 | 结束周次 | 16 |
| period_start | Number | 是 | 开始节次 | 5 |
| period_end | Number | 是 | 结束节次 | 8 |
| academic_year | String | 是 | 学年 | "2025-2026" |
| semester | String | 是 | 学期 | "第一学期" |
| is_manual | Number | 是 | 是否手动排课 | 0=自动, 1=手动 |
| create_time | Date | 是 | 创建时间 | ISODate("2025-11-16T15:00:00.000Z") |
| is_deleted | Number | 是 | 软删除标记 | 0=正常, 1=已删除 |

### 设计要点

1. **临时性质**：草稿表中的数据是临时的，审核通过后会移动到 `schedule` 表
2. **快照数据**：包含完整的课程、教师、实验室信息快照，避免关联查询
3. **一对多关系**：一个申请可能有多条草稿记录（多个时间段）
4. **审核后处理**：
   - 审核通过：移动到 `schedule` 表，删除草稿
   - 审核拒绝：直接删除草稿

### 索引建议

```javascript
// 按申请ID查询
db.schedule_draft.createIndex({ "booking_id": 1 })

// 按实验室和时间查询（冲突检测）
db.schedule_draft.createIndex({ 
  "lab_id": 1, 
  "weekday": 1, 
  "week_start": 1, 
  "week_end": 1 
})

// 按创建时间查询
db.schedule_draft.createIndex({ "create_time": -1 })
```

### 示例数据

```json
{
  "draft_id": 1731763200001,
  "booking_id": 1731763200000,
  "booking_no": "BK20251116-0001",
  "lab_id": 101,
  "lab_name": "计算机实验室1",
  "building": "软件楼",
  "lab_room": "505",
  "course_code": "8153.0",
  "course_name": "计算机网络实验",
  "course_type": "实验教学",
  "class_name": "230801;230802;230803",
  "required_hours": 32,
  "booking_hours": 32,
  "student_count": 79,
  "teacher_name": "朱婉婷",
  "teacher_phone": "13811152938",
  "teacher_email": "zhuwt@bjut.edu.cn",
  "software_requirements": "Wireshark",
  "other_requirements": "网络环境要求：能够连接互联网。",
  "weekday": 2,
  "week_start": 9,
  "week_end": 16,
  "period_start": 5,
  "period_end": 8,
  "academic_year": "2025-2026",
  "semester": "第一学期",
  "is_manual": 0,
  "create_time": "2025-11-16T15:00:00.000Z",
  "is_deleted": 0
}
```

### 与其他表的关系

```
booking (申请表)
  ↓ 自动排课
schedule_draft (草稿表) ← 管理员审核
  ↓ 审核通过
schedule (正式排课表)
```

### 状态流转

```
1. 申请提交: booking.status = 0 (待排课)
2. 自动排课: 
   - 创建 schedule_draft 记录
   - booking.status = 3 (已排课待审核)
3. 管理员审核:
   - 通过: 移动到 schedule, booking.status = 1
   - 拒绝: 删除 schedule_draft, booking.status = 2
```
