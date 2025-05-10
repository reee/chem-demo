class Molecule {
    constructor(x, y, isActivated, velocity) {
        this.x = x;
        this.y = y;
        this.radius = 5;
        this.isActivated = isActivated;
        // 速度受温度影响
        this.baseVelocity = velocity;
        this.dx = (Math.random() - 0.5) * this.baseVelocity;
        this.dy = (Math.random() - 0.5) * this.baseVelocity;
        this.mass = 1;
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.isActivated ? '#e74c3c' : '#3498db';
        ctx.fill();
        ctx.closePath();
    }

    update(canvas) {
        this.x += this.dx;
        this.y += this.dy;

        // 边界碰撞检测
        if (this.x + this.radius > canvas.width || this.x - this.radius < 0) {
            this.dx = -this.dx;
            if (this.x + this.radius > canvas.width) {
                this.x = canvas.width - this.radius;
            }
            if (this.x - this.radius < 0) {
                this.x = this.radius;
            }
        }
        if (this.y + this.radius > canvas.height || this.y - this.radius < 0) {
            this.dy = -this.dy;
            if (this.y + this.radius > canvas.height) {
                this.y = canvas.height - this.radius;
            }
            if (this.y - this.radius < 0) {
                this.y = this.radius;
            }
        }
    }
}

class Simulation {
    constructor() {
        this.canvas = document.getElementById('simulation');
        this.ctx = this.canvas.getContext('2d');
        this.molecules = [];
        this.collisionCount = 0;
        this.effectiveCollisionCount = 0;
        this.lastStatsReset = Date.now();
        this.statsInterval = 5000; // 5秒统计一次
        this.defaultHeight = 0; // 将在resizeCanvas中设置
        this.currentVolume = 1.0; // 初始相对体积
        this.baseTemperature = 300; // 基准温度 (K)

        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        // 控制器
        this.volumeSlider = document.getElementById('volume');
        this.moleculeCountSlider = document.getElementById('molecule-count');
        this.temperatureSlider = document.getElementById('temperature');
        
        // 显示值
        this.volumeValue = document.getElementById('volume-value');
        this.moleculeCountValue = document.getElementById('molecule-count-value');
        this.temperatureValue = document.getElementById('temperature-value');
        this.currentPressure = document.getElementById('current-pressure');
        this.currentConcentration = document.getElementById('current-concentration');
        this.activatedPercentage = document.getElementById('activated-percentage');
        this.activatedMolecules = document.getElementById('activated-molecules');
        this.collisionRate = document.getElementById('collision-rate');
        this.effectiveCollisionRate = document.getElementById('effective-collision-rate');
        this.averageVelocity = document.getElementById('average-velocity');

        // 事件监听
        this.volumeSlider.addEventListener('input', () => this.updateSimulation());
        this.moleculeCountSlider.addEventListener('input', () => this.updateSimulation());
        this.temperatureSlider.addEventListener('input', () => this.updateSimulation());

        this.updateSimulation();
        this.animate();
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        
        // 设置默认高度（如果尚未设置）
        if (this.defaultHeight === 0) {
            this.defaultHeight = container.clientHeight;
        }
        
        // 根据当前体积比例设置画布高度
        const newHeight = this.defaultHeight * this.currentVolume;
        this.canvas.height = newHeight;
        
        // 同时调整容器高度
        container.style.height = `${newHeight}px`;
        
        // 如果已经有分子，在调整大小后重新定位它们
        if (this.molecules.length > 0) {
            this.molecules.forEach(molecule => {
                if (molecule.x > this.canvas.width) {
                    molecule.x = this.canvas.width - molecule.radius;
                }
                if (molecule.y > this.canvas.height) {
                    molecule.y = this.canvas.height - molecule.radius;
                }
            });
        }
    }

    // 根据温度计算活化分子百分比
    calculateActivationPercentage(temperature) {
        // 使用阿伦尼乌斯方程的简化模型
        const basePercentage = 20; // 基础活化百分比（在基准温度300K时为20%）
        const factor = 150; // 调整因子
        const percentage = basePercentage * Math.exp((temperature - this.baseTemperature) / factor);
        return Math.min(Math.round(percentage), 100); // 确保不超过100%
    }

    // 根据温度计算分子平均速度
    calculateAverageVelocity(temperature) {
        // 根据麦克斯韦-玻尔兹曼分布，速度与温度的平方根成正比
        return Math.sqrt(temperature / this.baseTemperature) * 8; // 8是基础速度因子
    }

    updateBackgroundColor(temperature) {
        // 根据温度改变背景色，从冷色调到暖色调
        const minTemp = parseInt(this.temperatureSlider.min);
        const maxTemp = parseInt(this.temperatureSlider.max);
        const normalizedTemp = (temperature - minTemp) / (maxTemp - minTemp);
        
        const r = Math.round(normalizedTemp * 255);
        const b = Math.round(255 * (1 - normalizedTemp));
        const g = Math.round(200 * (1 - normalizedTemp * 0.5));
        
        const bgColor = `rgba(${r}, ${g}, ${b}, 0.1)`;
        this.canvas.style.backgroundColor = bgColor;
    }

