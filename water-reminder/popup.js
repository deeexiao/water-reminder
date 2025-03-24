// 在文件顶部引入植物图标类
// 注意：由于Chrome扩展的限制，我们需要在popup.html中引入这个脚本
// <script src="plant-icon.js"></script>

// 在文件顶部添加
// 修复消息监听器重复问题（删除顶部全局监听器）
// 删除以下代码：
// chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
//   if (request.action === 'playSound') {
//     playSound(request.soundPath);
//     sendResponse({ success: true });
//   }
//   return true;
// });

// 修改DOMContentLoaded中的消息监听（约第10行）
document.addEventListener('DOMContentLoaded', function() {
  // 初始化音效播放器
  window.soundPlayer = new Audio();
  window.isPlayingSound = false; // 使用全局变量跟踪播放状态

  // 预加载音效
  window.soundPlayer.src = chrome.runtime.getURL('assets/reminder.mp3');
  window.soundPlayer.preload = 'auto';
  
  // 添加结束事件监听器
  window.soundPlayer.addEventListener('ended', () => {
    window.isPlayingSound = false;
  });

  // 消息监听 - 移除这里的监听器，避免重复
  // chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  //   if (request.action === 'playSound') {
  //     playSound(request.soundPath);
  //     sendResponse({ success: true });
  //   }
  //   return true;
  // });
});

// 修改备用播放按钮函数
// 移除整个createFallbackButton函数
// function createFallbackButton() {
//   // 检查是否已存在按钮
//   if (document.querySelector('.fallback-sound-btn')) {
//     return;
//   }
//   
//   const btn = document.createElement('button');
//   btn.textContent = '点击播放提醒音效';
//   btn.className = 'fallback-sound-btn';
//   btn.onclick = () => {
//     if (window.isPlayingSound) return;
//     
//     window.isPlayingSound = true;
//     const audio = new Audio(chrome.runtime.getURL('assets/reminder.mp3'));
//     audio.onended = () => { window.isPlayingSound = false; };
//     audio.play().catch(() => { window.isPlayingSound = false; });
//   };
//   document.body.appendChild(btn);
// }

// 获取DOM元素
const currentCupsElement = document.getElementById('current-cups');
const progressElement = document.getElementById('progress');
const addCupButton = document.getElementById('add-cup');
const resetButton = document.getElementById('reset');
const startTimeInput = document.getElementById('start-time');
const endTimeInput = document.getElementById('end-time');
const intervalInput = document.getElementById('interval');
const saveSettingsButton = document.getElementById('save-settings');
const optionsLink = document.getElementById('options-link');

// 全局变量
let cupsGoal = 8; // 默认目标

// 加载当前进度和设置
loadProgress();
loadSettings();

// 添加事件监听器
addCupButton.addEventListener('click', addCup);
resetButton.addEventListener('click', resetProgress);
saveSettingsButton.addEventListener('click', saveSettings);

// 如果有选项链接，添加事件监听器
if (optionsLink) {
  optionsLink.addEventListener('click', function() {
    chrome.runtime.openOptionsPage();
  });
}

// 加载当前进度
// 获取植物图标的canvas元素
const plantCanvas = document.getElementById('plant-icon');
let plantIcon;

// 在loadProgress函数中初始化和更新植物图标
function loadProgress() {
  chrome.storage.local.get(['currentCups', 'lastUpdated', 'cupsGoal', 'interval'], function(data) {
    let currentCups = 0;
    
    // 获取目标杯数
    if (data.cupsGoal) {
      cupsGoal = data.cupsGoal;
    }
    
    // 检查是否是新的一天，如果是则重置进度
    const today = new Date().toDateString();
    if (data.lastUpdated !== today) {
      chrome.storage.local.set({ currentCups: 0, lastUpdated: today });
    } else if (data.currentCups) {
      currentCups = data.currentCups;
    }
    
    // 更新UI显示
    updateProgressUI(currentCups);
    
    // 添加条件判断
    if (plantCanvas && typeof PlantIcon !== 'undefined') {
      if (!plantIcon) {
        plantIcon = new PlantIcon(plantCanvas, currentCups, cupsGoal);
      } else {
        plantIcon.updateCups(currentCups);
      }
    }
  });
}

// 添加自定义确认弹窗函数
// 修改showCustomConfirm函数，添加取消按钮的重新计时逻辑
function showCustomConfirm(message, onConfirm) {
    const backdrop = document.createElement('div');
    backdrop.className = 'custom-alert-backdrop';
    
    const confirm = document.createElement('div');
    confirm.className = 'custom-alert';
    
    const text = document.createElement('p');
    text.textContent = message;
    
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'center';
    buttonContainer.style.gap = '10px';
    
    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = '确定';
    confirmBtn.onclick = () => {
      onConfirm();
      backdrop.remove();
      confirm.remove();
    };
    
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = '取消';
    cancelBtn.onclick = () => {
      // 取消时也重新计时，但不增加杯数
      chrome.storage.local.get(['interval'], function(data) {
        const interval = data.interval || 60;
        const now = new Date().toISOString();
        
        // 更新最后提醒时间，但不增加杯数
        chrome.storage.local.set({ 
          lastAlarmTime: now
        }, function() {
          // 重置倒计时
          initCountdown(now, interval);
          
          // 通知后台重置闹钟
          chrome.runtime.sendMessage({
            action: 'updateAlarms'
          });
        });
      });
      
      backdrop.remove();
      confirm.remove();
    };
    
    buttonContainer.appendChild(confirmBtn);
    buttonContainer.appendChild(cancelBtn);
    confirm.appendChild(text);
    confirm.appendChild(buttonContainer);
    
    document.body.appendChild(backdrop);
    document.body.appendChild(confirm);
}

