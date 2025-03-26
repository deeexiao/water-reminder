// 植物生长状态图标生成器
class PlantIcon {
  constructor(canvas, cupsCount = 0, maxCups = 8) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cupsCount = cupsCount;
    this.maxCups = maxCups;
    this.width = canvas.width;
    this.height = canvas.height;
    this.draw();
  }
  
  // 更新杯数并重绘
  updateCups(count) {
    this.cupsCount = count;
    this.draw();
  }
  
  // 绘制图标
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
  
  // 绘制土壤 - 更大更明显
  drawSoil() {
    this.ctx.fillStyle = '#8B4513'; // 土壤颜色
    this.ctx.beginPath();
    this.ctx.ellipse(this.width/2, this.height - 15, this.width/2 - 10, 15, 0, 0, Math.PI * 2);
    this.ctx.fill();
  }
  
  // 阶段1: 种子发芽 - 更大更明显
  // 确保所有绘制方法都已实现：
  drawStage1() {
    // 种子发芽
    this.ctx.fillStyle = '#3CB371';
    this.ctx.beginPath();
    this.ctx.moveTo(this.width/2, this.height - 20);
    this.ctx.lineTo(this.width/2, this.height - 50);
    this.ctx.lineWidth = 5;
    this.ctx.strokeStyle = '#3CB371';
    this.ctx.stroke();
    
    // 小芽尖
    this.ctx.beginPath();
    this.ctx.arc(this.width/2, this.height - 50, 5, 0, Math.PI * 2);
    this.ctx.fill();
  }
  
  // 阶段2: 小芽长高 - 更大更明显
  drawStage2() {
    this.ctx.beginPath();
    this.ctx.moveTo(this.width/2, this.height - 50);
    this.ctx.lineTo(this.width/2, this.height - 70);
    this.ctx.lineWidth = 5;
    this.ctx.strokeStyle = '#3CB371';
    this.ctx.stroke();
    
    // 芽尖
    this.ctx.beginPath();
    this.ctx.arc(this.width/2, this.height - 70, 6, 0, Math.PI * 2);
    this.ctx.fill();
  }
  
  // 阶段3: 左叶子 - 更大更明显
  drawStage3() {
    // 左叶子
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
    this.ctx.fillStyle = '#32CD32'; // 鲜绿色
    this.ctx.fill();
  }
  
  // 阶段4: 右叶子 - 更大更明显
  drawStage4() {
    // 右叶子
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
    this.ctx.fillStyle = '#32CD32'; // 鲜绿色
    this.ctx.fill();
  }
  
  // 阶段5: 茎延长 - 更大更明显
  drawStage5() {
    this.ctx.beginPath();
    this.ctx.moveTo(this.width/2, this.height - 70);
    this.ctx.lineTo(this.width/2, this.height - 90);
    this.ctx.lineWidth = 5;
    this.ctx.strokeStyle = '#228B22'; // 深绿色
    this.ctx.stroke();
  }
  
  // 阶段6: 花苞 - 更大更明显
  drawStage6() {
    this.ctx.beginPath();
    this.ctx.arc(this.width/2, this.height - 95, 12, 0, Math.PI * 2);
    this.ctx.fillStyle = '#9ACD32'; // 黄绿色
    this.ctx.fill();
  }
  
  // 阶段7: 花瓣开始 - 更大更明显
  drawStage7() {
    // 花苞变色
    this.ctx.beginPath();
    this.ctx.arc(this.width/2, this.height - 95, 12, 0, Math.PI * 2);
    this.ctx.fillStyle = '#FF69B4'; // 粉红色
    this.ctx.fill();
    
    // 花瓣开始展开
    const centerX = this.width/2;
    const centerY = this.height - 95;
    const petalLength = 10;
    
    // 绘制几片小花瓣
    for (let i = 0; i < 5; i++) {
      const angle = (i * Math.PI * 2) / 5;
      const x = centerX + Math.cos(angle) * petalLength;
      const y = centerY + Math.sin(angle) * petalLength;
      
      this.ctx.beginPath();
      this.ctx.arc(x, y, 8, 0, Math.PI * 2);
      this.ctx.fillStyle = '#FF1493'; // 深粉红色
      this.ctx.fill();
    }
  }
  
  // 阶段8: 花朵盛开 - 更大更明显
  drawStage8() {
    const centerX = this.width/2;
    const centerY = this.height - 95;
    
    // 花朵中心
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, 15, 0, Math.PI * 2);
    this.ctx.fillStyle = '#FFD700'; // 金色
    this.ctx.fill();
    
    // 绘制花瓣
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
      this.ctx.fillStyle = '#FF69B4'; // 粉红色
      this.ctx.fill();
    }
    
    // 添加一些装饰
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
    this.ctx.fillStyle = '#FF4500'; // 橙红色
    this.ctx.fill();
  }
}

// 确保在不同环境中都能使用
if (typeof self !== 'undefined') {
  self.PlantIcon = PlantIcon;
}
if (typeof window !== 'undefined') {
  window.PlantIcon = PlantIcon;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PlantIcon;
}