    updateSimulation() {
        // 获取滑块值
        this.currentVolume = parseFloat(this.volumeSlider.value);
        const moleculeCount = parseInt(this.moleculeCountSlider.value);
        const temperature = parseInt(this.temperatureSlider.value);
        
        // 计算活化分子百分比
        const activatedPercentage = this.calculateActivationPercentage(temperature);
        
        // 计算相对平均速度（与温度的平方根成正比）
        const relativeVelocity = Math.sqrt(temperature / this.baseTemperature).toFixed(2);
        this.averageVelocity.textContent = relativeVelocity;
        
        // 计算实际平均速度（用于分子运动）
        const averageVelocity = this.calculateAverageVelocity(temperature);
        
        // 更新显示值
        this.volumeValue.textContent = this.currentVolume.toFixed(2);
        this.moleculeCountValue.textContent = moleculeCount;
        this.temperatureValue.textContent = temperature;
        
        // 计算相对浓度（分子数/体积）
        const concentration = (moleculeCount / this.currentVolume).toFixed(2);
        this.currentConcentration.textContent = concentration;
        
        // 计算相对压强（基于理想气体状态方程 PV = nRT）
        // P = (n/V)RT = cRT，其中 c 是浓度
        // 相对压强 = (c/c₀)(T/T₀) = (当前浓度/初始浓度)(当前温度/初始温度)
        const pressure = (parseFloat(concentration) * (temperature / this.baseTemperature)).toFixed(2);
        this.currentPressure.textContent = pressure;
        
        // 更新活化分子相关数据
        this.activatedPercentage.textContent = activatedPercentage + '%';
        
        // 计算活化分子数量
        const activatedCount = Math.floor(moleculeCount * (activatedPercentage / 100));
        
        // 计算单位体积内活化分子数
        const activatedDensity = Math.round(activatedCount / this.currentVolume);
        this.activatedMolecules.textContent = activatedDensity;
        
        // 更新背景颜色以反映温度变化
        this.updateBackgroundColor(temperature);
        
        // 调整画布高度以反映体积变化
        this.resizeCanvas();
        
        // 创建新的分子集合
        this.molecules = [];
        
        // 创建活化分子
        for (let i = 0; i < activatedCount; i++) {
            this.molecules.push(new Molecule(
                Math.random() * this.canvas.width,
                Math.random() * this.canvas.height,
                true,
                averageVelocity
            ));
        }
        
        // 创建未活化分子
        for (let i = 0; i < moleculeCount - activatedCount; i++) {
            this.molecules.push(new Molecule(
                Math.random() * this.canvas.width,
                Math.random() * this.canvas.height,
                false,
                averageVelocity
            ));
        }
    }

    checkCollisions() {
        for (let i = 0; i < this.molecules.length; i++) {
            for (let j = i + 1; j < this.molecules.length; j++) {
                const mol1 = this.molecules[i];
                const mol2 = this.molecules[j];
                
                const dx = mol2.x - mol1.x;
                const dy = mol2.y - mol1.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < mol1.radius + mol2.radius) {
                    // 碰撞发生
                    this.collisionCount++;
                    
                    // 如果两个分子都是活化分子，则为有效碰撞
                    if (mol1.isActivated && mol2.isActivated) {
                        this.effectiveCollisionCount++;
                    }
                    
                    // 改进的碰撞物理模型
                    const nx = dx / distance;
                    const ny = dy / distance;
                    
                    const dvx = mol2.dx - mol1.dx;
                    const dvy = mol2.dy - mol1.dy;
                    const dotProduct = dvx * nx + dvy * ny;
                    
                    if (dotProduct > 0) continue;
                    
                    const impulse = -2 * dotProduct / (mol1.mass + mol2.mass);
                    
                    mol1.dx -= impulse * mol2.mass * nx;
                    mol1.dy -= impulse * mol2.mass * ny;
                    mol2.dx += impulse * mol1.mass * nx;
                    mol2.dy += impulse * mol1.mass * ny;
                }
            }
        }
        
        // 每5秒更新一次统计数据
        const now = Date.now();
        if (now - this.lastStatsReset >= this.statsInterval) {
            this.collisionRate.textContent = this.collisionCount;
            this.effectiveCollisionRate.textContent = this.effectiveCollisionCount;
            this.collisionCount = 0;
            this.effectiveCollisionCount = 0;
            this.lastStatsReset = now;
        }
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.molecules.forEach(molecule => {
            molecule.update(this.canvas);
            molecule.draw(this.ctx);
        });
        
        this.checkCollisions();
        
        requestAnimationFrame(() => this.animate());
    }
}

// 启动模拟
window.addEventListener('load', () => {
    new Simulation();
});
