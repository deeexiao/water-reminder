// 常量定义
const SETTINGS_VALIDATION = {
  interval: { min: 30, max: 180 },
  cupsGoal: { min: 1, max: 20 },
  notificationTimeout: { min: 5, max: 60 }
};

const DEFAULT_SETTINGS = {
  startTime: '08:00',
  endTime: '22:00',
  interval: 60,
  cupsGoal: 8,
  notificationSound: true,
  notificationTimeout: 30,
  customMessage: '该喝水啦！保持水分摄入，保持健康！',
  autoReset: true,
  resetTime: '00:00'
};

class OptionsManager {
  constructor() {
    this.elements = {
      startTimeInput: document.getElementById('start-time'),
      endTimeInput: document.getElementById('end-time'),
      intervalInput: document.getElementById('interval'),
      cupsGoalInput: document.getElementById('cups-goal'),
      notificationSoundCheckbox: document.getElementById('notification-sound'),
      notificationTimeoutInput: document.getElementById('notification-timeout'),
      customMessageInput: document.getElementById('custom-message'),
      autoResetCheckbox: document.getElementById('auto-reset'),
      resetTimeInput: document.getElementById('reset-time'),
      saveButton: document.getElementById('save-settings'),
      statusElement: document.getElementById('status')
    };
    
    this.initialize();
  }

  initialize() {
    this.elements.saveButton.addEventListener('click', () => this.saveSettings());
    this.loadSettings();
  }

  async loadSettings() {
    try {
      const settings = await chrome.storage.local.get(Object.keys(DEFAULT_SETTINGS));
      
      // 使用默认值填充缺失的设置
      const settingsToSet = {};
      for (const [key, defaultValue] of Object.entries(DEFAULT_SETTINGS)) {
        if (settings[key] === undefined) {
          settingsToSet[key] = defaultValue;
        }
      }
      
      if (Object.keys(settingsToSet).length > 0) {
        await chrome.storage.local.set(settingsToSet);
      }
      
      // 更新表单值
      this.updateFormValues(settings);
    } catch (error) {
      console.error('加载设置失败:', error);
      this.showStatus('加载设置失败，请刷新页面重试', true);
    }
  }

  updateFormValues(settings) {
    for (const [key, element] of Object.entries(this.elements)) {
      if (key === 'statusElement') continue;
      
      const value = settings[key];
      if (value !== undefined) {
        if (element.type === 'checkbox') {
          element.checked = value;
        } else {
          element.value = value;
        }
      }
    }
  }

  validateSettings(settings) {
    for (const [key, validation] of Object.entries(SETTINGS_VALIDATION)) {
      const value = parseInt(settings[key]);
      if (isNaN(value) || value < validation.min || value > validation.max) {
        this.showStatus(`${key} 必须在 ${validation.min}-${validation.max} 之间`, true);
        return false;
      }
    }
    return true;
  }

  async saveSettings() {
    try {
      const settings = {
        startTime: this.elements.startTimeInput.value,
        endTime: this.elements.endTimeInput.value,
        interval: parseInt(this.elements.intervalInput.value),
        cupsGoal: parseInt(this.elements.cupsGoalInput.value),
        notificationSound: this.elements.notificationSoundCheckbox.checked,
        notificationTimeout: parseInt(this.elements.notificationTimeoutInput.value),
        customMessage: this.elements.customMessageInput.value,
        autoReset: this.elements.autoResetCheckbox.checked,
        resetTime: this.elements.resetTimeInput.value
      };
      
      if (!this.validateSettings(settings)) {
        return;
      }
      
      // 保存设置
      await chrome.storage.local.set(settings);
      
      // 更新提醒计划
      await chrome.runtime.sendMessage({
        action: 'updateAlarms',
        settings: {
          startTime: settings.startTime,
          endTime: settings.endTime,
          interval: settings.interval,
          resetTime: settings.resetTime,
          autoReset: settings.autoReset
        }
      });
      
      this.showStatus('设置已保存');
    } catch (error) {
      console.error('保存设置失败:', error);
      this.showStatus('保存设置失败，请重试', true);
    }
  }

  showStatus(message, isError = false) {
    this.elements.statusElement.textContent = message;
    this.elements.statusElement.style.color = isError ? '#F44336' : '#4CAF50';
    
    setTimeout(() => {
      this.elements.statusElement.textContent = '';
    }, 3000);
  }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  window.optionsManager = new OptionsManager();
});