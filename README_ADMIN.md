# 日新智课 - 管理员后台系统

北京工业大学智慧排课系统管理员端

## 项目概述

基于 **Vue 3 + Element Plus + 腾讯云开发 CloudBase** 的 Web 管理系统，用于审核教师排课申请和自动分配实验室。

### 技术栈

- **前端框架：** Vue 3 (Composition API)
- **UI 组件库：** Element Plus
- **路由：** Vue Router 4
- **构建工具：** Vite 6.3.5
- **云开发 SDK：** @cloudbase/js-sdk 2.16.0
- **后端服务：** 腾讯云开发 (CloudBase)
- **数据库：** 云数据库（NoSQL）

---

## 功能模块

### 1. 数据看板
- 待审核申请数量统计
- 本学期申请总数统计
- 已排课数量统计
- 冲突数量统计（MVP版本暂为0）
- 快速跳转到审核和结果页面

### 2. 申请审核 ⭐ 已增强
- 查看所有申请列表
- 按状态筛选（待审核/已通过/已拒绝）
- 查看申请详情（含时间段信息）
- 单个审核通过操作
- 单个审核拒绝操作（需填写理由）
- **✨ 批量通过申请**（多选批量审核）

### 3. 排课管理 ⭐ 已增强
- 查看已通过但未排课的申请
- 单个申请自动排课
- 批量自动排课
- 自动匹配实验室容量
- 自动检测时间冲突
- **✨ 手动排课功能**（选择指定实验室）
- **✨ 自动排课失败时提示手动排课**

### 4. 排课结果
- 查看所有排课记录
- 按学年学期筛选
- 显示实验室和时间段信息

### 5. 实验室管理 ⭐ 新增
- 查看所有实验室列表
- 按状态筛选（正常/维护中/停用）
- 新增实验室
- 编辑实验室信息
- 删除实验室（软删除）
- 查看实验室详情

---

## 项目结构

```
admin/
├── public/
│   ├── school/                    # BJUT 学校资源
│   └── carousel/                  # 校园轮播图
├── src/
│   ├── main.js                    # 入口文件
│   ├── App.vue                    # 根组件
│   ├── style.css                  # 全局样式（BJUT 主题）
│   ├── utils/
│   │   ├── cloudbase.js           # 云开发配置
│   │   ├── api.js                 # 云函数调用封装
│   │   └── format.js              # 格式化工具
│   ├── components/
│   │   ├── Layout.vue             # 主布局组件
│   │   └── StatCard.vue           # 统计卡片组件
│   └── pages/
│       ├── LoginPage.vue          # 登录页
│       ├── DashboardPage.vue      # 数据看板
│       ├── ReviewPage.vue         # 申请审核
│       ├── SchedulePage.vue       # 排课管理
│       └── ResultPage.vue         # 排课结果
├── cloudfunctions/                # 云函数
│   ├── getStatistics/             # 获取统计数据
│   ├── getBookingList/            # 获取申请列表
│   ├── reviewBooking/             # 审核申请
│   ├── autoSchedule/              # 自动排课
│   └── getScheduleList/           # 获取排课结果
├── package.json
└── vite.config.js
```

---

## 快速开始

### 1. 安装依赖

```bash
cd admin
pnpm install
```

### 2. 配置环境

云开发环境ID已配置：`cloud1-1gt445eta224436c`

### 3. 本地开发

```bash
pnpm dev
```

访问：http://localhost:5173

### 4. 构建生产版本

```bash
pnpm build
```

---

## 云函数部署

### 方法一：微信开发者工具（推荐）

1. 使用微信开发者工具打开项目根目录
2. 右键 `cloudfunctions/getStatistics` → 上传并部署：云端安装依赖
3. 依次部署其他云函数：
   - `getBookingList`
   - `reviewBooking`
   - `autoSchedule`
   - `getScheduleList`

### 方法二：CloudBase CLI

```bash
# 安装 CLI
npm install -g @cloudbase/cli

# 登录
tcb login

# 部署云函数
tcb fn deploy getStatistics --dir admin/cloudfunctions/getStatistics
tcb fn deploy getBookingList --dir admin/cloudfunctions/getBookingList
tcb fn deploy reviewBooking --dir admin/cloudfunctions/reviewBooking
tcb fn deploy autoSchedule --dir admin/cloudfunctions/autoSchedule
tcb fn deploy getScheduleList --dir admin/cloudfunctions/getScheduleList
```

---

## 静态网站托管部署

### 方法一：控制台上传

