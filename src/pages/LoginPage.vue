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
      <div class="login-card">
        <div class="logo-container">
          <img src="/school/school-logo-with-name-horizontal-1218x378.png" alt="BJUT Logo" class="logo" />
        </div>
        
        <h1 class="title">日新智课排课系统</h1>
        <p class="subtitle">管理员后台</p>
        
        <el-button 
          type="primary" 
          size="large" 
          :loading="loading"
          @click="handleLogin"
          class="login-button"
        >
          <el-icon v-if="!loading"><House /></el-icon>
          <span>{{ loading ? '登录中...' : '进入系统' }}</span>
        </el-button>
        
        <div class="motto">
          <img src="/school/school-motto-810x134.png" alt="校训" class="motto-img" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { House } from '@element-plus/icons-vue'
import { ensureLogin } from '../utils/cloudbase'

const router = useRouter()
const loading = ref(false)

const handleLogin = async () => {
  loading.value = true
  
  try {
    await ensureLogin()
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
  align-items: center;
  justify-content: center;
  padding: 40px;
  background: #f5f5f5;
}

.login-card {
  width: 100%;
  max-width: 400px;
  text-align: center;
}

.logo-container {
  margin-bottom: 30px;
}

.logo {
  width: 100%;
  max-width: 300px;
  height: auto;
}

.title {
  font-size: 28px;
  font-weight: bold;
  color: var(--bjut-blue);
  margin: 20px 0 10px;
}

.subtitle {
  font-size: 16px;
  color: #666;
  margin-bottom: 40px;
}

.login-button {
  width: 100%;
  height: 50px;
  font-size: 16px;
}

.motto {
  margin-top: 60px;
}

.motto-img {
  width: 100%;
  max-width: 250px;
  height: auto;
  opacity: 0.6;
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

