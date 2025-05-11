document.addEventListener('DOMContentLoaded', function() {
    // 定义常量
    const SIMULATION_TIME = 120; // 总模拟时间（分钟）
    const EQUILIBRIUM_TIME = 90; // 达到平衡的时间（分钟）
    const TIME_POINTS = 120; // 数据点数量
    const MOLAR_MASS = {
        H2: 2.01588, // g/mol
        I2: 253.8089, // g/mol
        HI: 127.9124 // g/mol
    };
    
    // 获取DOM元素
    const inputModeRadios = document.querySelectorAll('input[name="input-mode"]');
    const reactantsInput = document.getElementById('reactants-input');
    const productsInput = document.getElementById('products-input');
    const h2Input = document.getElementById('h2-input');
    const i2Input = document.getElementById('i2-input');
    const hiInput = document.getElementById('hi-input');
    const kInput = document.getElementById('k-input');
    const calculateBtn = document.getElementById('calculate-btn');
    
    // 平衡结果显示元素
    const h2EqElement = document.getElementById('h2-eq');
    const i2EqElement = document.getElementById('i2-eq');
    const hiEqElement = document.getElementById('hi-eq');
    
    // 图表对象
    let charts = {
        mass: null,
        mole: null,
        density: null,
        pressure: null,
        molarMass: null,
        molesTime: null,
        concentrationTime: null,
        percentageTime: null,
        i2h2Ratio: null,
        i2hiRatio: null
    };
    
    // 输入模式切换
    inputModeRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.value === 'reactants') {
                reactantsInput.style.display = 'flex';
                productsInput.style.display = 'none';
            } else {
                reactantsInput.style.display = 'none';
                productsInput.style.display = 'flex';
            }
        });
    });
    
    // 计算按钮点击事件
    calculateBtn.addEventListener('click', function() {
        const inputMode = document.querySelector('input[name="input-mode"]:checked').value;
        const K = parseFloat(kInput.value);
        
        let initialH2, initialI2, initialHI;
        
        if (inputMode === 'reactants') {
            initialH2 = parseFloat(h2Input.value);
            initialI2 = parseFloat(i2Input.value);
            initialHI = 0;
        } else {
            initialH2 = 0;
            initialI2 = 0;
            initialHI = parseFloat(hiInput.value);
        }
        
        // 计算平衡状态
        const equilibriumState = calculateEquilibrium(initialH2, initialI2, initialHI, K);
        
        // 显示平衡结果
        h2EqElement.textContent = equilibriumState.h2.toFixed(4);
        i2EqElement.textContent = equilibriumState.i2.toFixed(4);
        hiEqElement.textContent = equilibriumState.hi.toFixed(4);
        
        // 生成时间序列数据
        const timeSeriesData = generateTimeSeriesData(initialH2, initialI2, initialHI, equilibriumState);
        
        // 更新图表
        updateCharts(timeSeriesData);
    });
    
    // 计算平衡状态
    function calculateEquilibrium(initialH2, initialI2, initialHI, K) {
        if (initialH2 > 0 && initialI2 > 0) {
            // 从反应物开始
            return calculateEquilibriumFromReactants(initialH2, initialI2, K);
        } else if (initialHI > 0) {
            // 从产物开始
            return calculateEquilibriumFromProducts(initialHI, K);
        }
        
        // 默认返回
        return { h2: 0, i2: 0, hi: 0 };
    }
    
    // 从反应物计算平衡状态
    function calculateEquilibriumFromReactants(initialH2, initialI2, K) {
        // 设定反应程度为x
        // 平衡时：H2 = initialH2 - x, I2 = initialI2 - x, HI = 2x
        // 平衡常数K = [HI]^2 / ([H2] * [I2])
        
        // 使用数值方法求解x
        let x = 0;
        let xMax = Math.min(initialH2, initialI2);
        let step = xMax / 1000;
        
        for (let i = 0; i <= xMax; i += step) {
            let h2 = initialH2 - i;
            let i2 = initialI2 - i;
            let hi = 2 * i;
            
            if (h2 <= 0 || i2 <= 0) continue;
            
            let Kc = (hi * hi) / (h2 * i2);
            
            if (Math.abs(Kc - K) < 0.01 || Kc > K) {
                x = i;
                break;
            }
        }
        
        return {
            h2: initialH2 - x,
            i2: initialI2 - x,
            hi: 2 * x
        };
    }
    
    // 从产物计算平衡状态
    function calculateEquilibriumFromProducts(initialHI, K) {
        // 设定反应程度为x（逆反应）
        // 平衡时：H2 = x/2, I2 = x/2, HI = initialHI - x
        // 平衡常数K = [HI]^2 / ([H2] * [I2])
        
        // 使用数值方法求解x
        let x = 0;
        let xMax = initialHI;
        let step = xMax / 1000;
        
        for (let i = 0; i <= xMax; i += step) {
            let h2 = i / 2;
            let i2 = i / 2;
            let hi = initialHI - i;
            
            if (hi <= 0) continue;
            
            let Kc = (hi * hi) / (h2 * i2);
            
            if (Math.abs(Kc - K) < 0.01 || Kc < K) {
                x = i;
                break;
            }
        }
        
        return {
            h2: x / 2,
            i2: x / 2,
            hi: initialHI - x
        };
    }
    
    // 生成时间序列数据
    function generateTimeSeriesData(initialH2, initialI2, initialHI, equilibriumState) {
        const timePoints = Array.from({length: TIME_POINTS}, (_, i) => i * SIMULATION_TIME / (TIME_POINTS - 1));
        
        // 计算初始总质量 - 质量守恒，应该在整个反应过程中保持不变
        const initialTotalMass = initialH2 * MOLAR_MASS.H2 + initialI2 * MOLAR_MASS.I2 + initialHI * MOLAR_MASS.HI;
        
        // 容器体积设为1升
        const volume = 1; // L
        
        // 密度在恒温恒容条件下保持不变
        const density = initialTotalMass / volume;
        
        // 对于氧化氢反应，H2 + I2 = 2HI，总物质的量保持不变
        // 因为反应前后气体分子数相同（1+1=2）
        const totalMoles = initialH2 + initialI2 + initialHI;
        
        // 平均摩尔质量也应该保持不变
        const averageMolarMass = initialTotalMass / totalMoles;
        
        // 同温同压下，压强之比等于物质的量之比，当基准压强为1时，反应后压强等于反应后总物质的量
        const pressure = totalMoles;
        
        // 计算每个时间点的物质的量
        const data = timePoints.map(time => {
            let progress;
            if (time >= EQUILIBRIUM_TIME) {
                progress = 1; // 达到平衡
            } else {
                // 使用指数函数模拟反应进程
                progress = 1 - Math.exp(-5 * time / EQUILIBRIUM_TIME);
            }
            
            let h2, i2, hi;
            
            if (initialH2 > 0 && initialI2 > 0) {
                // 从反应物开始
                h2 = initialH2 - progress * (initialH2 - equilibriumState.h2);
                i2 = initialI2 - progress * (initialI2 - equilibriumState.i2);
                hi = progress * equilibriumState.hi;
            } else {
                // 从产物开始
                h2 = progress * equilibriumState.h2;
                i2 = progress * equilibriumState.i2;
                hi = initialHI - progress * (initialHI - equilibriumState.hi);
            }
            
            return {
                time,
                h2,
                i2,
                hi,
                totalMoles, // 总物质的量保持不变
                totalMass: initialTotalMass, // 质量守恒
                averageMolarMass, // 平均摩尔质量保持不变
                pressure, // 压强保持不变
                density // 密度不变
            };
        });
        
        return {
            timePoints,
            data
        };
    }
    
    // 更新所有图表
    function updateCharts(timeSeriesData) {
        const { timePoints, data } = timeSeriesData;
        
        // 准备图表数据
        const massData = data.map(d => d.totalMass);
        const moleData = data.map(d => d.totalMoles);
        const densityData = data.map(d => d.density);
        const pressureData = data.map(d => d.pressure);
        const molarMassData = data.map(d => d.averageMolarMass);
        
        // 准备新增图表数据
        const h2Data = data.map(d => d.h2);
        const i2Data = data.map(d => d.i2);
        const hiData = data.map(d => d.hi);
        
        // 计算浓度数据 (mol/L) - 容器体积固定为1L
        const h2ConcData = h2Data;
        const i2ConcData = i2Data;
        const hiConcData = hiData;
        
        // 计算百分含量数据
        const percentageData = data.map(d => {
            const total = d.h2 + d.i2 + d.hi;
            return {
                h2: (d.h2 / total) * 100,
                i2: (d.i2 / total) * 100,
                hi: (d.hi / total) * 100
            };
        });
        
        // 计算比例数据
        const i2h2RatioData = data.map(d => d.h2 > 0 ? d.i2 / d.h2 : 0);
        const i2hiRatioData = data.map(d => d.hi > 0 ? d.i2 / d.hi : 0);
        
        // 更新或创建图表
        updateChart('mass-chart', '混合气体总质量 (g)', charts.mass, timePoints, massData);
        updateChart('mole-chart', '混合气体总物质的量 (mol)', charts.mole, timePoints, moleData);
        updateChart('density-chart', '混合气体密度 (g/L)', charts.density, timePoints, densityData);
        updateChart('pressure-chart', '体系压强 (atm)', charts.pressure, timePoints, pressureData);
        updateChart('molar-mass-chart', '混合气体平均摩尔质量 (g/mol)', charts.molarMass, timePoints, molarMassData);
        
        // 更新或创建新增图表
        updateMultiLineChart('moles-time-chart', charts.molesTime, timePoints, [
            { label: 'H₂', data: h2Data, color: 'rgba(33, 150, 243, 1)' },
            { label: 'I₂', data: i2Data, color: 'rgba(156, 39, 176, 1)' },
            { label: 'HI', data: hiData, color: 'rgba(76, 175, 80, 1)' }
        ]);
        
        updateMultiLineChart('concentration-time-chart', charts.concentrationTime, timePoints, [
            { label: 'H₂', data: h2ConcData, color: 'rgba(33, 150, 243, 1)' },
            { label: 'I₂', data: i2ConcData, color: 'rgba(156, 39, 176, 1)' },
            { label: 'HI', data: hiConcData, color: 'rgba(76, 175, 80, 1)' }
        ]);
        
        updateMultiLineChart('percentage-time-chart', charts.percentageTime, timePoints, [
            { label: 'H₂', data: percentageData.map(d => d.h2), color: 'rgba(33, 150, 243, 1)' },
            { label: 'I₂', data: percentageData.map(d => d.i2), color: 'rgba(156, 39, 176, 1)' },
            { label: 'HI', data: percentageData.map(d => d.hi), color: 'rgba(76, 175, 80, 1)' }
        ]);
        
        updateChart('i2-h2-ratio-chart', 'I₂/H₂比例', charts.i2h2Ratio, timePoints, i2h2RatioData);
        updateChart('i2-hi-ratio-chart', 'I₂/HI比例', charts.i2hiRatio, timePoints, i2hiRatioData);
    }
    
    // 更新单个图表
    function updateChart(canvasId, label, chartInstance, labels, data) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        
        if (chartInstance) {
            chartInstance.data.labels = labels;
            chartInstance.data.datasets[0].data = data;
            chartInstance.update();
            return chartInstance;
        }
        
        // 创建新图表
        const newChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: label,
                    data: data,
                    backgroundColor: 'rgba(103, 58, 183, 0.2)',
                    borderColor: 'rgba(103, 58, 183, 1)',
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: '时间 (min)'
                        },
                        ticks: {
                            callback: function(value) {
                                // 只显示整数值
                                if (Number.isInteger(value)) {
                                    return value;
                                }
                                return '';
                            }
                        }
                    },
                    y: {
                        beginAtZero: false
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    annotation: {
                        annotations: {
                            line1: {
                                type: 'line',
                                xMin: EQUILIBRIUM_TIME,
                                xMax: EQUILIBRIUM_TIME,
                                borderColor: 'rgba(156, 39, 176, 0.5)',
                                borderWidth: 2,
                                borderDash: [5, 5],
                                label: {
                                    content: '平衡点',
                                    enabled: true,
                                    position: 'top'
                                }
                            }
                        }
                    }
                }
            }
        });
        
        // 存储图表实例
        switch(canvasId) {
            case 'mass-chart': charts.mass = newChart; break;
            case 'mole-chart': charts.mole = newChart; break;
            case 'density-chart': charts.density = newChart; break;
            case 'pressure-chart': charts.pressure = newChart; break;
            case 'molar-mass-chart': charts.molarMass = newChart; break;
            case 'i2-h2-ratio-chart': charts.i2h2Ratio = newChart; break;
            case 'i2-hi-ratio-chart': charts.i2hiRatio = newChart; break;
        }
        
        return newChart;
    }
    
    // 多线条图表更新函数
    function updateMultiLineChart(canvasId, chartInstance, labels, datasets) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        
        if (chartInstance) {
            chartInstance.data.labels = labels;
            datasets.forEach((dataset, index) => {
                chartInstance.data.datasets[index].data = dataset.data;
            });
            chartInstance.update();
            return chartInstance;
        }
        
        // 创建新图表
        const chartDatasets = datasets.map(dataset => ({
            label: dataset.label,
            data: dataset.data,
            backgroundColor: dataset.color.replace('1)', '0.2)'),
            borderColor: dataset.color,
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.4
        }));
        
        const newChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: chartDatasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: '时间 (min)'
                        },
                        ticks: {
                            callback: function(value) {
                                // 只显示整数值
                                if (Number.isInteger(value)) {
                                    return value;
                                }
                                return '';
                            }
                        }
                    },
                    y: {
                        beginAtZero: true
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    annotation: {
                        annotations: {
                            line1: {
                                type: 'line',
                                xMin: EQUILIBRIUM_TIME,
                                xMax: EQUILIBRIUM_TIME,
                                borderColor: 'rgba(156, 39, 176, 0.5)',
                                borderWidth: 2,
                                borderDash: [5, 5],
                                label: {
                                    content: '平衡点',
                                    enabled: true,
                                    position: 'top'
                                }
                            }
                        }
                    }
                }
            }
        });
        
        // 存储图表实例
        switch(canvasId) {
            case 'moles-time-chart': charts.molesTime = newChart; break;
            case 'concentration-time-chart': charts.concentrationTime = newChart; break;
            case 'percentage-time-chart': charts.percentageTime = newChart; break;
        }
        
        return newChart;
    }
    
    // 初始化页面时自动计算一次
    calculateBtn.click();
});
