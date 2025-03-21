// 在文件顶部引入植物图标类
// 注意：由于Chrome扩展的限制，我们需要在popup.html中引入这个脚本
// <script src="plant-icon.js"></script>

// 将消息监听器移到文件顶部，DOMContentLoaded 事件外部
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'playSound') {
    try {
      const audio = new Audio(chrome.runtime.getURL(request.soundPath));
      audio.play().catch(error => {
        console.error('播放音效失败:', error);
      });
    } catch (error) {
      console.error('创建音频对象失败:', error);
    }
  }
  if (request.action === 'drinkWater') {
    // 如果popup打开，触发喝水按钮点击
    if (document.getElementById('add-cup')) {
      document.getElementById('add-cup').click();
    } else {
      // 如果popup没有打开，直接更新存储
      chrome.storage.local.get(['currentCups', 'cupsGoal', 'interval'], function(data) {
        let currentCups = data.currentCups || 0;
        let goal = data.cupsGoal || 8;
        
        if (currentCups < goal) {
          currentCups++;
          const now = new Date().toISOString();
          chrome.storage.local.set({ 
            currentCups: currentCups,
            lastUpdated: new Date().toDateString(),
            lastAlarmTime: now
          });
        }
      });
    }
  } else if (request.action === 'resetTimer') {
    // 只重置计时器
    chrome.storage.local.get(['interval'], function(data) {
      const interval = data.interval || 60;
      const now = new Date().toISOString();
      
      chrome.storage.local.set({ 
        lastAlarmTime: now
      });
    });
  } else if (request.action === 'updateProgress') {
    // 如果popup打开，更新UI
    if (document.getElementById('current-cups')) {
      chrome.storage.local.get(['currentCups', 'cupsGoal'], function(data) {
        const currentCups = data.currentCups || 0;
        const cupsGoal = data.cupsGoal || 8;
        
        if (document.getElementById('current-cups')) {
          document.getElementById('current-cups').textContent = currentCups;
        }
        if (document.getElementById('cups-goal')) {
          document.getElementById('cups-goal').textContent = cupsGoal;
        }
        if (document.getElementById('progress')) {
          const progressPercentage = (currentCups / cupsGoal) * 100;
          document.getElementById('progress').style.width = `${progressPercentage}%`;
        }
      });
    }
  }
});

document.addEventListener('DOMContentLoaded', function() {
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
    try {
      const audio = new Audio(chrome.runtime.getURL(soundPath));
      audio.play().catch(error => console.error('播放音效失败:', error));
    } catch (error) {
      console.error('创建音频对象失败:', error);
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
  function initCountdown(lastAlarmTime, intervalMinutes) {
    // 清除现有倒计时
    if (countdownInterval) {
      clearInterval(countdownInterval);
    }
    
    // 无论如何，如果提供了新的闹钟时间，就重置倒计时
    if (lastAlarmTime) {
      const lastAlarm = new Date(lastAlarmTime);
      const now = new Date();
      const timeDiff = Math.floor((now - lastAlarm) / 1000);
      remainingSeconds = (intervalMinutes * 60) - timeDiff;
      
      if (remainingSeconds <= 0) {
        remainingSeconds = intervalMinutes * 60;
      }
      
      countdownInterval = setInterval(updateCountdown, 1000);
      updateCountdown();
    }
  }

  // 修改 updateCountdown 函数，防止自动重置
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
    
    // 时间到了就重置
    if (remainingSeconds <= 0) {  // 改为 <= 0，确保不会错过 0 这个时刻
        if (countdownInterval) {
            clearInterval(countdownInterval);
        }
        
        // 先触发通知，再重置倒计时
        chrome.runtime.sendMessage({ 
            action: 'showNotification',
            forceSound: true  // 添加标记确保一定会播放声音
        });
        
        // 重置倒计时
        chrome.storage.local.get(['interval'], function(data) {
            const interval = data.interval || 60;
            remainingSeconds = interval * 60;
            countdownInterval = setInterval(updateCountdown, 1000);
            updateCountdown();
        });
    }
}
  
  // 添加一杯水
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
        
        // 播放完成音效
        playSound('assets/complete.mp3');
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
});