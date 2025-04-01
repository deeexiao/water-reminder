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

// 添加音效播放器
// let soundPlayer = null;

// 初始化音效播放器
// function initSoundPlayer() {
//   if (!soundPlayer) {
//     soundPlayer = new Audio();
//     soundPlayer.src = chrome.runtime.getURL('assets/reminder.mp3');
//     soundPlayer.preload = 'auto';
//   }
// }

// 播放音效
function playNotificationSound(soundPath) {
  try {
    // 检查通知音效设置
    chrome.storage.local.get(['notificationSound'], function(data) {
      if (data.notificationSound !== false) {
        // 请求 popup 播放音效
        chrome.runtime.sendMessage({ 
          action: 'playSound',
          soundPath: soundPath || 'assets/reminder.mp3'
        }).catch(error => {
          console.log('Popup可能未打开，无法播放音效，这是正常的');
        });
      }
    });
  } catch (error) {
    console.error('音效播放请求失败:', error);
  }
}

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
        // 创建植物图标实例并绘制
        const plantIcon = new PlantIcon(canvas, currentCups, cupsGoal);
        plantIcon.draw(); // 根据当前杯数绘制对应阶段的植物
        
        // 设置徽章文本
        chrome.action.setBadgeText({ text: currentCups.toString() });
        chrome.action.setBadgeBackgroundColor({ color: [76, 175, 80, 128] });
        chrome.action.setBadgeTextColor({ color: '#FFFFFF' });
      }
      
      // 获取图像数据并设置图标
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      chrome.action.setIcon({ imageData: imageData });
    } catch (error) {
      console.error('更新图标失败:', error);
      chrome.action.setIcon({ path: 'icon.png' });
      
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

// 在文件开头添加
let isPopupOpen = false;

// 添加 popup 打开状态监听
chrome.runtime.onConnect.addListener(function(port) {
  if (port.name === "popup") {
    isPopupOpen = true;
    port.onDisconnect.addListener(function() {
      isPopupOpen = false;
    });
  }
});

// 添加提醒小红点状态变量
let hasUnreadNotification = false;

// 添加绘制杯子图标的函数
function drawCupIcon(ctx, width, height) {
  // 清空画布
  ctx.clearRect(0, 0, width, height);
  
  // 设置白色填充
  ctx.fillStyle = '#FFFFFF';
  
  // 绘制杯身
  ctx.beginPath();
  ctx.moveTo(width * 0.3, height * 0.3);  // 左上角
  ctx.lineTo(width * 0.7, height * 0.3);   // 右上角
  ctx.lineTo(width * 0.65, height * 0.8);  // 右下角
  ctx.lineTo(width * 0.35, height * 0.8);  // 左下角
  ctx.closePath();
  ctx.fill();
  
  // 绘制杯柄
  ctx.beginPath();
  ctx.arc(width * 0.75, height * 0.45, width * 0.12, -Math.PI * 0.5, Math.PI * 0.5);
  ctx.stroke();
}

// 修改设置提醒小红点的函数
function setNotificationDot(show) {
  hasUnreadNotification = show;
  if (show) {
    chrome.action.setBadgeText({ text: '0:00' });
    chrome.action.setBadgeBackgroundColor({ color: [255, 59, 48, 255] }); // iOS 风格红色
    chrome.action.setBadgeTextColor({ color: '#FFFFFF' }); // 设置白色文字
  } else {
    updateIcon(); // 恢复正常的图标显示
  }
}

// 修改 showNotification 函数
async function showNotification(fromPopup = false) {
  const now = Date.now();
  // 将通知冷却时间从2分钟改为30秒
  if (now - lastNotificationTime < 30000) return;
  lastNotificationTime = now;

  // 设置提醒小红点
  if (!fromPopup) {
    setNotificationDot(true);
  }

  // 检查通知权限
  const hasPermission = await new Promise(resolve => {
    chrome.permissions.contains({
      permissions: ['notifications']
    }, function(result) {
      resolve(result);
    });
  });

  // 播放提醒音效
  playNotificationSound('assets/reminder.mp3');

  // 如果有通知权限，显示Chrome通知
  if (hasPermission) {
    chrome.storage.local.get(['notificationSound', 'customMessage'], function(data) {
      const message = data.customMessage || '该喝水啦！保持水分摄入，让身体更健康！';
      
      chrome.notifications.create('waterReminder', {
        type: 'basic',
        iconUrl: 'icon.png',
        title: '喝水提醒',
        message: message,
        requireInteraction: true,
        buttons: [
          { title: '喝完一杯啦' },
          { title: '慢慢在喝' }
        ],
        silent: data.notificationSound === false
      });
    });
  }

  // 如果popup打开，显示页面弹窗
  if (isPopupOpen) {
    chrome.runtime.sendMessage({ 
      action: 'showPageNotification',
      fromPopup: fromPopup
    });
  }
}

// 修改通知按钮点击处理
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (notificationId === 'waterReminder') {
    const now = new Date().toISOString();
    
    // 清除提醒小红点
    setNotificationDot(false);
    
    if (buttonIndex === 0) {
      // 用户点击"喝完一杯啦"
      chrome.storage.local.get(['currentCups', 'cupsGoal', 'interval'], function(data) {
        let currentCups = data.currentCups || 0;
        const goal = data.cupsGoal || 8;
        
        if (currentCups < goal) {
          currentCups++;
          chrome.storage.local.set({
            currentCups: currentCups,
            lastUpdated: new Date().toDateString(),
            lastAlarmTime: now
          }, function() {
            // 重新设置闹钟
            setupAlarms();
            
            // 无论 popup 是否打开，都发送更新消息
            chrome.runtime.sendMessage({ 
              action: 'updateProgress',
              resetCountdown: true
            }).catch(() => {
              // 忽略错误，因为 popup 可能未打开
            });
          });
        }
      });
    } else {
      // 用户点击"慢慢在喝"
      handleSnooze(now);
    }
    
    // 关闭通知
    chrome.notifications.clear(notificationId);
    
    // 无论 popup 是否打开，都发送关闭消息
    chrome.runtime.sendMessage({ 
      action: 'closePageNotification'
    }).catch(() => {
      // 忽略错误，因为 popup 可能未打开
    });
  }
});

