# 排课日志数据库设计文档

## 数据库集合：schedulelog

### 集合说明
记录管理员的所有排课操作，包括自动排课和手动排课的详细信息，成功和失败的原因分析。

### 字段设计

| 字段名 | 类型 | 必填 | 说明 | 示例值 |
|--------|------|------|------|--------|
| log_id | Number | 是 | 日志唯一标识 | 1 |
| booking_id | Number | 是 | 关联的申请ID | 12345 |
| booking_no | String | 是 | 申请编号 | "BK20241116-001" |
| admin_user_id | Number | 是 | 操作管理员ID | 2 |
| admin_name | String | 是 | 操作管理员姓名 | "管理员张三" |
| action_type | String | 是 | 操作类型 | "auto_schedule" / "manual_schedule" |
| action_result | String | 是 | 操作结果 | "success" / "failure" |
| lab_id | Number | 否 | 实验室ID（成功时有值） | 101 |
| lab_name | String | 否 | 实验室名称 | "软件楼505" |
| building | String | 否 | 实验室楼栋 | "软件楼" |
| lab_room | String | 否 | 实验室房间号 | "505" |
| student_count | Number | 是 | 申请学生人数 | 30 |
| lab_capacity | Number | 否 | 实验室容量（成功时有值） | 40 |
| software_requirements | String | 否 | 软件环境要求 | "Adobe Photoshop 2020" |
| matched_software | String | 否 | 匹配的软件环境（成功时有值） | "Adobe Photoshop 2020, Windows 10" |
| match_reason | String | 否 | 匹配成功原因 | "实验室容量充足，软件环境完全匹配" |
| failure_reason | String | 否 | 失败原因 | "无可用实验室：容量不足" |
| time_slots | Array | 是 | 时间段信息 | [{"weekday":1,"week_start":1,"week_end":16,"period_start":3,"period_end":4}] |
| course_name | String | 是 | 课程名称 | "计算机图形学实验" |
| teacher_name | String | 是 | 教师姓名 | "李教授" |
| academic_year | String | 是 | 学年 | "2024-2025" |
| semester | String | 是 | 学期 | "第一学期" |
| create_time | Date | 是 | 创建时间 | "2024-11-16T14:30:00.000Z" |
| create_user | Number | 是 | 创建用户ID | 2 |
| update_time | Date | 是 | 更新时间 | "2024-11-16T14:30:00.000Z" |
| update_user | Number | 否 | 更新用户ID | null |
| is_deleted | Number | 是 | 软删除标记 | 0 |

### 操作类型说明
- **auto_schedule**: 自动排课
- **manual_schedule**: 手动排课

### 操作结果说明
- **success**: 排课成功
- **failure**: 排课失败

### 匹配成功原因示例
- "实验室容量充足(40>=30)，软件环境完全匹配"
- "管理员手动选择，实验室容量充足(30>=25)，软件环境匹配"
- "实验室容量充足，部分软件环境匹配(缺少XXX软件)"

### 失败原因示例
- "无可用实验室：所有实验室容量不足"
- "无可用实验室：软件环境不匹配"
- "无可用实验室：时间冲突"
- "无可用实验室：容量不足且软件环境不匹配"

### 索引建议
- booking_id（用于查询特定申请的排课日志）
- admin_user_id（用于查询特定管理员的操作记录）
- action_type（用于按操作类型筛选）
- action_result（用于按结果筛选）
- create_time（用于按时间排序）

### 数据示例

```json
{
  "log_id": 1,
  "booking_id": 12345,
  "booking_no": "BK20241116-001",
  "admin_user_id": 2,
  "admin_name": "管理员张三",
  "action_type": "auto_schedule",
  "action_result": "success",
  "lab_id": 101,
  "lab_name": "软件楼505",
  "building": "软件楼",
  "lab_room": "505",
  "student_count": 30,
  "lab_capacity": 40,
  "software_requirements": "Adobe Photoshop 2020, AutoCAD 2021",
  "matched_software": "Adobe Photoshop 2020, AutoCAD 2021, Windows 10",
  "match_reason": "实验室容量充足(40>=30)，软件环境完全匹配",
  "failure_reason": null,
  "time_slots": [
    {
      "weekday": 1,
      "week_start": 1,
      "week_end": 16,
      "period_start": 3,
      "period_end": 4
    }
  ],
  "course_name": "计算机图形学实验",
  "teacher_name": "李教授",
  "academic_year": "2024-2025",
  "semester": "第一学期",
  "create_time": "2024-11-16T14:30:00.000Z",
  "create_user": 2,
  "update_time": "2024-11-16T14:30:00.000Z",
  "update_user": null,
  "is_deleted": 0
}
```
