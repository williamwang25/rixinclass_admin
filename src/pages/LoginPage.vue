<template>
  <div class="login-page">
    <div class="login-left">
      <el-carousel height="100vh" :interval="5000" arrow="never">
        <el-carousel-item v-for="i in 6" :key="i">
          <img :src="`/carousel/image${i}.jpg`" alt="校园风景" class="carousel-image" />
        </el-carousel-item>
      </el-carousel>
    </div>
    
    <div class="login-right">
      <div class="logo-container">
        <img src="/school/school-logo-with-name-horizontal-1218x378.png" alt="BJUT Logo" class="logo" />
      </div>
      
      <div class="login-card">
        <h1 class="title">日新智课</h1>
        <p class="subtitle">北京工业大学智慧排课系统 管理员后台</p>
        
        <div class="login-header">
          <span class="header-text">管理员登录</span>
          <div class="header-line"></div>
        </div>
        
        <el-form :model="loginForm" class="login-form">
          <el-form-item>
            <el-input
              v-model="loginForm.username"
              placeholder="请输入用户名"
              size="large"
              clearable
              prefix-icon="User"
              @keyup.enter="handleLogin"
            />
          </el-form-item>
          
          <el-form-item>
            <el-input
              v-model="loginForm.password"
              type="password"
              placeholder="请输入密码"
              size="large"
              clearable
              show-password
              prefix-icon="Lock"
              @keyup.enter="handleLogin"
            />
          </el-form-item>
          
          <el-form-item>
            <el-button 
              type="primary" 
              size="large" 
              :loading="loading"
              @click="handleLogin"
              class="login-button"
            >
              <span>{{ loading ? '登录中...' : '登录' }}</span>
            </el-button>
          </el-form-item>
        </el-form>
      </div>
      
      <div class="motto">
        <img src="/school/school-motto-810x134.png" alt="校训" class="motto-img" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

const router = useRouter()
const loading = ref(false)

// 登录表单数据
const loginForm = reactive({
  username: '',
  password: ''
})

// 默认账号密码
const DEFAULT_USERNAME = 'bjutadmin'
const DEFAULT_PASSWORD = 'bjutadmin'

const handleLogin = async () => {
  // 验证用户名和密码
  if (!loginForm.username || !loginForm.password) {
    ElMessage.warning('请输入用户名和密码')
    return
  }
  
  if (loginForm.username !== DEFAULT_USERNAME || loginForm.password !== DEFAULT_PASSWORD) {
    ElMessage.error('用户名或密码错误')
    return
  }
  
  loading.value = true
  
  try {
    // 模拟登录延迟
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // 保存登录状态到 localStorage
    localStorage.setItem('adminLoggedIn', 'true')
    localStorage.setItem('adminUsername', loginForm.username)
    
    ElMessage.success('登录成功')
    router.push('/dashboard')
  } catch (error) {
    console.error('登录失败:', error)
    ElMessage.error('登录失败: ' + error.message)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  display: flex;
  height: 100vh;
  background: #fff;
}

.login-left {
  flex: 1;
  position: relative;
}

.carousel-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.login-right {
  width: 500px;
  display: flex;
  flex-direction: column;
  padding: 40px;
  background: rgba(220, 226, 238, 0.7);
  position: relative;
}

.logo-container {
  position: absolute;
  top: 30px;
  left: 30px;
  z-index: 10;
}

.logo {
  width: 200px;
  height: auto;
}

.login-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
  text-align: center;
}

.title {
  font-size: 48px;
  font-weight: normal;
  color: var(--bjut-blue);
  margin: 20px 0 10px;
  letter-spacing: 2px;
  text-align: left;
}

.subtitle {
  font-size: 20px;
  color: #333;
  margin-bottom: 30px;
  text-align: left;
  line-height: 2;
}

.login-header {
  position: relative;
  margin-bottom: 30px;
  text-align: center;
}

.header-text {
  font-size: 20px;
  color: var(--bjut-blue);
  font-weight: bold;
  display: block;
  margin-bottom: 10px;
}

.header-line {
  width: 100%;
  height: 3px;
  background: var(--bjut-blue);
}

.login-form {
  margin-top: 0px;
}

.login-form :deep(.el-input__inner) {
  font-size: 16px;
}

.login-button {
  width: 100%;
  height: 50px;
  font-size: 18px;
}

.motto {
  position: absolute;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
}

.motto-img {
  width: 250px;
  height: auto;
  opacity: 0.5;
}

@media (max-width: 768px) {
  .login-left {
    display: none;
  }
  
  .login-right {
    width: 100%;
  }
}
</style>