// 修改通知关闭监听器
chrome.notifications.onClosed.addListener((notificationId) => {
  if (notificationId === 'waterReminder') {
    // 清除提醒小红点
    setNotificationDot(false);
    
    // 当用户关闭通知时，触发"慢慢在喝"的效果
    handleSnooze(new Date().toISOString());
    
    // 无论 popup 是否打开，都发送关闭消息
    chrome.runtime.sendMessage({ 
      action: 'closePageNotification'
    }).catch(() => {
      // 忽略错误，因为 popup 可能未打开
    });
  }
});

// 修改 handleSnooze 函数
function handleSnooze(now) {
  chrome.storage.local.set({
    lastAlarmTime: now
  }, function() {
    // 重新设置闹钟
    setupAlarms();
    
    // 无论 popup 是否打开，都发送更新消息
    chrome.runtime.sendMessage({ 
      action: 'updateProgress',
      resetCountdown: true
    }).catch(() => {
      // 忽略错误，因为 popup 可能未打开
    });
  });
}

// 修改消息监听器
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateAlarms') {
    setupAlarms();
    sendResponse({ success: true });
  } else if (request.action === 'showNotification') {
    showNotification(request.fromPopup || false);
    sendResponse({ success: true });
  } else if (request.action === 'playSound') {
    playNotificationSound(request.soundPath);
    sendResponse({ success: true });
  } else if (request.action === 'closeChromeNotification') {
    // 关闭 Chrome 通知
    chrome.notifications.clear('waterReminder');
    sendResponse({ success: true });
  } else if (request.action === 'clearNotificationDot') {
    // 清除提醒小红点
    setNotificationDot(false);
    sendResponse({ success: true });
  }
  
  // 保持消息通道开放以支持异步操作
  return true;
});

// 监听闹钟事件
// 修改闹钟监听器
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
        
        let startTimeMinutes = 8 * 60;
        let endTimeMinutes = 22 * 60;
        
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
          // 显示通知，不检查 popup 是否打开
          showNotification(false);
        } else {
          console.log('不在允许的时间范围内，跳过通知');
          // 更新最后提醒时间，以保持闹钟周期
          const now = new Date().toISOString();
          chrome.storage.local.set({ lastAlarmTime: now });
          setupAlarms();
        }
      });
    } catch (error) {
      console.error('通知触发失败:', error);
    }
  }
});

