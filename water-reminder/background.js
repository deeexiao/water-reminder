// 导入植物图标类
// 修改导入方式，Service Worker不支持self.importScripts
// self.importScripts('plant-icon.js');
// 改为使用importScripts
// 移除这段代码
// try {
//   importScripts('plant-icon.js');
// } catch (error) {
//   console.error('导入植物图标类失败:', error);
// }

// 替换为内联实现或使用其他方式
// 由于Service Worker不支持importScripts导入模块，我们需要直接在background.js中实现必要的功能

// 防止重复通知的时间戳
let lastNotificationTime = 0;

// 初始化
chrome.runtime.onInstalled.addListener(function() {
  // 设置默认值
  chrome.storage.local.get(['startTime', 'endTime', 'interval', 'currentCups', 'lastUpdated', 'notificationSound'], function(data) {
    if (!data.startTime) {
      chrome.storage.local.set({ startTime: '08:00' });
    }
    if (!data.endTime) {
      chrome.storage.local.set({ endTime: '22:00' });
    }
    if (!data.interval) {
      chrome.storage.local.set({ interval: 60 });
    }
    if (!data.lastUpdated || data.lastUpdated !== new Date().toDateString()) {
      chrome.storage.local.set({ 
        currentCups: 0,
        lastUpdated: new Date().toDateString()
      });
    }
    
    if (data.notificationSound === undefined) {
      chrome.storage.local.set({ notificationSound: true });
    }
    
    // 设置提醒
    setupAlarms();
    
    // 更新图标
    updateIcon();
  });
});

// 监听存储变化
chrome.storage.onChanged.addListener(function(changes, namespace) {
  if (namespace === 'local' && (changes.currentCups || changes.cupsGoal)) {
    updateIcon();
  }
});

// 更新扩展图标
function updateIcon() {
  chrome.storage.local.get(['currentCups', 'cupsGoal'], function(data) {
    const currentCups = data.currentCups || 0;
    const cupsGoal = data.cupsGoal || 8;
    
    try {
      // 创建canvas
      const canvas = new OffscreenCanvas(128, 128);
      const ctx = canvas.getContext('2d');
      
      if (currentCups === 0) {
        // 当杯数为0时，绘制水滴图标
        drawWaterDrop(ctx, canvas.width, canvas.height);
        chrome.action.setBadgeText({ text: '' }); // 不显示徽章
      } else {
        // 简单绘制一个圆形代替植物图标
        drawSimpleIcon(ctx, canvas.width, canvas.height, currentCups, cupsGoal);
        
        // 设置徽章文本
        chrome.action.setBadgeText({ text: currentCups.toString() });
        chrome.action.setBadgeBackgroundColor({ color: [76, 175, 80, 128] }); // 半透明绿色
        chrome.action.setBadgeTextColor({ color: '#FFFFFF' }); // 白色文字
      }
      
      // 获取图像数据
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // 设置图标
      chrome.action.setIcon({ imageData: imageData });
    } catch (error) {
      console.error('更新图标失败:', error);
      // 使用静态图标作为备用
      chrome.action.setIcon({ path: 'icon.png' });
      
      // 仍然设置徽章
      if (currentCups > 0) {
        chrome.action.setBadgeText({ text: currentCups.toString() });
        chrome.action.setBadgeBackgroundColor({ color: [76, 175, 80, 128] });
        chrome.action.setBadgeTextColor({ color: '#FFFFFF' });
      } else {
        chrome.action.setBadgeText({ text: '' });
      }
    }
  });
}

// 简单绘制图标的函数
function drawSimpleIcon(ctx, width, height, currentCups, cupsGoal) {
  // 清空画布
  ctx.clearRect(0, 0, width, height);
  
  // 计算进度
  const progress = Math.min(1, currentCups / cupsGoal);
  
  // 绘制背景圆
  ctx.fillStyle = '#E0E0E0';
  ctx.beginPath();
  ctx.arc(width/2, height/2, width*0.4, 0, Math.PI*2);
  ctx.fill();
  
  // 绘制进度圆
  ctx.fillStyle = '#4CAF50';
  ctx.beginPath();
  ctx.moveTo(width/2, height/2);
  ctx.arc(width/2, height/2, width*0.4, -Math.PI/2, -Math.PI/2 + progress * Math.PI*2);
  ctx.closePath();
  ctx.fill();
  
  // 绘制中心圆
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(width/2, height/2, width*0.25, 0, Math.PI*2);
  ctx.fill();
  
  // 绘制文本
  ctx.fillStyle = '#333333';
  ctx.font = `bold ${width*0.2}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${currentCups}/${cupsGoal}`, width/2, height/2);
}