// 修改 resetProgress 函数
function resetProgress() {
  showCustomConfirm('今日份水份开始补充！', () => {
    chrome.storage.local.get(['interval'], function(data) {
      const interval = data.interval || 60;
      const now = new Date().toISOString();
      
      chrome.storage.local.set({ 
        currentCups: 0,
        lastUpdated: new Date().toDateString(),
        lastAlarmTime: now
      });
      
      updateProgressUI(0);
      initCountdown(now, interval);
      chrome.runtime.sendMessage({
        action: 'updateAlarms'
      });
    });
  });
}

// 添加播放音效的函数
function playSound(soundPath) {
  if (!soundPlayer) return;
  
  try {
    soundPlayer.src = chrome.runtime.getURL(soundPath);
    const playPromise = soundPlayer.play();
    
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        console.error('音频播放失败:', error);
      });
    }
  } catch (error) {
    console.error('音效处理错误:', error);
  }
}

// 加载设置
// 添加倒计时相关变量
const countdownProgressElement = document.getElementById('countdown-progress');
const countdownTimeElement = document.getElementById('countdown-time');
let countdownInterval;
let remainingSeconds = 3600; // 60分钟 = 3600秒

// 在loadSettings函数中添加倒计时初始化
function loadSettings() {
  chrome.storage.local.get(['startTime', 'endTime', 'interval', 'lastAlarmTime'], function(data) {
    if (data.startTime) startTimeInput.value = data.startTime;
    if (data.endTime) endTimeInput.value = data.endTime;
    if (data.interval) intervalInput.value = data.interval;
    
    // 初始化倒计时
    initCountdown(data.lastAlarmTime, data.interval || 60);
  });
}

// 初始化倒计时
// 修改 initCountdown 函数，确保页面关闭不会重置计时
function initCountdown(lastAlarmTime, intervalMinutes) {
  // 清除现有倒计时
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }
  
  // 如果提供了新的闹钟时间，就重置倒计时
  if (lastAlarmTime) {
    const lastAlarm = new Date(lastAlarmTime);
    const now = new Date();
    const timeDiff = Math.floor((now - lastAlarm) / 1000);
    remainingSeconds = (intervalMinutes * 60) - timeDiff;
    
    // 确保剩余时间不会为负数
    if (remainingSeconds <= 0) {
      // 如果时间已经到了，不要自动重置，而是显示提醒
      remainingSeconds = 0;
      
      // 显示弹窗
      showCustomConfirm('该喝水了！要记录一杯水吗？', () => {
        // 用户点击确认，添加一杯水
        addCup();
      });
    } else {
      // 正常倒计时
      countdownInterval = setInterval(updateCountdown, 1000);
      updateCountdown();
    }
  }
}

// 修改 updateCountdown 函数，防止自动重置
// 修改 updateCountdown 函数，添加弹窗
function updateCountdown() {
  if (!countdownTimeElement || !countdownProgressElement || !intervalInput) return;
  
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const displayTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  countdownTimeElement.textContent = displayTime;
  
  // 更新进度条
  const totalSeconds = parseInt(intervalInput.value) * 60;
  const progress = (remainingSeconds / totalSeconds) * 100;
  countdownProgressElement.style.width = `${progress}%`;
  
  remainingSeconds--;
  
  // 时间到了就触发通知和弹窗
  if (remainingSeconds <= 0) {
    if (countdownInterval) {
      clearInterval(countdownInterval);
    }
    
    // 触发通知
    chrome.runtime.sendMessage({ 
      action: 'showNotification'
    });
    
    // 显示弹窗
    showCustomConfirm('该喝水了！要记录一杯水吗？', () => {
      // 用户点击确认，添加一杯水
      addCup();
    });
    
    // 不再自动重置倒计时，等待用户操作
  }
}

// 添加一杯水
// 修改 addCup 函数确保音效播放
function addCup() {
  chrome.storage.local.get(['currentCups', 'cupsGoal', 'interval'], function(data) {
    let currentCups = data.currentCups || 0;
    let goal = data.cupsGoal || 8;
    let interval = data.interval || 60;
    
    if (currentCups < goal) {
      currentCups++;
      
      // 更新存储并重置闹钟时间
      const now = new Date().toISOString();
      chrome.storage.local.set({ 
        currentCups: currentCups,
        lastUpdated: new Date().toDateString(),
        lastAlarmTime: now
      });
      
      updateProgressUI(currentCups);
      
      // 更新植物图标
      if (plantCanvas && typeof PlantIcon !== 'undefined') {
        if (plantIcon) {
          plantIcon.updateCups(currentCups);
        }
      }
      
      // 重置倒计时
      initCountdown(now, interval);
      
      // 通知后台重置闹钟
      chrome.runtime.sendMessage({
        action: 'updateAlarms'
      });
      
      // 播放完成音效 - 使用新的方式播放
      try {
        const completeSound = new Audio(chrome.runtime.getURL('assets/complete.mp3'));
        completeSound.play().catch(e => console.error('播放完成音效失败:', e));
      } catch (error) {
        console.error('初始化完成音效失败:', error);
      }
    }
  });
}

