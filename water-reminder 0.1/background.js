// Change importScripts to self.importScripts
self.importScripts('plant-icon.js');

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
    
    // 创建离屏canvas
    const canvas = new OffscreenCanvas(128, 128);
    const ctx = canvas.getContext('2d');
    
    if (currentCups === 0) {
      // 当杯数为0时，绘制水滴图标
      drawWaterDrop(ctx, canvas.width, canvas.height);
      chrome.action.setBadgeText({ text: '' }); // 不显示徽章
    } else {
      // 使用植物图标
      const plantIcon = new PlantIcon(canvas, currentCups, cupsGoal);
      
      // 设置徽章文本 - 使用较小的字体
      chrome.action.setBadgeText({ text: currentCups.toString() });
      chrome.action.setBadgeBackgroundColor({ color: [76, 175, 80, 128] }); // 半透明绿色
      chrome.action.setBadgeTextColor({ color: '#FFFFFF' }); // 白色文字
    }
    
    // 获取图像数据
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // 设置图标
    chrome.action.setIcon({ imageData: imageData });
  });
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

// 监听消息
// 合并后的监听器
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateAlarms') {
    // 只更新设置，不触发通知
    setupAlarms();
  } else if (request.action === 'showNotification') {
    // 直接显示通知
    showNotification();
  }
  return true;
});

// 可以移除这个 alarm 监听器，因为我们不再使用它
// chrome.alarms.onAlarm.addListener(function(alarm) {
//   if (alarm.name === 'waterReminder') {
//     showNotification();
//   }
// });
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
            chrome.runtime.sendMessage({ action: 'updateProgress' });
          });
        }
      } else if (buttonIndex === 1) {  // "慢慢在喝"按钮
        // 只重置计时器
        chrome.storage.local.set({ 
          lastAlarmTime: now
        }, function() {
          // 重置闹钟
          setupAlarms();
        });
      }
    });
    
    // 关闭通知
    chrome.notifications.clear(notificationId);
  }
});

// 修改音频播放相关的代码
function playNotificationSound() {
  const audio = document.createElement('audio');
  audio.src = chrome.runtime.getURL('assets/reminder.mp3');
  audio.play().catch(error => {
    console.error('播放提醒音效失败:', error);
  });
}

function showNotification() {
  chrome.storage.local.get(['currentCups', 'lastUpdated', 'cupsGoal', 'customMessage', 'notificationSound'], function(data) {
    const today = new Date().toDateString();
    let currentCups = data.currentCups || 0;
    let cupsGoal = data.cupsGoal || 8;
    let message = data.customMessage || '现在是喝水的好时机！';
    
    // 检查是否已经喝够水
    if (currentCups >= cupsGoal) {
      return; // 已经达到目标，不再提醒
    }
    
    // 确保音效播放
    playNotificationSound();  // 移除条件判断，确保一定播放
    
    // 创建通知
    chrome.notifications.create('waterReminder', {
      type: 'basic',
      iconUrl: 'icon.png',
      title: '喝水提醒',
      message: `今天已喝 ${currentCups}/${cupsGoal} 杯水，${message}`,
      buttons: [
        { title: '喝完一杯啦' },
        { title: '慢慢在喝' }
      ],
      requireInteraction: true,
      silent: true
    });
  });
}

// 修改音频播放代码，确保音效一定会播放
// Keep only one version of playNotificationSound
function playNotificationSound() {
  const audio = new Audio(chrome.runtime.getURL('assets/reminder.mp3'));
  audio.volume = 1.0;
  
  const playPromise = audio.play();
  if (playPromise !== undefined) {
    playPromise.catch(error => {
      console.error('播放提醒音效失败:', error);
      setTimeout(() => {
        audio.play().catch(error => console.error('重试播放失败:', error));
      }, 100);
    });
  }
}

// Remove duplicate playNotificationSound functions

// 将这个函数移到文件前面
function timeStringToDate(timeString) {
  const [hours, minutes] = timeString.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

function setupAlarms() {
  chrome.storage.local.get(['startTime', 'endTime', 'interval'], function(data) {
    const interval = data.interval || 60;
    
    // 先清除所有现有的闹钟
    chrome.alarms.clearAll(() => {
      // 立即创建新的闹钟，从现在开始计时
      chrome.alarms.create('waterReminder', {
        delayInMinutes: 0.1,  // 几乎立即开始第一次提醒
        periodInMinutes: interval  // 之后按照设定的间隔重复
      });
    });
  });
}

// 初始化监听器
chrome.runtime.onInstalled.addListener(function() {
  // ... rest of the initialization code ...
});