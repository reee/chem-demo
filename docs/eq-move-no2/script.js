document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const calculateInitialBtn = document.getElementById('calculate-initial');
    const calculateNewBtn = document.getElementById('calculate-new');
    const simulateReactionBtn = document.getElementById('simulate-reaction');
    
    const initialEquilibriumDiv = document.getElementById('initial-equilibrium');
    const afterChangeDiv = document.getElementById('after-change');
    const newEquilibriumDiv = document.getElementById('new-equilibrium');
    
    // Chart elements
    const rateChartCtx = document.getElementById('rateChart').getContext('2d');
    const concentrationChartCtx = document.getElementById('concentrationChart').getContext('2d');
    const fullscreenChartCtx = document.getElementById('fullscreenChart').getContext('2d');
    
    // Modal elements
    const modal = document.getElementById('fullscreenModal');
    const closeModalBtn = document.querySelector('.close-modal');
    const fullscreenBtns = document.querySelectorAll('.btn-fullscreen');
    
    // Charts
    let rateChart = null;
    let concentrationChart = null;
    let fullscreenChart = null;
    let currentFullscreenTarget = null;
    
    // State variables
    let initialEquilibriumState = null;
    let afterChangeState = null;
    let newEquilibriumState = null;
    
    // Simulation variables
    let simulationData = null;
    let isSimulationRunning = false;

    // Event Listeners
    calculateInitialBtn.addEventListener('click', calculateInitialEquilibrium);
    calculateNewBtn.addEventListener('click', calculateNewEquilibrium);
    simulateReactionBtn.addEventListener('click', simulateReaction);
    
    // 全屏功能相关事件监听器
    fullscreenBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const target = this.getAttribute('data-target');
            openFullscreen(target);
        });
    });
    
    closeModalBtn.addEventListener('click', closeFullscreen);
    
    // 点击模态框外部关闭
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            closeFullscreen();
        }
    });

    // Functions
    function calculateInitialEquilibrium() {
        const kValue = parseFloat(document.getElementById('k-value').value);
        
        if (kValue <= 0) {
            alert('平衡常数必须大于0');
            return;
        }

        // Get initial NO2 concentration
        const no2Initial = parseFloat(document.getElementById('no2-initial').value);
        
        if (no2Initial <= 0) {
            alert('反应物初始浓度必须大于0');
            return;
        }
        
        // Calculate equilibrium concentrations
        initialEquilibriumState = calculateEquilibriumFromReactants(no2Initial, kValue);
        
        // Display initial equilibrium state
        displayInitialEquilibrium(initialEquilibriumState);
        
        // Enable the calculate new equilibrium button
        calculateNewBtn.disabled = false;
    }

    function calculateNewEquilibrium() {
        if (!initialEquilibriumState) {
            alert('请先计算初始平衡');
            return;
        }
        
        // Get volume ratio
        const volumeRatio = parseFloat(document.getElementById('volume-ratio').value) || 1.0;
        
        if (volumeRatio <= 0) {
            alert('容器相对体积必须大于0');
            return;
        }
        
        // Calculate immediate state after changing volume
        afterChangeState = calculateAfterVolumeChange(initialEquilibriumState, volumeRatio);
        
        // Display after change state
        displayAfterChange(afterChangeState);
        
        // Calculate new equilibrium
        const kValue = parseFloat(document.getElementById('k-value').value);
        newEquilibriumState = calculateNewEquilibriumState(afterChangeState, kValue);
        
        // Display new equilibrium state
        displayNewEquilibrium(newEquilibriumState, initialEquilibriumState);
        
        // Enable simulation button
        simulateReactionBtn.disabled = false;
    }

    function calculateEquilibriumFromReactants(no2Initial, kValue) {
        // 2NO2 ⇌ N2O4
        // 设 x 为平衡时N2O4的浓度
        // 则 NO2的平衡浓度为 no2Initial - 2x
        // 平衡常数 K = [N2O4]/[NO2]^2
        // 即 K = x/((no2Initial - 2x)^2)
        // 解得 x = K*(no2Initial - 2x)^2
        
        // 使用数值方法求解
        let x = 0;
        let xMax = no2Initial / 2; // 最大可能的N2O4浓度（如果全部NO2都转化为N2O4）
        let xMin = 0;
        let iterations = 0;
        const maxIterations = 100;
        const tolerance = 1e-10;
        
        while (iterations < maxIterations) {
            x = (xMin + xMax) / 2;
            
            const no2Eq = no2Initial - 2 * x;
            const n2o4Eq = x;
            
            if (no2Eq < 0) {
                // 物理上不可能，NO2浓度不能为负
                xMax = x;
                continue;
            }
            
            const reactionQuotient = n2o4Eq / Math.pow(no2Eq, 2);
            
            if (Math.abs(reactionQuotient - kValue) < tolerance) {
                break;
            }
            
            if (reactionQuotient < kValue) {
                xMin = x;
            } else {
                xMax = x;
            }
            
            iterations++;
        }
        
        const no2Eq = no2Initial - 2 * x;
        const n2o4Eq = x;
        
        // Calculate conversion rate
        const no2ConversionRate = (2 * x) / no2Initial * 100;
        
        return {
            no2Initial,
            n2o4Initial: 0,
            no2Eq,
            n2o4Eq,
            no2ConversionRate,
            reactionQuotient: n2o4Eq / Math.pow(no2Eq, 2),
            volume: 1.0 // 初始相对体积为1.0
        };
    }

    function calculateAfterVolumeChange(initialState, volumeRatio) {
        // 复制初始平衡状态
        const afterState = { ...initialState };
        
        // 更新体积
        afterState.newVolume = volumeRatio;
        
        // 计算体积变化后的瞬时浓度（按照体积反比关系）
        afterState.no2After = afterState.no2Eq / volumeRatio;
        afterState.n2o4After = afterState.n2o4Eq / volumeRatio;
        
        // 计算体积变化后的反应商 Q
        afterState.reactionQuotientAfter = afterState.n2o4After / Math.pow(afterState.no2After, 2);
        
        return afterState;
    }

    function calculateNewEquilibriumState(afterChangeState, kValue) {
        const newState = { ...afterChangeState };
        
        // 确定平衡移动方向
        // 使用容差值判断是否相等
        const epsilon = 0.0001;
        const qToK = Math.abs(newState.reactionQuotientAfter - kValue);
        
        if (Math.abs(newState.newVolume - 1.0) < 0.001 || qToK < epsilon) {
            newState.equilibriumDirection = 'none'; // 无移动
        } else {
            newState.equilibriumDirection = newState.reactionQuotientAfter < kValue ? 'forward' : 'reverse';
        }
        
        // 计算新的平衡状态
        // 设 y 为平衡移动过程中 N2O4 浓度的变化量
        // 若正向反应，则 y > 0；若逆向反应，则 y < 0
        
        let y = 0;
        let yMax, yMin;
        
        if (newState.equilibriumDirection === 'forward') {
            // 正向反应：2NO2 → N2O4
            // 最大可能的变化量为 NO2浓度/2
            yMax = newState.no2After / 2;
            yMin = 0;
        } else {
            // 逆向反应：N2O4 → 2NO2
            // 最大可能的变化量为 N2O4浓度（取负值）
            yMin = -newState.n2o4After;
            yMax = 0;
        }
        
        let iterations = 0;
        const maxIterations = 100;
        const tolerance = 1e-10;
        
        while (iterations < maxIterations) {
            y = (yMin + yMax) / 2;
            
            const no2New = newState.no2After - 2 * y; // 若y>0，NO2减少；若y<0，NO2增加
            const n2o4New = newState.n2o4After + y;   // 若y>0，N2O4增加；若y<0，N2O4减少
            
            if (no2New < 0 || n2o4New < 0) {
                // 物理上不可能，浓度不能为负
                if (newState.equilibriumDirection === 'forward') {
                    yMax = y;
                } else {
                    yMin = y;
                }
                continue;
            }
            
            const reactionQuotient = n2o4New / Math.pow(no2New, 2);
            
            if (Math.abs(reactionQuotient - kValue) < tolerance) {
                break;
            }
            
            if (reactionQuotient < kValue) {
                yMin = y;
            } else {
                yMax = y;
            }
            
            iterations++;
        }
        
        // 更新新平衡状态的浓度
        newState.no2New = newState.no2After - 2 * y;
        newState.n2o4New = newState.n2o4After + y;
        newState.additionalReactionAmount = y;
        
        // 计算总转化率
        const totalNO2 = newState.no2Initial;
        const no2Reacted = totalNO2 - newState.no2New * newState.newVolume; // 考虑体积变化
        newState.no2OverallConversionRate = (no2Reacted / totalNO2) * 100;
        
        return newState;
    }

    function displayInitialEquilibrium(state) {
        const content = `
            <p>平衡NO₂浓度: <span class="highlight">${state.no2Eq.toFixed(4)}</span> mol/L</p>
            <p>平衡N₂O₄浓度: <span class="highlight">${state.n2o4Eq.toFixed(4)}</span> mol/L</p>
            <p>NO₂转化率: <span class="highlight">${state.no2ConversionRate.toFixed(2)}</span>%</p>
        `;
        
        initialEquilibriumDiv.querySelector('.result-content').innerHTML = content;
    }

    function displayAfterChange(state) {
        const kValue = parseFloat(document.getElementById('k-value').value);
        let comparisonText = '';
        let directionText = '';
        
        // 使用一个小的容差值来判断Q和K是否相等，解决浮点数精度问题
        const epsilon = 0.0001;
        const qToK = Math.abs(state.reactionQuotientAfter - kValue);
        
        // 如果体积比为1.0或Q与K非常接近，则认为Q=K
        if (Math.abs(state.newVolume - 1.0) < 0.001 || qToK < epsilon) {
            directionText = 'Q  = K，仍处于平衡状态';
        } else if (state.reactionQuotientAfter < kValue) {
            directionText = 'Q  < K，正向移动 (2NO₂ → N₂O₄)';
        } else {
            directionText = 'Q  > K，逆向移动 (N₂O₄ → 2NO₂)';
        }
        
        const content = `
            <p>容器相对体积: <span class="highlight">${state.newVolume.toFixed(1)}</span></p>
            <p>NO₂浓度: <span class="highlight">${state.no2After.toFixed(4)}</span> mol/L</p>
            <p>N₂O₄浓度: <span class="highlight">${state.n2o4After.toFixed(4)}</span> mol/L</p>
            <div class="equilibrium-direction">
                <p><span class="highlight direction">${directionText}</span></p>
            </div>
        `;
        
        afterChangeDiv.querySelector('.result-content').innerHTML = content;
    }

    function displayNewEquilibrium(state, initialState) {
        const content = `
            <p>新平衡NO₂浓度: <span class="highlight">${state.no2New.toFixed(4)}</span> mol/L</p>
            <p>新平衡N₂O₄浓度: <span class="highlight">${state.n2o4New.toFixed(4)}</span> mol/L</p>
            <p>NO₂总转化率: <span class="highlight">${state.no2OverallConversionRate.toFixed(2)}</span>%</p>
        `;
        
        newEquilibriumDiv.querySelector('.result-content').innerHTML = content;
    }

    function simulateReaction() {
        if (!initialEquilibriumState || !afterChangeState || !newEquilibriumState) {
            alert('请先计算初始平衡和新平衡');
            return;
        }
        
        // 禁用模拟按钮，避免重复点击
        simulateReactionBtn.disabled = true;
        
        // 获取平衡常数
        const kValue = parseFloat(document.getElementById('k-value').value);
        
        // 计算反应速率常数（假设值，保证平衡时 kf/kr = K）
        const kr = 0.5;  // 逆反应速率常数
        const kf = kr * kValue;  // 正反应速率常数
        
        // 运行模拟
        simulationData = runSimulation(initialEquilibriumState, afterChangeState, newEquilibriumState, kf, kr);
        
        // 绘制图表
        drawRateChart(simulationData);
        drawConcentrationChart(simulationData);
        
        // 启用模拟按钮
        simulateReactionBtn.disabled = false;
    }

    function runSimulation(initialState, afterChangeState, newState, kf, kr) {
        // 模拟参数
        const dt = 0.01;  // 时间步长（秒）
        const totalTime = 20;  // 总模拟时间（秒）
        const steps = Math.ceil(totalTime / dt);
        
        // 存储模拟数据的数组
        const timePoints = [];
        const no2Conc = [];
        const n2o4Conc = [];
        const forwardRates = [];
        const reverseRates = [];
        const netRates = [];
        
        // 阶段0：从纯反应物开始，建立原平衡
        // 初始条件 - 从纯反应物开始
        let no2 = initialState.no2Initial;
        let n2o4 = 0; // 初始没有生成物
        
        // 存储初始值
        timePoints.push(0);
        no2Conc.push(no2);
        n2o4Conc.push(n2o4);
        
        // 计算初始速率
        let forwardRate = kf * Math.pow(no2, 2);
        let reverseRate = kr * n2o4;
        let netRate = forwardRate - reverseRate;
        
        forwardRates.push(forwardRate);
        reverseRates.push(reverseRate);
        netRates.push(netRate);
        
        // 第0阶段：建立原平衡
        const phase0Steps = Math.ceil(steps * 0.3); // 30% 的总时间用于建立原平衡
        
        for (let i = 1; i <= phase0Steps; i++) {
            const t = i * dt;
            
            // 计算速率
            forwardRate = kf * Math.pow(no2, 2);
            reverseRate = kr * n2o4;
            netRate = forwardRate - reverseRate;
            
            // 更新浓度
            no2 -= 2 * netRate * dt;  // 2个NO2分子参与反应
            n2o4 += netRate * dt;
            
            // 存储数据
            timePoints.push(t);
            no2Conc.push(no2);
            n2o4Conc.push(n2o4);
            forwardRates.push(forwardRate);
            reverseRates.push(reverseRate);
            netRates.push(netRate);
        }
        
        // 第一阶段：维持原平衡状态一段时间
        // 将浓度重置为精确的平衡值
        no2 = initialState.no2Eq;
        n2o4 = initialState.n2o4Eq;
        
        const phase1Steps = Math.ceil(steps * 0.2);  // 20% 的总时间用于展示稳定的原平衡
        const equilibriumTime = timePoints[timePoints.length - 1];
        
        for (let i = 1; i <= phase1Steps; i++) {
            const t = equilibriumTime + i * dt;
            
            // 计算速率
            forwardRate = kf * Math.pow(no2, 2);
            reverseRate = kr * n2o4;
            netRate = forwardRate - reverseRate;
            
            // 更新浓度 (平衡状态下变化很小)
            no2 -= 2 * netRate * dt;
            n2o4 += netRate * dt;
            
            // 存储数据
            timePoints.push(t);
            no2Conc.push(no2);
            n2o4Conc.push(n2o4);
            forwardRates.push(forwardRate);
            reverseRates.push(reverseRate);
            netRates.push(netRate);
        }
        
        // 第二阶段：改变容器体积
        // 瞬间改变为体积改变后的状态
        no2 = afterChangeState.no2After;
        n2o4 = afterChangeState.n2o4After;
        
        const changeTime = timePoints[timePoints.length - 1];
        
        // 存储瞬时变化
        timePoints.push(changeTime + dt);
        no2Conc.push(no2);
        n2o4Conc.push(n2o4);
        
        // 计算条件改变后的新速率
        forwardRate = kf * Math.pow(no2, 2);
        reverseRate = kr * n2o4;
        netRate = forwardRate - reverseRate;
        
        forwardRates.push(forwardRate);
        reverseRates.push(reverseRate);
        netRates.push(netRate);
        
        // 第三阶段：建立新平衡
        const remainingSteps = steps - phase0Steps - phase1Steps - 1;
        
        for (let i = 1; i <= remainingSteps; i++) {
            const t = changeTime + dt + i * dt;
            
            // 计算速率
            forwardRate = kf * Math.pow(no2, 2);
            reverseRate = kr * n2o4;
            netRate = forwardRate - reverseRate;
            
            // 更新浓度
            no2 -= 2 * netRate * dt;
            n2o4 += netRate * dt;
            
            // 存储数据
            timePoints.push(t);
            no2Conc.push(no2);
            n2o4Conc.push(n2o4);
            forwardRates.push(forwardRate);
            reverseRates.push(reverseRate);
            netRates.push(netRate);
        }
        
        return {
            timePoints,
            no2Conc,
            n2o4Conc,
            forwardRates,
            reverseRates,
            netRates,
            changeTime,
            equilibriumTime
        };
    }
    
    // 全屏功能相关函数
    function openFullscreen(target) {
        currentFullscreenTarget = target;
        modal.style.display = 'block';
        
        // 根据目标图表类型绘制全屏图表
        if (target === 'rateChart' && simulationData) {
            drawFullscreenChart(simulationData, 'rate');
        } else if (target === 'concentrationChart' && simulationData) {
            drawFullscreenChart(simulationData, 'concentration');
        }
    }
    
    function closeFullscreen() {
        modal.style.display = 'none';
        if (fullscreenChart) {
            fullscreenChart.destroy();
            fullscreenChart = null;
        }
    }
    
    function drawFullscreenChart(data, type) {
        // 销毁先前的全屏图表
        if (fullscreenChart) {
            fullscreenChart.destroy();
        }
        
        // 根据图表类型绘制全屏图表
        if (type === 'rate') {
            fullscreenChart = drawRateChartToCanvas(data, fullscreenChartCtx, true);
        } else if (type === 'concentration') {
            fullscreenChart = drawConcentrationChartToCanvas(data, fullscreenChartCtx, true);
        }
    }
    
    function drawRateChart(data) {
        // 销毁先前的图表
        if (rateChart) {
            rateChart.destroy();
        }
        
        // 绘制速率图表
        rateChart = drawRateChartToCanvas(data, rateChartCtx, false);
    }
    
    function drawRateChartToCanvas(data, ctx, isFullscreen) {
        const fontSize = isFullscreen ? 14 : 12;
        const annotations = [];
        
        // 添加平衡建立时间标注
        annotations.push({
            type: 'line',
            xMin: data.equilibriumTime,
            xMax: data.equilibriumTime,
            borderColor: 'rgba(75, 192, 192, 0.5)',
            borderWidth: 2,
            borderDash: [5, 5],
            label: {
                enabled: true,
                content: '初始平衡建立',
                position: 'top',
                backgroundColor: 'rgba(75, 192, 192, 0.7)',
                font: {
                    size: fontSize
                }
            }
        });
        
        // 添加条件改变时间标注
        annotations.push({
            type: 'line',
            xMin: data.changeTime,
            xMax: data.changeTime,
            borderColor: 'rgba(255, 99, 132, 0.5)',
            borderWidth: 2,
            borderDash: [5, 5],
            label: {
                enabled: true,
                content: '改变容器体积',
                position: 'top',
                backgroundColor: 'rgba(255, 99, 132, 0.7)',
                font: {
                    size: fontSize
                }
            }
        });
        
        return new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.timePoints,
                datasets: [
                    {
                        label: '正反应速率',
                        data: data.forwardRates,
                        borderColor: 'rgb(54, 162, 235)',
                        backgroundColor: 'rgba(54, 162, 235, 0.1)',
                        borderWidth: 2,
                        fill: false,
                        tension: 0.1,
                        pointRadius: 0,  // 移除数据点标记
                        pointHoverRadius: 3  // 鼠标悬停时显示点
                    },
                    {
                        label: '逆反应速率',
                        data: data.reverseRates,
                        borderColor: 'rgb(255, 99, 132)',
                        backgroundColor: 'rgba(255, 99, 132, 0.1)',
                        borderWidth: 2,
                        fill: false,
                        tension: 0.1,
                        pointRadius: 0,
                        pointHoverRadius: 3
                    },
                    {
                        label: '净反应速率',
                        data: data.netRates,
                        borderColor: 'rgb(75, 192, 192)',
                        backgroundColor: 'rgba(75, 192, 192, 0.1)',
                        borderWidth: 2,
                        fill: false,
                        tension: 0.1,
                        pointRadius: 0,
                        pointHoverRadius: 3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: '反应速率随时间变化',
                        font: {
                            size: fontSize + 2
                        }
                    },
                    legend: {
                        position: 'top',
                        labels: {
                            font: {
                                size: fontSize
                            }
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    },
                    annotation: {
                        annotations: annotations
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: '时间 (s)',
                            font: {
                                size: fontSize
                            }
                        },
                        ticks: {
                            font: {
                                size: fontSize
                            },
                            callback: function(value, index, values) {
                                // 只显示整数刻度
                                if (Number.isInteger(data.timePoints[index])) {
                                    return data.timePoints[index];
                                }
                                return '';
                            }
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: '反应速率 (mol·L⁻¹·s⁻¹)',
                            font: {
                                size: fontSize
                            }
                        },
                        ticks: {
                            font: {
                                size: fontSize
                            }
                        }
                    }
                }
            }
        });
    }
    
    function drawConcentrationChart(data) {
        // 销毁先前的图表
        if (concentrationChart) {
            concentrationChart.destroy();
        }
        
        // 绘制浓度图表
        concentrationChart = drawConcentrationChartToCanvas(data, concentrationChartCtx, false);
    }
    
    function drawConcentrationChartToCanvas(data, ctx, isFullscreen) {
        const fontSize = isFullscreen ? 14 : 12;
        const annotations = [];
        
        // 添加平衡建立时间标注
        annotations.push({
            type: 'line',
            xMin: data.equilibriumTime,
            xMax: data.equilibriumTime,
            borderColor: 'rgba(75, 192, 192, 0.5)',
            borderWidth: 2,
            borderDash: [5, 5],
            label: {
                enabled: true,
                content: '初始平衡建立',
                position: 'top',
                backgroundColor: 'rgba(75, 192, 192, 0.7)',
                font: {
                    size: fontSize
                }
            }
        });
        
        // 添加条件改变时间标注
        annotations.push({
            type: 'line',
            xMin: data.changeTime,
            xMax: data.changeTime,
            borderColor: 'rgba(255, 99, 132, 0.5)',
            borderWidth: 2,
            borderDash: [5, 5],
            label: {
                enabled: true,
                content: '改变容器体积',
                position: 'top',
                backgroundColor: 'rgba(255, 99, 132, 0.7)',
                font: {
                    size: fontSize
                }
            }
        });
        
        return new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.timePoints,
                datasets: [
                    {
                        label: 'NO₂ 浓度',
                        data: data.no2Conc,
                        borderColor: 'rgb(255, 99, 132)',
                        backgroundColor: 'rgba(255, 99, 132, 0.1)',
                        borderWidth: 2,
                        fill: false,
                        tension: 0.1,
                        pointRadius: 0,
                        pointHoverRadius: 3
                    },
                    {
                        label: 'N₂O₄ 浓度',
                        data: data.n2o4Conc,
                        borderColor: 'rgb(54, 162, 235)',
                        backgroundColor: 'rgba(54, 162, 235, 0.1)',
                        borderWidth: 2,
                        fill: false,
                        tension: 0.1,
                        pointRadius: 0,
                        pointHoverRadius: 3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: '物质浓度随时间变化',
                        font: {
                            size: fontSize + 2
                        }
                    },
                    legend: {
                        position: 'top',
                        labels: {
                            font: {
                                size: fontSize
                            }
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    },
                    annotation: {
                        annotations: annotations
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: '时间 (s)',
                            font: {
                                size: fontSize
                            }
                        },
                        ticks: {
                            font: {
                                size: fontSize
                            },
                            callback: function(value, index, values) {
                                // 只显示整数刻度
                                if (Number.isInteger(data.timePoints[index])) {
                                    return data.timePoints[index];
                                }
                                return '';
                            }
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: '浓度 (mol/L)',
                            font: {
                                size: fontSize
                            }
                        },
                        ticks: {
                            font: {
                                size: fontSize
                            }
                        }
                    }
                }
            }
        });
    }
});