1. 构建项目：`pnpm build`
2. 登录[腾讯云开发控制台](https://console.cloud.tencent.com/tcb)
3. 进入环境 `cloud1-1gt445eta224436c` → 静态网站托管
4. 上传 `dist` 目录中的所有文件

### 方法二：CLI 部署

```bash
# 构建
pnpm build

# 部署到静态托管
tcb hosting deploy dist -e cloud1-1gt445eta224436c
```

---

## 云开发资源

### 云函数列表（8个）

| 函数名 | 功能 | 超时时间 | 内存 | 控制台链接 |
|--------|------|---------|------|-----------|
| getStatistics | 获取统计数据 | 15秒 | 256MB | [查看](https://tcb.cloud.tencent.com/dev?envId=cloud1-1gt445eta224436c#/scf/detail?id=getStatistics&NameSpace=cloud1-1gt445eta224436c) |
| getBookingList | 获取申请列表 | 15秒 | 256MB | [查看](https://tcb.cloud.tencent.com/dev?envId=cloud1-1gt445eta224436c#/scf/detail?id=getBookingList&NameSpace=cloud1-1gt445eta224436c) |
| reviewBooking | 审核申请 | 15秒 | 256MB | [查看](https://tcb.cloud.tencent.com/dev?envId=cloud1-1gt445eta224436c#/scf/detail?id=reviewBooking&NameSpace=cloud1-1gt445eta224436c) |
| autoSchedule | 自动排课 | 30秒 | 512MB | [查看](https://tcb.cloud.tencent.com/dev?envId=cloud1-1gt445eta224436c#/scf/detail?id=autoSchedule&NameSpace=cloud1-1gt445eta224436c) |
| getScheduleList | 获取排课结果 | 15秒 | 256MB | [查看](https://tcb.cloud.tencent.com/dev?envId=cloud1-1gt445eta224436c#/scf/detail?id=getScheduleList&NameSpace=cloud1-1gt445eta224436c) |
| **manualSchedule** | **手动排课** ⭐ | 20秒 | 256MB | [查看](https://tcb.cloud.tencent.com/dev?envId=cloud1-1gt445eta224436c#/scf/detail?id=manualSchedule&NameSpace=cloud1-1gt445eta224436c) |
| **getLabList** | **获取实验室列表** ⭐ | 15秒 | 256MB | [查看](https://tcb.cloud.tencent.com/dev?envId=cloud1-1gt445eta224436c#/scf/detail?id=getLabList&NameSpace=cloud1-1gt445eta224436c) |
| **manageLabOperation** | **实验室增删改** ⭐ | 15秒 | 256MB | [查看](https://tcb.cloud.tencent.com/dev?envId=cloud1-1gt445eta224436c#/scf/detail?id=manageLabOperation&NameSpace=cloud1-1gt445eta224436c) |

**标注 ⭐ 的为本次新增功能**

### 数据库集合

| 集合名 | 用途 | 控制台链接 |
|--------|------|-----------|
| booking | 排课申请记录 | [查看](https://tcb.cloud.tencent.com/dev?envId=cloud1-1gt445eta224436c#/db/doc/collection/booking) |
| booking_time_slots | 申请时间段 | [查看](https://tcb.cloud.tencent.com/dev?envId=cloud1-1gt445eta224436c#/db/doc/collection/booking_time_slots) |
| labs | 实验室信息 | [查看](https://tcb.cloud.tencent.com/dev?envId=cloud1-1gt445eta224436c#/db/doc/collection/labs) |
| schedule | 排课结果 | [查看](https://tcb.cloud.tencent.com/dev?envId=cloud1-1gt445eta224436c#/db/doc/collection/schedule) |
| rx_user | 用户信息 | [查看](https://tcb.cloud.tencent.com/dev?envId=cloud1-1gt445eta224436c#/db/doc/collection/rx_user) |

### 静态托管

- **控制台：** https://console.cloud.tencent.com/tcb/hosting
- **默认域名：** 部署后获取

---

## 设计规范

### BJUT 主题配色

- **主色：** `#0096C2`（BJUT 蓝）
- **成功：** `#67C23A`（绿色）
- **警告：** `#E6A23C`（橙色）
- **危险：** `#F56C6C`（红色）
- **背景：** `#F5F5F5`（浅灰）

### 布局规范

- **左侧菜单宽度：** 200px（展开）/ 64px（收起）
- **顶部导航高度：** 60px
- **内容区边距：** 20px

---

## 常见问题

### 1. 云函数调用失败

**问题：** 前端调用云函数返回错误

**解决：**
- 检查云函数是否已部署
- 检查云函数日志：控制台 → 云函数 → 选择函数 → 日志
- 确认环境ID配置正确

### 2. 数据库权限错误

**问题：** 前端无法读取数据库数据

**解决：**
- 使用云函数操作数据库（推荐）
- 或配置数据库权限规则（控制台 → 数据库 → 权限设置）

### 3. 登录失败

**问题：** 点击"进入系统"无反应

**解决：**
- 检查浏览器控制台错误
- 确认已开启 CloudBase 匿名登录（控制台 → 环境设置 → 登录授权）

---

## 开发说明

### 添加新页面

1. 在 `src/pages/` 创建 Vue 组件
2. 在 `src/main.js` 中导入并添加路由
3. 在 `src/components/Layout.vue` 菜单中添加菜单项

### 添加新云函数

1. 在 `cloudfunctions/` 创建函数目录
2. 创建 `index.js` 和 `package.json`
3. 在 `src/utils/api.js` 中添加调用方法
4. 部署云函数

### 修改主题色

编辑 `src/style.css` 中的 CSS 变量：

```css
:root {
  --bjut-blue: #0096C2;  /* 修改这里 */
}
```

---

## 技术支持

- **腾讯云开发文档：** https://cloud.tencent.com/document/product/876
- **Element Plus 文档：** https://element-plus.org/zh-CN/
- **Vue 3 文档：** https://cn.vuejs.org/

---

## 项目信息

- **项目名称：** 日新智课管理员后台
- **版本：** v1.0.0 (MVP)
- **开发时间：** 2025-11-05
- **云开发环境：** cloud1-1gt445eta224436c
- **维护状态：** ✅ 持续维护