// 添加自定义弹窗函数
function showCustomAlert(message) {
    const backdrop = document.createElement('div');
    backdrop.className = 'custom-alert-backdrop';
    
    const alert = document.createElement('div');
    alert.className = 'custom-alert';
    
    const text = document.createElement('p');
    text.textContent = message;
    
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'center';
    buttonContainer.style.gap = '10px';
    
    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = '确定';
    confirmBtn.onclick = () => {
        backdrop.remove();
        alert.remove();
    };
    
    buttonContainer.appendChild(confirmBtn);
    alert.appendChild(text);
    alert.appendChild(buttonContainer);
    
    document.body.appendChild(backdrop);
    document.body.appendChild(alert);
}

// 保存设置
function saveSettings() {
  const startTime = startTimeInput.value;
  const endTime = endTimeInput.value;
  const interval = parseInt(intervalInput.value);
  
  if (interval < 1 || interval > 180) {
    showCustomAlert('提醒间隔必须在1-180分钟之间');
    return;
  }
  
  chrome.storage.local.set({
    startTime: startTime,
    endTime: endTime,
    interval: interval,
    lastAlarmTime: new Date().toISOString()
  }, function() {
    chrome.runtime.sendMessage({
      action: 'updateAlarms',
      settings: { 
        startTime: startTime, 
        endTime: endTime, 
        interval: interval 
      }
    });
    
    initCountdown(new Date().toISOString(), interval);
    showCustomAlert('设置已保存');
  });
}

// 更新UI显示
function updateProgressUI(cups) {
  if (!currentCupsElement || !progressElement) return;
  
  const cupsGoalElement = document.getElementById('cups-goal');
  if (!cupsGoalElement) return;
  
  currentCupsElement.textContent = cups;
  cupsGoalElement.textContent = cupsGoal;
  const progressPercentage = (cups / cupsGoal) * 100;
  progressElement.style.width = `${progressPercentage}%`;
}
// 修改消息监听器，处理重置倒计时的请求
// 修改消息监听器，移除对createFallbackButton的引用
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'playSound') {
    // 防止重复播放
    if (window.isPlayingSound) {
      sendResponse({ success: false, reason: 'already_playing' });
      return true;
    }
    
    window.isPlayingSound = true;
    
    try {
      if (window.soundPlayer) {
        window.soundPlayer.src = chrome.runtime.getURL(request.soundPath || 'assets/reminder.mp3');
        window.soundPlayer.currentTime = 0;
        window.soundPlayer.play().catch(error => {
          console.error('音效播放失败:', error);
          window.isPlayingSound = false;
          // 移除对createFallbackButton的引用
        });
      } else {
        // 如果soundPlayer不存在，创建一个新的
        const audio = new Audio(chrome.runtime.getURL(request.soundPath || 'assets/reminder.mp3'));
        audio.onended = () => { window.isPlayingSound = false; };
        audio.play().catch(error => {
          console.error('音效播放失败:', error);
          window.isPlayingSound = false;
          // 移除对createFallbackButton的引用
        });
      }
      
      sendResponse({ success: true });
    } catch (error) {
      console.error('音效初始化失败:', error);
      window.isPlayingSound = false;
      sendResponse({ success: false });
    }
    return true;
  }
  
  if (request.action === 'updateProgress') {
    loadProgress();
    
    // 如果需要重置倒计时
    if (request.resetCountdown) {
      chrome.storage.local.get(['interval', 'lastAlarmTime'], function(data) {
        initCountdown(data.lastAlarmTime || new Date().toISOString(), data.interval || 60);
      });
    }
    
    return true;
  }
});

// 如果有调试按钮相关的代码，请删除它
// 例如，如果有类似以下的代码：
/*
document.addEventListener('DOMContentLoaded', function() {
  // ... 其他代码 ...
  
  // 添加调试按钮
  const debugButton = document.createElement('button');
  debugButton.textContent = '调试闹钟';
  debugButton.style.marginTop = '10px';
  debugButton.style.padding = '5px';
  debugButton.style.fontSize = '12px';
  debugButton.style.backgroundColor = '#f0f0f0';
  debugButton.style.border = '1px solid #ccc';
  debugButton.style.borderRadius = '3px';
  debugButton.onclick = function() {
    chrome.runtime.sendMessage({ action: 'debugAlarms' });
  };
  
  // 添加到页面底部
  const footer = document.querySelector('.footer');
  if (footer) {
    footer.appendChild(debugButton);
  }
});
*/