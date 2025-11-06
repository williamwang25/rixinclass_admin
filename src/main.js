import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import './style.css'
import App from './App.vue'
import { ensureLogin } from './utils/cloudbase'

// 导入页面组件
import LoginPage from './pages/LoginPage.vue'
import Layout from './components/Layout.vue'
import DashboardPage from './pages/DashboardPage.vue'
import ReviewPage from './pages/ReviewPage.vue'
import SchedulePage from './pages/SchedulePage.vue'
import ResultPage from './pages/ResultPage.vue'
import LabManagePage from './pages/LabManagePage.vue'
import NoticePage from './pages/NoticePage.vue'
import UserManagePage from './pages/UserManagePage.vue'

// 定义路由
const routes = [
  { 
    path: '/login', 
    name: 'Login',
    component: LoginPage 
  },
  {
    path: '/',
    component: Layout,
    redirect: '/dashboard',
    children: [
      { 
        path: 'dashboard', 
        name: 'Dashboard',
        component: DashboardPage 
      },
      { 
        path: 'review', 
        name: 'Review',
        component: ReviewPage 
      },
      { 
        path: 'schedule', 
        name: 'Schedule',
        component: SchedulePage 
      },
      { 
        path: 'result', 
        name: 'Result',
        component: ResultPage 
      },
      { 
        path: 'labs', 
        name: 'Labs',
        component: LabManagePage 
      },
      { 
        path: 'notice', 
        name: 'Notice',
        component: NoticePage 
      },
      { 
        path: 'users', 
        name: 'Users',
        component: UserManagePage 
      }
    ]
  },
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' }
]

// 创建路由实例
const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// 路由守卫
router.beforeEach(async (to, from, next) => {
  if (to.path === '/login') {
    next()
    return
  }
  
  try {
    await ensureLogin()
    next()
  } catch (error) {
    console.error('登录检查失败:', error)
    next('/login')
  }
})

// 创建应用实例
const app = createApp(App)

// 注册 Element Plus 图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// 使用插件
app.use(router)
app.use(ElementPlus)

// 挂载应用
app.mount('#app') 