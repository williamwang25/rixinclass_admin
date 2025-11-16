<template>
  <div class="layout-container">
    <el-container class="full-height">
      <!-- 左侧菜单 -->
      <el-aside :width="isCollapse ? '64px' : '200px'" class="aside-menu">
        <div class="logo-container">
          <img v-if="!isCollapse" src="/school/school-logo-with-name-horizontal-1218x378.png" alt="Logo" class="logo" />
          <img v-else src="/school/school-logo-377x378.png" alt="Logo" class="logo-small" />
        </div>
        
        <el-menu
          :default-active="activeMenu"
          :collapse="isCollapse"
          :unique-opened="true"
          router
        >
          <el-menu-item index="/dashboard">
            <el-icon><DataBoard /></el-icon>
            <template #title>数据看板</template>
          </el-menu-item>
          
          
          <el-menu-item index="/schedule">
            <el-icon><Calendar /></el-icon>
            <template #title>排课管理</template>
          </el-menu-item>

          <el-menu-item index="/review">
            <el-icon><DocumentChecked /></el-icon>
            <template #title>排课审核</template>
          </el-menu-item>
          
          <el-menu-item index="/result">
            <el-icon><List /></el-icon>
            <template #title>排课结果</template>
          </el-menu-item>
          
          <el-menu-item index="/schedule-log">
            <el-icon><Document /></el-icon>
            <template #title>排课日志</template>
          </el-menu-item>
          
          <el-menu-item index="/labs">
            <el-icon><OfficeBuilding /></el-icon>
            <template #title>实验室管理</template>
          </el-menu-item>
          
          <el-menu-item index="/notice">
            <el-icon><Bell /></el-icon>
            <template #title>公告管理</template>
          </el-menu-item>
          
          <el-menu-item index="/users">
            <el-icon><User /></el-icon>
            <template #title>用户管理</template>
          </el-menu-item>
        </el-menu>
      </el-aside>
      
      <!-- 右侧主内容区 -->
      <el-container class="main-container">
        <!-- 顶部导航 -->
        <el-header class="header">
          <el-button
            :icon="isCollapse ? Expand : Fold"
            circle
            @click="toggleCollapse"
          />
          
          <div class="spacer"></div>
          
          <span class="username">管理员</span>
          
          <el-dropdown @command="handleCommand">
            <el-icon class="avatar-icon"><UserFilled /></el-icon>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout">
                  <el-icon><SwitchButton /></el-icon>
                  退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </el-header>
        
        <!-- 内容区 -->
        <el-main class="main-content">
          <router-view />
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  DataBoard, 
  DocumentChecked, 
  Calendar, 
  List,
  OfficeBuilding,
  Bell,
  User,
  UserFilled,
  SwitchButton,
  Expand,
  Fold,
  Document
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()

const isCollapse = ref(false)

const activeMenu = computed(() => route.path)

const toggleCollapse = () => {
  isCollapse.value = !isCollapse.value
}

const handleCommand = async (command) => {
  if (command === 'logout') {
    try {
      await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
      
      // 清除登录状态并跳转
      router.push('/login')
      ElMessage.success('已退出登录')
    } catch {
      // 用户取消
    }
  }
}
</script>

<style scoped>
.layout-container {
  height: 100%;
}

.full-height {
  height: 100%;
}

.aside-menu {
  background: var(--bg-menu);
  border-right: 1px solid var(--border-color);
  transition: width 0.3s;
}

.logo-container {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid var(--border-color);
  padding: 10px;
}

.logo {
  height: 40px;
  width: auto;
}

.logo-small {
  height: 32px;
  width: 32px;
}

.el-menu {
  border-right: none;
}

.main-container {
  display: flex;
  flex-direction: column;
}

.header {
  height: 60px !important;
  background: #fff;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  padding: 0 20px;
  gap: 15px;
}

.spacer {
  flex: 1;
}

.username {
  font-size: 14px;
  color: #606266;
}

.avatar-icon {
  font-size: 28px;
  color: var(--bjut-blue);
  cursor: pointer;
  transition: color 0.3s;
}

.avatar-icon:hover {
  color: var(--bjut-blue-light);
}

.main-content {
  background: var(--bg-page);
  padding: 0;
}
</style>