// 绘制水滴图标
function drawWaterDrop(ctx, width, height) {
  // 清空画布
  ctx.clearRect(0, 0, width, height);
  
  // 水滴主体 - 使用蓝色渐变
  const gradient = ctx.createRadialGradient(
    width/2, height/2, 0,
    width/2, height/2, width/2
  );
  gradient.addColorStop(0, '#87CEFA'); // 浅蓝色
  gradient.addColorStop(1, '#1E90FF'); // 深蓝色
  
  ctx.fillStyle = gradient;
  ctx.beginPath();
  
  // 绘制胖一些但稍长的水滴形状
  const dropWidth = width * 0.65; // 水滴宽度
  const dropHeight = height * 0.7; // 水滴高度
  
  // 水滴顶部
  ctx.moveTo(width/2, height*0.18); // 顶部位置稍微下移一点
  
  // 左侧曲线
  ctx.bezierCurveTo(
    width/2 - dropWidth/2, height*0.4,
    width/2 - dropWidth/1.8, height*0.65,
    width/2 - dropWidth/3, height*0.8
  );
  
  // 底部曲线 - 圆润
  ctx.bezierCurveTo(
    width/2 - dropWidth/6, height*0.85,
    width/2 + dropWidth/6, height*0.85,
    width/2 + dropWidth/3, height*0.8
  );
  
  // 右侧曲线
  ctx.bezierCurveTo(
    width/2 + dropWidth/1.8, height*0.65,
    width/2 + dropWidth/2, height*0.4,
    width/2, height*0.18
  );
  
  ctx.fill();
  
  // 保存当前路径用于裁剪
  ctx.save();
  ctx.clip();
  
  // 只保留右侧的小高光
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.beginPath();
  ctx.ellipse(width*0.4, height*0.4, width*0.05, height*0.08, Math.PI/4, 0, Math.PI*2);
  ctx.fill();
  
  // 恢复裁剪区域
  ctx.restore();
}

// 时间字符串转日期对象
function timeStringToDate(timeString) {
  const [hours, minutes] = timeString.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

// 设置闹钟
// 修改 setupAlarms 函数，确保闹钟正确设置
function setupAlarms() {
  chrome.storage.local.get(['startTime', 'endTime', 'interval', 'lastAlarmTime'], function(data) {
    const interval = data.interval || 60;
    
    // 先清除所有现有的闹钟
    chrome.alarms.clearAll(() => {
      console.log('所有闹钟已清除，准备创建新闹钟');
      
      // 计算下一次提醒的时间
      let delayInMinutes = interval;
      
      // 如果有上次提醒时间，计算剩余时间
      if (data.lastAlarmTime) {
        const lastAlarm = new Date(data.lastAlarmTime);
        const now = new Date();
        const timeDiffMinutes = Math.floor((now - lastAlarm) / (1000 * 60));
        
        // 如果时间差小于间隔，则使用剩余时间
        if (timeDiffMinutes < interval) {
          delayInMinutes = Math.max(1, interval - timeDiffMinutes); // 至少1分钟
        }
      }
      
      // 创建新的闹钟
      chrome.alarms.create('waterReminder', {
        delayInMinutes: delayInMinutes,
        periodInMinutes: interval
      });
      
      console.log(`已创建新闹钟，${delayInMinutes}分钟后触发，之后每${interval}分钟重复`);
      
      // 记录闹钟创建时间，用于调试
      chrome.storage.local.set({ 
        alarmCreatedAt: new Date().toISOString(),
        nextAlarmAt: new Date(Date.now() + delayInMinutes * 60 * 1000).toISOString()
      });
    });
  });
}

// 显示通知
// 修改 showNotification 函数，确保通知能在后台正确触发
function showNotification() {
  const now = Date.now();
  // 防止1秒内重复通知
  if (now - lastNotificationTime < 1000) return;
  lastNotificationTime = now;

  chrome.storage.local.get(['customMessage', 'notificationSound'], function(data) {
    const message = data.customMessage || '记得及时补充水分哦！';
    const shouldPlaySound = data.notificationSound !== false; // 默认为true
    
    // 记录当前时间作为最后提醒时间，确保即使通知失败也能更新时间
    const currentTime = new Date().toISOString();
    chrome.storage.local.set({ lastAlarmTime: currentTime });
    
    // 创建通知
    chrome.notifications.create('waterReminder', {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icon.png'),
      title: '喝水时间到 🚰',
      message: message,
      buttons: [
        { title: '喝完一杯啦' },
        { title: '稍后提醒' }
      ],
      silent: true, // 使用我们自己的音效
      requireInteraction: true // 确保通知不会自动消失
    }, function(notificationId) {
      // 检查是否有错误
      if (chrome.runtime.lastError) {
        console.error('通知创建失败:', chrome.runtime.lastError);
        // 尝试创建没有按钮的简单通知
        chrome.notifications.create('waterReminderSimple', {
          type: 'basic',
          iconUrl: chrome.runtime.getURL('icon.png'),
          title: '喝水时间到 🚰',
          message: message,
          silent: true,
          requireInteraction: true
        });
      }
      
      // 尝试播放音效
      if (shouldPlaySound) {
        playNotificationSound();
      }
    });
  });
}

// 播放通知音效
function playNotificationSound() {
  // 在Service Worker中，我们不能直接播放音频
  // 只尝试向popup发送消息
  chrome.runtime.sendMessage({ 
    action: 'playSound',
    soundPath: 'assets/reminder.mp3'
  }).catch(error => {
    // 忽略连接错误 - 这是正常的，如果popup没有打开
    console.log('Popup可能未打开，无法播放音效，这是正常的');
  });
}

// 监听消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateAlarms') {
    setupAlarms();
    sendResponse({ success: true });
  } else if (request.action === 'showNotification') {
    showNotification();
    sendResponse({ success: true });
  }
  // 移除 debugAlarms 相关代码
  // else if (request.action === 'debugAlarms') {
  //   debugAlarms();
  //   sendResponse({ success: true });
  // }
  
  // 保持消息通道开放以支持异步操作
  return true;
});