// 在文件顶部添加完整的 PlantIcon 类实现
class PlantIcon {
  constructor(canvas, cupsCount = 0, maxCups = 8) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cupsCount = cupsCount;
    this.maxCups = maxCups;
    this.width = canvas.width;
    this.height = canvas.height;
  }
  
  draw() {
    // 清空画布
    this.ctx.clearRect(0, 0, this.width, this.height);
    
    // 绘制土壤
    this.drawSoil();
    
    // 根据杯数绘制不同阶段的植物
    if (this.cupsCount >= 1) this.drawStage1(); // 种子发芽
    if (this.cupsCount >= 2) this.drawStage2(); // 小芽
    if (this.cupsCount >= 3) this.drawStage3(); // 左叶子
    if (this.cupsCount >= 4) this.drawStage4(); // 右叶子
    if (this.cupsCount >= 5) this.drawStage5(); // 茎延长
    if (this.cupsCount >= 6) this.drawStage6(); // 花苞
    if (this.cupsCount >= 7) this.drawStage7(); // 花瓣开始
    if (this.cupsCount >= 8) this.drawStage8(); // 花朵盛开
  }
  
  drawSoil() {
    this.ctx.fillStyle = '#8B4513';
    this.ctx.beginPath();
    this.ctx.ellipse(this.width/2, this.height - 15, this.width/2 - 10, 15, 0, 0, Math.PI * 2);
    this.ctx.fill();
  }
  
  drawStage1() {
    this.ctx.fillStyle = '#3CB371';
    this.ctx.beginPath();
    this.ctx.moveTo(this.width/2, this.height - 20);
    this.ctx.lineTo(this.width/2, this.height - 50);
    this.ctx.lineWidth = 5;
    this.ctx.strokeStyle = '#3CB371';
    this.ctx.stroke();
    
    this.ctx.beginPath();
    this.ctx.arc(this.width/2, this.height - 50, 5, 0, Math.PI * 2);
    this.ctx.fill();
  }
  
  drawStage2() {
    this.ctx.beginPath();
    this.ctx.moveTo(this.width/2, this.height - 50);
    this.ctx.lineTo(this.width/2, this.height - 70);
    this.ctx.lineWidth = 5;
    this.ctx.strokeStyle = '#3CB371';
    this.ctx.stroke();
    
    this.ctx.beginPath();
    this.ctx.arc(this.width/2, this.height - 70, 6, 0, Math.PI * 2);
    this.ctx.fill();
  }
  
  drawStage3() {
    this.ctx.beginPath();
    this.ctx.moveTo(this.width/2, this.height - 60);
    this.ctx.quadraticCurveTo(
      this.width/2 - 25, this.height - 70,
      this.width/2 - 35, this.height - 55
    );
    this.ctx.quadraticCurveTo(
      this.width/2 - 25, this.height - 45,
      this.width/2, this.height - 55
    );
    this.ctx.fillStyle = '#32CD32';
    this.ctx.fill();
  }
  
  drawStage4() {
    this.ctx.beginPath();
    this.ctx.moveTo(this.width/2, this.height - 65);
    this.ctx.quadraticCurveTo(
      this.width/2 + 25, this.height - 75,
      this.width/2 + 35, this.height - 60
    );
    this.ctx.quadraticCurveTo(
      this.width/2 + 25, this.height - 50,
      this.width/2, this.height - 60
    );
    this.ctx.fillStyle = '#32CD32';
    this.ctx.fill();
  }
  
  drawStage5() {
    this.ctx.beginPath();
    this.ctx.moveTo(this.width/2, this.height - 70);
    this.ctx.lineTo(this.width/2, this.height - 90);
    this.ctx.lineWidth = 5;
    this.ctx.strokeStyle = '#228B22';
    this.ctx.stroke();
  }
  
  drawStage6() {
    this.ctx.beginPath();
    this.ctx.arc(this.width/2, this.height - 95, 12, 0, Math.PI * 2);
    this.ctx.fillStyle = '#9ACD32';
    this.ctx.fill();
  }
  
  drawStage7() {
    this.ctx.beginPath();
    this.ctx.arc(this.width/2, this.height - 95, 12, 0, Math.PI * 2);
    this.ctx.fillStyle = '#FF69B4';
    this.ctx.fill();
    
    const centerX = this.width/2;
    const centerY = this.height - 95;
    const petalLength = 10;
    
    for (let i = 0; i < 5; i++) {
      const angle = (i * Math.PI * 2) / 5;
      const x = centerX + Math.cos(angle) * petalLength;
      const y = centerY + Math.sin(angle) * petalLength;
      
      this.ctx.beginPath();
      this.ctx.arc(x, y, 8, 0, Math.PI * 2);
      this.ctx.fillStyle = '#FF1493';
      this.ctx.fill();
    }
  }
  
  drawStage8() {
    const centerX = this.width/2;
    const centerY = this.height - 95;
    
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, 15, 0, Math.PI * 2);
    this.ctx.fillStyle = '#FFD700';
    this.ctx.fill();
    
    const petalCount = 8;
    const petalLength = 25;
    
    for (let i = 0; i < petalCount; i++) {
      const angle = (i * Math.PI * 2) / petalCount;
      const x1 = centerX + Math.cos(angle) * 15;
      const y1 = centerY + Math.sin(angle) * 15;
      const x2 = centerX + Math.cos(angle) * petalLength;
      const y2 = centerY + Math.sin(angle) * petalLength;
      
      this.ctx.beginPath();
      this.ctx.moveTo(x1, y1);
      this.ctx.quadraticCurveTo(
        centerX + Math.cos(angle + 0.2) * 30,
        centerY + Math.sin(angle + 0.2) * 30,
        x2, y2
      );
      this.ctx.quadraticCurveTo(
        centerX + Math.cos(angle - 0.2) * 30,
        centerY + Math.sin(angle - 0.2) * 30,
        x1, y1
      );
      this.ctx.fillStyle = '#FF69B4';
      this.ctx.fill();
    }
    
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
    this.ctx.fillStyle = '#FF4500';
    this.ctx.fill();
  }
}