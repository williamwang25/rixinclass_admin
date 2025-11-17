// 云函数：管理系统配置（增删改）
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const { action, data: configData } = event
    
    console.log('[manageSysConfig] 开始处理')
    console.log('[manageSysConfig] 操作类型:', action)
    console.log('[manageSysConfig] 数据:', JSON.stringify(configData))
    
    if (!action) {
      return {
        success: false,
        message: '缺少操作类型参数'
      }
    }
    
    let result
    switch (action) {
      case 'update':
        result = await updateConfig(configData)
        break
      case 'batchUpdate':
        result = await batchUpdateConfig(configData)
        break
      default:
        result = {
          success: false,
          message: '不支持的操作类型: ' + action
        }
    }
    
    console.log('[manageSysConfig] 处理结果:', result)
    return result
    
  } catch (error) {
    console.error('[manageSysConfig] 错误:', error)
    return {
      success: false,
      message: error.message,
      error: error.toString()
    }
  }
}

// 更新单个配置
async function updateConfig(data) {
  try {
    const { configKey, configValue } = data
    
    console.log('[updateConfig] 开始更新单个配置')
    console.log('[updateConfig] 配置键:', configKey)
    console.log('[updateConfig] 配置值:', configValue)
    
    if (!configKey || configValue === undefined) {
      return {
        success: false,
        message: '缺少必填字段：配置键、配置值'
      }
    }
    
    const result = await db.collection('rx_sysconfig')
      .where({ config_key: configKey })
      .update({
        data: {
          config_value: configValue,
          update_time: db.serverDate()
        }
      })
    
    console.log('[updateConfig] 更新结果:', result)
    
    if (result.stats.updated === 0) {
      return {
        success: false,
        message: '配置不存在: ' + configKey
      }
    }
    
    console.log('[updateConfig] 更新成功:', configKey, '=', configValue)
    
    return {
      success: true,
      message: '配置更新成功'
    }
  } catch (error) {
    console.error('[updateConfig] 错误:', error)
    return {
      success: false,
      message: '更新失败: ' + error.message
    }
  }
}

// 批量更新配置
async function batchUpdateConfig(data) {
  try {
    const { configs } = data
    
    console.log('[batchUpdateConfig] 开始批量更新')
    console.log('[batchUpdateConfig] 配置数量:', configs ? configs.length : 0)
    console.log('[batchUpdateConfig] 配置列表:', JSON.stringify(configs))
    
    if (!configs || !Array.isArray(configs)) {
      return {
        success: false,
        message: '缺少配置列表或格式错误'
      }
    }
    
    if (configs.length === 0) {
      return {
        success: false,
        message: '配置列表为空'
      }
    }
    
    // 批量更新（如果不存在则创建）
    const updatePromises = configs.map(async (config, index) => {
      console.log(`[batchUpdateConfig] 处理第 ${index + 1} 项:`, config.configKey, '=', config.configValue)
      
      // 先查询是否存在
      const queryResult = await db.collection('rx_sysconfig')
        .where({ config_key: config.configKey })
        .get()
      
      console.log(`[batchUpdateConfig] 第 ${index + 1} 项查询结果:`, queryResult.data.length, '条记录')
      
      let result
      if (queryResult.data.length > 0) {
        // 存在则更新
        console.log(`[batchUpdateConfig] 更新第 ${index + 1} 项:`, config.configKey)
        result = await db.collection('rx_sysconfig')
          .where({ config_key: config.configKey })
          .update({
            data: {
              config_value: config.configValue,
              update_time: db.serverDate()
            }
          })
        console.log(`[batchUpdateConfig] 第 ${index + 1} 项更新结果:`, result)
      } else {
        // 不存在则创建
        console.log(`[batchUpdateConfig] 创建第 ${index + 1} 项:`, config.configKey)
        
        // 获取最大 config_id
        const maxIdResult = await db.collection('rx_sysconfig')
          .orderBy('config_id', 'desc')
          .limit(1)
          .get()
        
        const nextId = maxIdResult.data.length > 0 ? maxIdResult.data[0].config_id + 1 : 1
        
        result = await db.collection('rx_sysconfig')
          .add({
            data: {
              config_id: nextId,
              config_key: config.configKey,
              config_value: config.configValue,
              config_type: 'system',
              description: getConfigDescription(config.configKey),
              create_time: db.serverDate(),
              update_time: db.serverDate(),
              create_user: null,
              update_user: null
            }
          })
        console.log(`[batchUpdateConfig] 第 ${index + 1} 项创建结果:`, result)
        result.stats = { updated: 1 } // 标记为成功
      }
      
      return {
        configKey: config.configKey,
        updated: result.stats.updated || 0
      }
    })
    
    const results = await Promise.all(updatePromises)
    
    console.log('[batchUpdateConfig] 所有更新结果:', results)
    
    // 检查是否有更新失败的
    const failedUpdates = results.filter(r => r.updated === 0)
    if (failedUpdates.length > 0) {
      console.warn('[batchUpdateConfig] 部分配置更新失败:', failedUpdates)
    }
    
    const successCount = results.filter(r => r.updated > 0).length
    
    console.log('[batchUpdateConfig] 批量更新完成:', successCount, '/', configs.length)
    
    return {
      success: true,
      message: `成功更新 ${successCount}/${configs.length} 项配置`,
      details: results
    }
  } catch (error) {
    console.error('[batchUpdateConfig] 错误:', error)
    return {
      success: false,
      message: '批量更新失败: ' + error.message,
      error: error.toString()
    }
  }
}

// 获取配置项描述
function getConfigDescription(configKey) {
  const descriptions = {
    'current_academic_year': '当前学年',
    'current_semester': '当前学期',
    'booking_start_date': '申请开始日期',
    'booking_end_date': '申请截止日期',
    'max_weeks': '最大教学周数',
    'max_periods_per_day': '每天最大节次数'
  }
  return descriptions[configKey] || configKey
}
