document.addEventListener('DOMContentLoaded', function() {
  // 获取DOM元素
  const startTimeInput = document.getElementById('start-time');
  const endTimeInput = document.getElementById('end-time');
  const intervalInput = document.getElementById('interval');
  const cupsGoalInput = document.getElementById('cups-goal');
  const notificationSoundCheckbox = document.getElementById('notification-sound');
  const notificationTimeoutInput = document.getElementById('notification-timeout');
  const customMessageInput = document.getElementById('custom-message');
  const autoResetCheckbox = document.getElementById('auto-reset');
  const resetTimeInput = document.getElementById('reset-time');
  const saveButton = document.getElementById('save-settings');
  const statusElement = document.getElementById('status');
  
  // 加载设置
  loadSettings();
  
  // 添加保存按钮事件监听器
  saveButton.addEventListener('click', saveSettings);
  
  // 加载设置
  function loadSettings() {
    chrome.storage.local.get([
      'startTime', 
      'endTime', 
      'interval', 
      'cupsGoal', 
      'notificationSound', 
      'notificationTimeout', 
      'customMessage', 
      'autoReset', 
      'resetTime'
    ], function(data) {
      if (data.startTime) startTimeInput.value = data.startTime;
      if (data.endTime) endTimeInput.value = data.endTime;
      if (data.interval) intervalInput.value = data.interval;
      if (data.cupsGoal) cupsGoalInput.value = data.cupsGoal;
      if (data.notificationSound !== undefined) notificationSoundCheckbox.checked = data.notificationSound;
      if (data.notificationTimeout) notificationTimeoutInput.value = data.notificationTimeout;
      if (data.customMessage) customMessageInput.value = data.customMessage;
      if (data.autoReset !== undefined) autoResetCheckbox.checked = data.autoReset;
      if (data.resetTime) resetTimeInput.value = data.resetTime;
    });
  }
  
  // 保存设置
  function saveSettings() {
    const startTime = startTimeInput.value;
    const endTime = endTimeInput.value;
    const interval = parseInt(intervalInput.value);
    const cupsGoal = parseInt(cupsGoalInput.value);
    const notificationSound = notificationSoundCheckbox.checked;
    const notificationTimeout = parseInt(notificationTimeoutInput.value);
    const customMessage = customMessageInput.value;
    const autoReset = autoResetCheckbox.checked;
    const resetTime = resetTimeInput.value;
    
    // 验证输入
    if (interval < 30 || interval > 180) {
      showStatus('提醒间隔必须在30-180分钟之间', true);
      return;
    }
    
    if (cupsGoal < 1 || cupsGoal > 20) {
      showStatus('每日目标杯数必须在1-20之间', true);
      return;
    }
    
    if (notificationTimeout < 5 || notificationTimeout > 60) {
      showStatus('通知显示时间必须在5-60秒之间', true);
      return;
    }
    
    // 保存设置
    chrome.storage.local.set({
      startTime: startTime,
      endTime: endTime,
      interval: interval,
      cupsGoal: cupsGoal,
      notificationSound: notificationSound,
      notificationTimeout: notificationTimeout,
      customMessage: customMessage,
      autoReset: autoReset,
      resetTime: resetTime
    }, function() {
      // 更新提醒计划
      chrome.runtime.sendMessage({
        action: 'updateAlarms',
        settings: { 
          startTime, 
          endTime, 
          interval,
          resetTime,
          autoReset
        }
      });
      
      showStatus('设置已保存');
    });
  }
  
  // 显示状态消息
  function showStatus(message, isError = false) {
    statusElement.textContent = message;
    statusElement.style.color = isError ? '#F44336' : '#4CAF50';
    
    setTimeout(function() {
      statusElement.textContent = '';
    }, 3000);
  }
});