// 监听闹钟事件
chrome.alarms.onAlarm.addListener((alarm) => {
  console.log('收到闹钟事件:', alarm.name, new Date().toLocaleTimeString());
  if (alarm.name === 'waterReminder') {
    try {
      // 检查是否在允许的时间范围内
      chrome.storage.local.get(['startTime', 'endTime'], function(data) {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTimeMinutes = currentHour * 60 + currentMinute;
        
        let startTimeMinutes = 8 * 60; // 默认早上8点
        let endTimeMinutes = 22 * 60;  // 默认晚上10点
        
        if (data.startTime) {
          const [startHour, startMinute] = data.startTime.split(':').map(Number);
          startTimeMinutes = startHour * 60 + startMinute;
        }
        
        if (data.endTime) {
          const [endHour, endMinute] = data.endTime.split(':').map(Number);
          endTimeMinutes = endHour * 60 + endMinute;
        }
        
        // 检查当前时间是否在允许范围内
        if (currentTimeMinutes >= startTimeMinutes && currentTimeMinutes <= endTimeMinutes) {
          console.log('在允许的时间范围内，显示通知');
          showNotification();
        } else {
          console.log('不在允许的时间范围内，跳过通知');
          // 即使不显示通知，也更新最后提醒时间，以保持闹钟周期
          const now = new Date().toISOString();
          chrome.storage.local.set({ lastAlarmTime: now });
          
          // 重新设置闹钟
          setupAlarms();
        }
      });
    } catch (error) {
      console.error('通知触发失败:', error);
      // 降级方案：直接尝试播放音效
      playNotificationSound();
    }
  }
});

// 监听通知按钮点击
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (notificationId === 'waterReminder') {
    chrome.storage.local.get(['currentCups', 'cupsGoal', 'interval'], function(data) {
      const now = new Date().toISOString();
      
      if (buttonIndex === 0) {  // "喝完一杯啦"按钮
        let currentCups = data.currentCups || 0;
        let cupsGoal = data.cupsGoal || 8;
        
        if (currentCups < cupsGoal) {
          currentCups++;
          
          // 更新存储
          chrome.storage.local.set({ 
            currentCups: currentCups,
            lastUpdated: new Date().toDateString(),
            lastAlarmTime: now
          }, function() {
            // 更新图标
            updateIcon();
            // 重置闹钟
            setupAlarms();
            
            // 通知popup更新UI（如果打开的话）
            chrome.runtime.sendMessage({ 
              action: 'updateProgress',
              resetCountdown: true,  // 添加标记，表示需要重置倒计时
              playComplete: true  // 添加标记，表示需要播放完成音效
            });
          });
        }
      } else if (buttonIndex === 1) {  // "稍后提醒"按钮
        // 只重置计时器
        chrome.storage.local.set({ 
          lastAlarmTime: now
        }, function() {
          // 重置闹钟
          setupAlarms();
          
          // 通知popup更新倒计时（如果打开的话）
          chrome.runtime.sendMessage({ 
            action: 'updateProgress',
            resetCountdown: true  // 添加标记，表示需要重置倒计时
          });
        });
      }
    });
    
    // 关闭通知
    chrome.notifications.clear(notificationId);
  }
});

// 移除这些调试函数和相关代码
// 删除整个 debugAlarms 函数
// function debugAlarms() {
//   chrome.alarms.getAll(alarms => {
//     console.log('当前所有闹钟:', alarms);
//     
//     chrome.storage.local.get(['lastAlarmTime', 'alarmCreatedAt', 'nextAlarmAt'], function(data) {
//       console.log('上次提醒时间:', data.lastAlarmTime ? new Date(data.lastAlarmTime).toLocaleString() : '无');
//       console.log('闹钟创建时间:', data.alarmCreatedAt ? new Date(data.alarmCreatedAt).toLocaleString() : '无');
//       console.log('下次预计提醒时间:', data.nextAlarmAt ? new Date(data.nextAlarmAt).toLocaleString() : '无');
//     });
//   });
// }

// 删除这些定时器
// setInterval(debugAlarms, 60 * 60 * 1000);
// setTimeout(debugAlarms, 5000);

// 修改消息监听器，移除调试相关的部分
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateAlarms') {
    setupAlarms();
    sendResponse({ success: true });
  } else if (request.action === 'showNotification') {
    showNotification();
    sendResponse({ success: true });
  }
  // 移除 debugAlarms 相关代码
  // else if (request.action === 'debugAlarms') {
  //   debugAlarms();
  //   sendResponse({ success: true });
  // }
  
  // 保持消息通道开放以支持异步操作
  return true;
});