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
    
    // Initial state variables
    let initialEquilibriumState = null;
    let afterChangeState = null;
    let newEquilibriumState = null;
    
    // Simulation variables
    let simulationData = null;
    let isSimulationRunning = false;

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

        // Get reactant concentrations
        const fe3Initial = parseFloat(document.getElementById('fe3-initial').value);
        const scnInitial = parseFloat(document.getElementById('scn-initial').value);
        
        if (fe3Initial <= 0 || scnInitial <= 0) {
            alert('反应物初始浓度必须大于0');
            return;
        }
        
        // Calculate equilibrium concentrations
        initialEquilibriumState = calculateEquilibriumFromReactants(fe3Initial, scnInitial, kValue);
        
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
        
        // Get added amounts
        const addFe = parseFloat(document.getElementById('add-fe').value) || 0;
        const addKSCN = parseFloat(document.getElementById('add-kscn').value) || 0;
        const addFeSCN3 = parseFloat(document.getElementById('add-fescn3').value) || 0;
        
        if (addFe === 0 && addKSCN === 0 && addFeSCN3 === 0) {
            alert('请至少添加一种物质');
            return;
        }
        
        // Calculate immediate state after adding substances
        afterChangeState = calculateAfterChange(initialEquilibriumState, addFe, addKSCN, addFeSCN3);
        
        // Display after change state
        displayAfterChange(afterChangeState);
        
        // Calculate new equilibrium
        const kValue = parseFloat(document.getElementById('k-value').value);
        newEquilibriumState = calculateNewEquilibriumState(afterChangeState, kValue);
        
        // Display new equilibrium state
        displayNewEquilibrium(newEquilibriumState, initialEquilibriumState);
    }

    function calculateEquilibriumFromReactants(fe3Initial, scnInitial, kValue) {
        // Solve for x (amount reacted) using numerical method
        // Fe3+ + 3SCN- → Fe(SCN)3
        
        let x = 0;
        let xMax = Math.min(fe3Initial, scnInitial / 3);
        let xMin = 0;
        let iterations = 0;
        const maxIterations = 100;
        const tolerance = 1e-10;
        
        while (iterations < maxIterations) {
            x = (xMin + xMax) / 2;
            
            const fe3Eq = fe3Initial - x;
            const scnEq = scnInitial - 3 * x;
            const fescn3Eq = x;
            
            const reactionQuotient = fescn3Eq / (fe3Eq * Math.pow(scnEq, 3));
            
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
        
        const fe3Eq = fe3Initial - x;
        const scnEq = scnInitial - 3 * x;
        const fescn3Eq = x;
        
        // Calculate conversion rates
        const fe3ConversionRate = x / fe3Initial * 100;
        const scnConversionRate = (3 * x) / scnInitial * 100;
        
        return {
            fe3Initial,
            scnInitial,
            fescn3Initial: 0,
            fe3Eq,
            scnEq,
            fescn3Eq,
            fe3ConversionRate,
            scnConversionRate,
            fescn3ConversionRate: null,
            reactionQuotient: fescn3Eq / (fe3Eq * Math.pow(scnEq, 3))
        };
    }

    // 移除了calculateEquilibriumFromProduct函数

    function calculateAfterChange(initialState, addFe, addKSCN, addFeSCN3) {
        // Copy initial equilibrium state
        const afterState = { ...initialState };
        
        // Calculate Fe2+ produced and Fe3+ consumed by Fe + 2Fe3+ → 3Fe2+
        const fe3Consumed = addFe > 0 ? Math.min(addFe * 2, afterState.fe3Eq) : 0;
        const fe2Produced = fe3Consumed * 1.5; // 3Fe2+ produced for every 2Fe3+ consumed
        
        // Update concentrations after adding substances
        afterState.fe3After = afterState.fe3Eq - fe3Consumed;
        afterState.scnAfter = afterState.scnEq + addKSCN;
        afterState.fescn3After = afterState.fescn3Eq + addFeSCN3;
        afterState.fe2After = fe2Produced;
        
        // Calculate reaction quotient Q
        afterState.reactionQuotientAfter = afterState.fescn3After / 
            (afterState.fe3After * Math.pow(afterState.scnAfter, 3));
        
        return afterState;
    }

    function calculateNewEquilibriumState(afterChangeState, kValue) {
        const newState = { ...afterChangeState };
        
        // Determine direction of equilibrium shift
        newState.equilibriumDirection = newState.reactionQuotientAfter < kValue ? 'forward' : 'reverse';
        
        // Calculate new equilibrium based on direction
        if (newState.equilibriumDirection === 'forward') {
            // Forward reaction: Fe3+ + 3SCN- → Fe(SCN)3
            // Solve for additional reaction amount x
            let x = 0;
            let xMax = Math.min(newState.fe3After, newState.scnAfter / 3);
            let xMin = 0;
            let iterations = 0;
            const maxIterations = 100;
            const tolerance = 1e-10;
            
            while (iterations < maxIterations) {
                x = (xMin + xMax) / 2;
                
                const fe3New = newState.fe3After - x;
                const scnNew = newState.scnAfter - 3 * x;
                const fescn3New = newState.fescn3After + x;
                
                const reactionQuotient = fescn3New / (fe3New * Math.pow(scnNew, 3));
                
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
            
            newState.fe3New = newState.fe3After - x;
            newState.scnNew = newState.scnAfter - 3 * x;
            newState.fescn3New = newState.fescn3After + x;
            newState.fe2New = newState.fe2After;
            newState.additionalReactionAmount = x;
            
        } else {
            // Reverse reaction: Fe(SCN)3 → Fe3+ + 3SCN-
            // Solve for dissociation amount y
            let y = 0;
            let yMax = newState.fescn3After;
            let yMin = 0;
            let iterations = 0;
            const maxIterations = 100;
            const tolerance = 1e-10;
            
            while (iterations < maxIterations) {
                y = (yMin + yMax) / 2;
                
                const fe3New = newState.fe3After + y;
                const scnNew = newState.scnAfter + 3 * y;
                const fescn3New = newState.fescn3After - y;
                
                const reactionQuotient = fescn3New / (fe3New * Math.pow(scnNew, 3));
                
                if (Math.abs(reactionQuotient - kValue) < tolerance) {
                    break;
                }
                
                if (reactionQuotient > kValue) {
                    yMin = y;
                } else {
                    yMax = y;
                }
                
                iterations++;
            }
            
            newState.fe3New = newState.fe3After + y;
            newState.scnNew = newState.scnAfter + 3 * y;
            newState.fescn3New = newState.fescn3After - y;
            newState.fe2New = newState.fe2After;
            newState.additionalReactionAmount = -y; // Negative for reverse reaction
        }
        
        // Calculate overall conversion rates for reactants
        const totalFe3 = newState.fe3Initial;
        const totalSCN = newState.scnInitial;
        
        const fe3Reacted = totalFe3 - newState.fe3New;
        const scnReacted = totalSCN - newState.scnNew;
        
        newState.fe3OverallConversionRate = (fe3Reacted / totalFe3) * 100;
        newState.scnOverallConversionRate = (scnReacted / totalSCN) * 100;
        
        return newState;
    }

    function displayInitialEquilibrium(state) {
        let html = '<h3>初始平衡状态</h3><div class="result-content">';
        
        html += '<div class="data-row"><span class="data-label">Fe³⁺ 平衡浓度:</span> <span class="highlight">' + state.fe3Eq.toFixed(4) + '</span> mol/L</div>';
        html += '<div class="data-row"><span class="data-label">SCN⁻ 平衡浓度:</span> <span class="highlight">' + state.scnEq.toFixed(4) + '</span> mol/L</div>';
        html += '<div class="data-row"><span class="data-label">Fe(SCN)₃ 平衡浓度:</span> <span class="highlight">' + state.fescn3Eq.toFixed(4) + '</span> mol/L</div>';
        html += '<div class="data-row"><span class="data-label">Fe³⁺ 转化率:</span> <span class="highlight">' + state.fe3ConversionRate.toFixed(2) + '</span>%</div>';
        html += '<div class="data-row"><span class="data-label">SCN⁻ 转化率:</span> <span class="highlight">' + state.scnConversionRate.toFixed(2) + '</span>%</div>';
        
        html += '</div>';
        
        initialEquilibriumDiv.innerHTML = html;
    }

    function displayAfterChange(state) {
        let html = '<h3>条件改变后瞬时状态</h3><div class="result-content">';
        
        html += '<div class="data-row"><span class="data-label">Fe³⁺ 浓度:</span> <span class="highlight">' + state.fe3After.toFixed(4) + '</span> mol/L</div>';
        html += '<div class="data-row"><span class="data-label">SCN⁻ 浓度:</span> <span class="highlight">' + state.scnAfter.toFixed(4) + '</span> mol/L</div>';
        html += '<div class="data-row"><span class="data-label">Fe(SCN)₃ 浓度:</span> <span class="highlight">' + state.fescn3After.toFixed(4) + '</span> mol/L</div>';
        
        html += '<div class="data-row"><span class="data-label">浓度商 Q:</span> <span class="highlight">' + state.reactionQuotientAfter.toFixed(4) + '</span></div>';
        
        const kValue = parseFloat(document.getElementById('k-value').value);
        
        if (state.reactionQuotientAfter < kValue) {
            html += '<div class="equilibrium-direction direction-forward">Q < K，平衡将向正方向移动</div>';
        } else if (state.reactionQuotientAfter > kValue) {
            html += '<div class="equilibrium-direction direction-reverse">Q > K，平衡将向逆方向移动</div>';
        } else {
            html += '<div class="equilibrium-direction">Q = K，平衡不移动</div>';
        }
        
        html += '</div>';
        
        afterChangeDiv.innerHTML = html;
    }

    function displayNewEquilibrium(state, initialState) {
        let html = '<h3>新平衡状态</h3><div class="result-content">';
        
        html += '<div class="data-row"><span class="data-label">Fe³⁺ 平衡浓度:</span> <span class="highlight">' + state.fe3New.toFixed(4) + '</span> mol/L</div>';
        html += '<div class="data-row"><span class="data-label">SCN⁻ 平衡浓度:</span> <span class="highlight">' + state.scnNew.toFixed(4) + '</span> mol/L</div>';
        html += '<div class="data-row"><span class="data-label">Fe(SCN)₃ 平衡浓度:</span> <span class="highlight">' + state.fescn3New.toFixed(4) + '</span> mol/L</div>';
        
        if (state.equilibriumDirection === 'forward') {
            html += '<div class="data-row"><span class="data-label">额外反应量:</span> <span class="highlight">' + state.additionalReactionAmount.toFixed(4) + '</span> mol/L</div>';
        } else {
            html += '<div class="data-row"><span class="data-label">分解反应量:</span> <span class="highlight">' + Math.abs(state.additionalReactionAmount).toFixed(4) + '</span> mol/L</div>';
        }
        
        // Display overall conversion rates
        html += '<div class="data-row"><span class="data-label">Fe³⁺ 总转化率:</span> <span class="highlight">' + state.fe3OverallConversionRate.toFixed(2) + '</span>%</div>';
        html += '<div class="data-row"><span class="data-label">SCN⁻ 总转化率:</span> <span class="highlight">' + state.scnOverallConversionRate.toFixed(2) + '</span>%</div>';
        
        html += '</div>';
        
        newEquilibriumDiv.innerHTML = html;
        
        // Enable simulation button after new equilibrium is calculated
        simulateReactionBtn.disabled = false;
    }
    
    function simulateReaction() {
        if (!initialEquilibriumState || !newEquilibriumState) {
            alert('请先计算初始平衡和新平衡');
            return;
        }
        
        // 使用固定的正反应速率常数
        const kf = 20; // 选择一个合适的值
        
        // 计算逆反应速率常数
        const K = parseFloat(document.getElementById('k-value').value);
        const kr = kf / K;
        
        // 运行模拟
        simulationData = runSimulation(initialEquilibriumState, afterChangeState, newEquilibriumState, kf, kr);
        
        // 绘制图表
        drawRateChart(simulationData);
        drawConcentrationChart(simulationData);
    }
    
    function runSimulation(initialState, afterChangeState, newState, kf, kr) {
        // Simulation parameters
        const dt = 0.01;  // Time step (seconds)
        const totalTime = 20;  // Total simulation time (seconds) - 增加总时间以容纳更多阶段
        const steps = Math.ceil(totalTime / dt);
        
        // Arrays to store simulation data
        const timePoints = [];
        const fe3Conc = [];
        const scnConc = [];
        const fescn3Conc = [];
        const forwardRates = [];
        const reverseRates = [];
        const netRates = [];
        
        // 阶段0：从纯反应物开始，建立原平衡
        // 初始条件 - 从纯反应物开始
        let fe3 = initialState.fe3Initial;
        let scn = initialState.scnInitial;
        let fescn3 = 0; // 初始没有生成物
        
        // 存储初始值
        timePoints.push(0);
        fe3Conc.push(fe3);
        scnConc.push(scn);
        fescn3Conc.push(fescn3);
        
        // 计算初始速率
        let forwardRate = kf * fe3 * Math.pow(scn, 3);
        let reverseRate = kr * fescn3;
        let netRate = forwardRate - reverseRate;
        
        forwardRates.push(forwardRate);
        reverseRates.push(reverseRate);
        netRates.push(netRate);
        
        // 第0阶段：建立原平衡
        const phase0Steps = Math.ceil(steps * 0.4); // 40% 的总时间用于建立原平衡
        
        for (let i = 1; i <= phase0Steps; i++) {
            const t = i * dt;
            
            // 计算速率
            forwardRate = kf * fe3 * Math.pow(scn, 3);
            reverseRate = kr * fescn3;
            netRate = forwardRate - reverseRate;
            
            // 更新浓度
            fe3 -= netRate * dt;
            scn -= 3 * netRate * dt;
            fescn3 += netRate * dt;
            
            // 存储数据
            timePoints.push(t);
            fe3Conc.push(fe3);
            scnConc.push(scn);
            fescn3Conc.push(fescn3);
            forwardRates.push(forwardRate);
            reverseRates.push(reverseRate);
            netRates.push(netRate);
        }
        
        // 第一阶段：维持原平衡状态一段时间
        // 将浓度重置为精确的平衡值
        fe3 = initialState.fe3Eq;
        scn = initialState.scnEq;
        fescn3 = initialState.fescn3Eq;
        
        const phase1Steps = Math.ceil(steps * 0.1);  // 10% 的总时间用于展示稳定的原平衡
        const equilibriumTime = timePoints[timePoints.length - 1];
        
        for (let i = 1; i <= phase1Steps; i++) {
            const t = equilibriumTime + i * dt;
            
            // 计算速率
            forwardRate = kf * fe3 * Math.pow(scn, 3);
            reverseRate = kr * fescn3;
            netRate = forwardRate - reverseRate;
            
            // 更新浓度 (平衡状态下变化很小)
            fe3 -= netRate * dt;
            scn -= 3 * netRate * dt;
            fescn3 += netRate * dt;
            
            // 存储数据
            timePoints.push(t);
            fe3Conc.push(fe3);
            scnConc.push(scn);
            fescn3Conc.push(fescn3);
            forwardRates.push(forwardRate);
            reverseRates.push(reverseRate);
            netRates.push(netRate);
        }
        
        // 第二阶段：改变条件
        // 瞬间改变为条件改变后的状态
        fe3 = afterChangeState.fe3After;
        scn = afterChangeState.scnAfter;
        fescn3 = afterChangeState.fescn3After;
        
        const changeTime = timePoints[timePoints.length - 1];
        
        // 存储瞬时变化
        timePoints.push(changeTime + dt);
        fe3Conc.push(fe3);
        scnConc.push(scn);
        fescn3Conc.push(fescn3);
        
        // 计算条件改变后的新速率
        forwardRate = kf * fe3 * Math.pow(scn, 3);
        reverseRate = kr * fescn3;
        netRate = forwardRate - reverseRate;
        
        forwardRates.push(forwardRate);
        reverseRates.push(reverseRate);
        netRates.push(netRate);
        
        // 第三阶段：建立新平衡
        const remainingSteps = steps - phase0Steps - phase1Steps - 1;
        
        for (let i = 1; i <= remainingSteps; i++) {
            const t = changeTime + dt + i * dt;
            
            // 计算速率
            forwardRate = kf * fe3 * Math.pow(scn, 3);
            reverseRate = kr * fescn3;
            netRate = forwardRate - reverseRate;
            
            // 更新浓度
            fe3 -= netRate * dt;
            scn -= 3 * netRate * dt;
            fescn3 += netRate * dt;
            
            // 存储数据
            timePoints.push(t);
            fe3Conc.push(fe3);
            scnConc.push(scn);
            fescn3Conc.push(fescn3);
            forwardRates.push(forwardRate);
            reverseRates.push(reverseRate);
            netRates.push(netRate);
        }
        
        return {
            timePoints,
            fe3Conc,
            scnConc,
            fescn3Conc,
            forwardRates,
            reverseRates,
            netRates,
            changeTime,
            equilibriumTime  // 添加平衡建立时间点
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
        // 计算y轴的最大值和最小值，以便调整范围
        const allRates = [...data.forwardRates, ...data.reverseRates];
        const maxRate = Math.max(...allRates) * 1.1; // 给最大值增加10%的空间
        
        // 计算净反应速率的最小值，以处理负值
        const minNetRate = Math.min(...data.netRates) * 1.1; // 给最小值增加10%的空间
        const minY = minNetRate < 0 ? minNetRate : 0;
        
        // 创建图表配置
        const chartConfig = {
            type: 'line',
            data: {
                labels: data.timePoints,
                datasets: [
                    {
                        label: '正反应速率',
                        data: data.forwardRates,
                        borderColor: '#27ae60',
                        backgroundColor: 'rgba(39, 174, 96, 0.1)',
                        borderWidth: 2,
                        pointRadius: 0,
                        fill: false
                    },
                    {
                        label: '逆反应速率',
                        data: data.reverseRates,
                        borderColor: '#e74c3c',
                        backgroundColor: 'rgba(231, 76, 60, 0.1)',
                        borderWidth: 2,
                        pointRadius: 0,
                        fill: false
                    },
                    {
                        label: '净反应速率',
                        data: data.netRates,
                        borderColor: '#3498db',
                        backgroundColor: 'rgba(52, 152, 219, 0.1)',
                        borderWidth: 2,
                        pointRadius: 0,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: '时间 (s)'
                        },
                        ticks: {
                            callback: function(value) {
                                // 只显示整数时间点
                                return Number.isInteger(value) ? value : '';
                            },
                            autoSkip: true,
                            maxTicksLimit: 20
                        },
                        grid: {
                            color: function(context) {
                                // 在关键时间点处绘制突出的网格线
                                if (context.tick && (Math.abs(context.tick.value - data.equilibriumTime) < 0.01 || 
                                                     Math.abs(context.tick.value - data.changeTime) < 0.01)) {
                                    return 'rgba(0, 0, 0, 0.2)';
                                }
                                return 'rgba(0, 0, 0, 0.1)';
                            },
                            lineWidth: function(context) {
                                if (context.tick && (Math.abs(context.tick.value - data.equilibriumTime) < 0.01 || 
                                                     Math.abs(context.tick.value - data.changeTime) < 0.01)) {
                                    return 2;
                                }
                                return 1;
                            }
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: '反应速率 (mol/L·s)'
                        },
                        min: minY,  // 允许显示负值
                        max: maxRate,
                        grid: {
                            color: function(context) {
                                // 突出显示0处的水平线
                                if (context.tick && context.tick.value === 0) {
                                    return 'rgba(0, 0, 0, 0.2)';
                                }
                                return 'rgba(0, 0, 0, 0.1)';
                            },
                            lineWidth: function(context) {
                                if (context.tick && context.tick.value === 0) {
                                    return 2;
                                }
                                return 1;
                            }
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ' + context.parsed.y.toFixed(6) + ' mol/L·s';
                            }
                        }
                    },
                    legend: {
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 15
                        }
                    }
                }
            }
        };
        
        // 创建图表
        const chart = new Chart(ctx, chartConfig);
        
        // 添加标记线
        if (Chart.annotationPlugin) {
            chart.options.plugins.annotation = {
                annotations: {
                    // 原平衡建立线
                    equilibriumLine: {
                        type: 'line',
                        xMin: data.equilibriumTime,
                        xMax: data.equilibriumTime,
                        borderColor: 'rgba(52, 152, 219, 0.7)',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        label: {
                            content: '原平衡建立',
                            enabled: true,
                            position: 'top',
                            backgroundColor: 'rgba(52, 152, 219, 0.7)'
                        }
                    },
                    // 条件改变线
                    changeLine: {
                        type: 'line',
                        xMin: data.changeTime,
                        xMax: data.changeTime,
                        borderColor: 'rgba(231, 76, 60, 0.7)',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        label: {
                            content: '条件改变',
                            enabled: true,
                            position: 'top',
                            backgroundColor: 'rgba(231, 76, 60, 0.7)'
                        }
                    },
                    // 水平线标记平衡时正逆反应速率相等
                    equilibriumRateLine: {
                        type: 'line',
                        yMin: data.forwardRates[Math.floor(data.equilibriumTime / 0.01)],
                        yMax: data.forwardRates[Math.floor(data.equilibriumTime / 0.01)],
                        xMin: data.equilibriumTime - 1,
                        xMax: data.equilibriumTime + 1,
                        borderColor: 'rgba(39, 174, 96, 0.5)',
                        borderWidth: 1,
                        borderDash: [3, 3]
                    },
                    // 添加零线标记，当有负值时
                    zeroLine: minY < 0 ? {
                        type: 'line',
                        yMin: 0,
                        yMax: 0,
                        xMin: 0,
                        xMax: data.timePoints[data.timePoints.length - 1],
                        borderColor: 'rgba(0, 0, 0, 0.3)',
                        borderWidth: 1
                    } : undefined
                }
            };
            chart.update();
        }
        
        // 返回图表对象
        return chart;
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
        // 计算y轴的最大值，以便调整范围
        const allConcentrations = [...data.fe3Conc, ...data.scnConc, ...data.fescn3Conc];
        const maxConc = Math.max(...allConcentrations) * 1.1; // 给最大值增加10%的空间
        
        // 创建图表配置
        const chartConfig = {
            type: 'line',
            data: {
                labels: data.timePoints,
                datasets: [
                    {
                        label: 'Fe³⁺ 浓度',
                        data: data.fe3Conc,
                        borderColor: '#3498db',
                        backgroundColor: 'rgba(52, 152, 219, 0.1)',
                        borderWidth: 2,
                        pointRadius: 0,
                        fill: false
                    },
                    {
                        label: 'SCN⁻ 浓度',
                        data: data.scnConc,
                        borderColor: '#e67e22',
                        backgroundColor: 'rgba(230, 126, 34, 0.1)',
                        borderWidth: 2,
                        pointRadius: 0,
                        fill: false
                    },
                    {
                        label: 'Fe(SCN)₃ 浓度',
                        data: data.fescn3Conc,
                        borderColor: '#9b59b6',
                        backgroundColor: 'rgba(155, 89, 182, 0.1)',
                        borderWidth: 2,
                        pointRadius: 0,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: '时间 (s)'
                        },
                        ticks: {
                            callback: function(value) {
                                // 只显示整数时间点
                                return Number.isInteger(value) ? value : '';
                            },
                            autoSkip: true,
                            maxTicksLimit: 20
                        },
                        grid: {
                            color: function(context) {
                                // 在关键时间点处绘制突出的网格线
                                if (context.tick && (Math.abs(context.tick.value - data.equilibriumTime) < 0.01 || 
                                                     Math.abs(context.tick.value - data.changeTime) < 0.01)) {
                                    return 'rgba(0, 0, 0, 0.2)';
                                }
                                return 'rgba(0, 0, 0, 0.1)';
                            },
                            lineWidth: function(context) {
                                if (context.tick && (Math.abs(context.tick.value - data.equilibriumTime) < 0.01 || 
                                                     Math.abs(context.tick.value - data.changeTime) < 0.01)) {
                                    return 2;
                                }
                                return 1;
                            }
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: '浓度 (mol/L)'
                        },
                        min: 0,
                        max: maxConc,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ' + context.parsed.y.toFixed(6) + ' mol/L';
                            }
                        }
                    },
                    legend: {
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 15
                        }
                    }
                }
            }
        };
        
        // 创建图表
        const chart = new Chart(ctx, chartConfig);
        
        // 添加标记线
        if (Chart.annotationPlugin) {
            // 获取原平衡时的浓度值
            const eqIndex = Math.floor(data.equilibriumTime / 0.01);
            const fe3EqConc = data.fe3Conc[eqIndex];
            const scnEqConc = data.scnConc[eqIndex];
            const fescn3EqConc = data.fescn3Conc[eqIndex];
            
            // 获取条件改变后的浓度值
            const changeIndex = Math.floor(data.changeTime / 0.01) + 1; // +1 因为我们添加了一个额外的点
            
            chart.options.plugins.annotation = {
                annotations: {
                    // 原平衡建立线
                    equilibriumLine: {
                        type: 'line',
                        xMin: data.equilibriumTime,
                        xMax: data.equilibriumTime,
                        borderColor: 'rgba(52, 152, 219, 0.7)',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        label: {
                            content: '原平衡建立',
                            enabled: true,
                            position: 'top',
                            backgroundColor: 'rgba(52, 152, 219, 0.7)'
                        }
                    },
                    // 条件改变线
                    changeLine: {
                        type: 'line',
                        xMin: data.changeTime,
                        xMax: data.changeTime,
                        borderColor: 'rgba(231, 76, 60, 0.7)',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        label: {
                            content: '条件改变',
                            enabled: true,
                            position: 'top',
                            backgroundColor: 'rgba(231, 76, 60, 0.7)'
                        }
                    },
                    // 标记原平衡时的浓度值
                    fe3EqBox: {
                        type: 'point',
                        xValue: data.equilibriumTime,
                        yValue: fe3EqConc,
                        backgroundColor: 'rgba(52, 152, 219, 0.7)',
                        radius: 4
                    },
                    scnEqBox: {
                        type: 'point',
                        xValue: data.equilibriumTime,
                        yValue: scnEqConc,
                        backgroundColor: 'rgba(230, 126, 34, 0.7)',
                        radius: 4
                    },
                    fescn3EqBox: {
                        type: 'point',
                        xValue: data.equilibriumTime,
                        yValue: fescn3EqConc,
                        backgroundColor: 'rgba(155, 89, 182, 0.7)',
                        radius: 4
                    }
                }
            };
            chart.update();
        }
        
        // 返回图表对象
        return chart;
    }
});
