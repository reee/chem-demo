document.addEventListener('DOMContentLoaded', function() {
    // 定义常量
    const SIMULATION_TIME = 120; // 总模拟时间（分钟）
    const EQUILIBRIUM_TIME = 90; // 达到平衡的时间（分钟）
    const TIME_POINTS = 120; // 数据点数量
    const MOLAR_MASS = {
        C: 12.0107, // g/mol
        CO2: 44.0095, // g/mol
        CO: 28.0101 // g/mol
    };
    
    // 获取DOM元素
    const inputModeRadios = document.querySelectorAll('input[name="input-mode"]');
    const reactantsInput = document.getElementById('reactants-input');
    const productsInput = document.getElementById('products-input');
    const cInput = document.getElementById('c-input');
    const co2Input = document.getElementById('co2-input');
    const coInput = document.getElementById('co-input');
    const kInput = document.getElementById('k-input');
    const calculateBtn = document.getElementById('calculate-btn');
    
    // 平衡结果显示元素
    const cEqElement = document.getElementById('c-eq');
    const co2EqElement = document.getElementById('co2-eq');
    const coEqElement = document.getElementById('co-eq');
    
    // 图表对象
    let charts = {
        mass: null,
        mole: null,
        density: null,
        pressure: null,
        molarMass: null,
        moleTime: null,
        concentrationTime: null,
        percentageTime: null,
        coCo2RatioTime: null
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
        
        let initialC, initialCO2, initialCO;
        
        if (inputMode === 'reactants') {
            initialC = parseFloat(cInput.value);
            initialCO2 = parseFloat(co2Input.value);
            initialCO = 0;
        } else {
            initialC = 0;
            initialCO2 = 0;
            initialCO = parseFloat(coInput.value);
        }
        
        // 计算平衡状态
        const equilibriumState = calculateEquilibrium(initialC, initialCO2, initialCO, K);
        
        // 显示平衡结果
        cEqElement.textContent = equilibriumState.c.toFixed(4);
        co2EqElement.textContent = equilibriumState.co2.toFixed(4);
        coEqElement.textContent = equilibriumState.co.toFixed(4);
        
        // 生成时间序列数据
        const timeSeriesData = generateTimeSeriesData(initialC, initialCO2, initialCO, equilibriumState);
        
        // 更新图表
        updateCharts(timeSeriesData);
    });
    
    // 计算平衡状态
    function calculateEquilibrium(initialC, initialCO2, initialCO, K) {
        if (initialC > 0 && initialCO2 > 0) {
            // 从反应物开始
            return calculateEquilibriumFromReactants(initialC, initialCO2, K);
        } else if (initialCO > 0) {
            // 从产物开始
            return calculateEquilibriumFromProducts(initialCO, K);
        }
        
        // 默认返回
        return { c: 0, co2: 0, co: 0 };
    }
    
    // 从反应物计算平衡状态
    function calculateEquilibriumFromReactants(initialC, initialCO2, K) {
        // 设定反应程度为x
        // 平衡时：C = initialC - x, CO2 = initialCO2 - x, CO = 2x
        // 平衡常数K = [CO]^2 / ([CO2])
        // 注意：固体C不参与平衡常数计算
        
        // 使用数值方法求解x
        let x = 0;
        let xMax = Math.min(initialC, initialCO2);
        let step = xMax / 1000;
        
        for (let i = 0; i <= xMax; i += step) {
            let c = initialC - i;
            let co2 = initialCO2 - i;
            let co = 2 * i;
            
            if (co2 <= 0) continue;
            
            // 固体C不参与平衡常数计算
            let Kc = (co * co) / co2;
            
            if (Math.abs(Kc - K) < 0.01 || Kc > K) {
                x = i;
                break;
            }
        }
        
        return {
            c: initialC - x,
            co2: initialCO2 - x,
            co: 2 * x
        };
    }
    
    // 从产物计算平衡状态
    function calculateEquilibriumFromProducts(initialCO, K) {
        // 设定反应程度为x（逆反应）
        // 平衡时：C = x/2, CO2 = x/2, CO = initialCO - x
        // 平衡常数K = [CO]^2 / ([CO2])
        // 注意：固体C不参与平衡常数计算
        
        // 使用数值方法求解x
        let x = 0;
        let xMax = initialCO;
        let step = xMax / 1000;
        
        for (let i = 0; i <= xMax; i += step) {
            let c = i / 2;
            let co2 = i / 2;
            let co = initialCO - i;
            
            if (co <= 0 || co2 <= 0) continue;
            
            // 固体C不参与平衡常数计算
            let Kc = (co * co) / co2;
            
            if (Math.abs(Kc - K) < 0.01 || Kc < K) {
                x = i;
                break;
            }
        }
        
        return {
            c: x / 2,
            co2: x / 2,
            co: initialCO - x
        };
    }
    
    // 生成时间序列数据
    function generateTimeSeriesData(initialC, initialCO2, initialCO, equilibriumState) {
        const timePoints = Array.from({length: TIME_POINTS}, (_, i) => i * SIMULATION_TIME / (TIME_POINTS - 1));
        
        // 计算气体的初始总质量 - 固体C不计入气体总质量
        const initialGasMass = initialCO2 * MOLAR_MASS.CO2 + initialCO * MOLAR_MASS.CO;
        
        // 计算平衡状态下的气体总质量 - 应该与初始气体总质量相同（质量守恒）
        const equilibriumGasMass = equilibriumState.co2 * MOLAR_MASS.CO2 + equilibriumState.co * MOLAR_MASS.CO;
        
        // 容器体积设为1升
        const volume = 1; // L
        
        // 计算每个时间点的物质的量
        const data = timePoints.map(time => {
            let progress;
            if (time >= EQUILIBRIUM_TIME) {
                progress = 1; // 达到平衡
            } else {
                // 使用指数函数模拟反应进程
                progress = 1 - Math.exp(-5 * time / EQUILIBRIUM_TIME);
            }
            
            let c, co2, co;
            
            if (initialC > 0 && initialCO2 > 0) {
                // 从反应物开始
                c = initialC - progress * (initialC - equilibriumState.c);
                co2 = initialCO2 - progress * (initialCO2 - equilibriumState.co2);
                co = progress * equilibriumState.co;
            } else {
                // 从产物开始
                c = progress * equilibriumState.c;
                co2 = progress * equilibriumState.co2;
                co = initialCO - progress * (initialCO - equilibriumState.co);
            }
            
            // 计算气体物质的量（不包括固体C）
            const gasMoles = co2 + co;
            
            // 计算气体总质量（不包括固体C）
            const gasMass = co2 * MOLAR_MASS.CO2 + co * MOLAR_MASS.CO;
            
            // 计算气体平均摩尔质量
            const gasAverageMolarMass = gasMass / gasMoles;
            
            // 计算气体密度
            const gasDensity = gasMass / volume;
            
            // 计算压强（与气体总物质的量成正比）
            // 假设初始状态下气体总物质的量对应1个大气压
            const initialGasMoles = initialCO2 + initialCO;
            let pressure;
            if (initialGasMoles > 0) {
                pressure = gasMoles / initialGasMoles;
            } else {
                // 如果初始没有气体，则以平衡状态的气体量为基准
                pressure = 1.0;
            }
            
            return {
                time,
                c,
                co2,
                co,
                gasMoles,
                gasMass,
                gasAverageMolarMass,
                gasDensity,
                pressure
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
        const massData = data.map(d => d.gasMass);
        const moleData = data.map(d => d.gasMoles);
        const densityData = data.map(d => d.gasDensity);
        const pressureData = data.map(d => d.pressure);
        const molarMassData = data.map(d => d.gasAverageMolarMass);
        
        // 准备物质的量随时间变化数据
        const cData = data.map(d => d.c);
        const co2Data = data.map(d => d.co2);
        const coData = data.map(d => d.co);
        
        // 准备浓度数据（假设体积为1L）
        const co2ConcentrationData = data.map(d => d.co2);
        const coConcentrationData = data.map(d => d.co);
        
        // 准备百分含量数据
        const percentageData = data.map(d => {
            const total = d.co2 + d.co;
            return {
                co2: total > 0 ? (d.co2 / total) * 100 : 0,
                co: total > 0 ? (d.co / total) * 100 : 0
            };
        });
        
        // 准备CO/CO2比例数据
        const ratioData = data.map(d => d.co2 > 0 ? d.co / d.co2 : 0);
        
        // 更新或创建图表
        updateChart('mass-chart', '混合气体总质量 (g)', charts.mass, timePoints, massData);
        updateChart('mole-chart', '混合气体总物质的量 (mol)', charts.mole, timePoints, moleData);
        updateChart('density-chart', '混合气体密度 (g/L)', charts.density, timePoints, densityData);
        updateChart('pressure-chart', '体系压强 (atm)', charts.pressure, timePoints, pressureData);
        updateChart('molar-mass-chart', '混合气体平均摩尔质量 (g/mol)', charts.molarMass, timePoints, molarMassData);
        
        // 更新新增的四个图表
        updateMultiDatasetChart('mole-time-chart', charts.moleTime, timePoints, [
            { label: 'C', data: cData, color: 'rgba(52, 152, 219, 1)' },
            { label: 'CO₂', data: co2Data, color: 'rgba(231, 76, 60, 1)' },
            { label: 'CO', data: coData, color: 'rgba(46, 204, 113, 1)' }
        ]);
        
        updateMultiDatasetChart('concentration-time-chart', charts.concentrationTime, timePoints, [
            { label: 'CO₂', data: co2ConcentrationData, color: 'rgba(231, 76, 60, 1)' },
            { label: 'CO', data: coConcentrationData, color: 'rgba(46, 204, 113, 1)' }
        ]);
        
        updateMultiDatasetChart('percentage-time-chart', charts.percentageTime, timePoints, [
            { label: 'CO₂', data: percentageData.map(d => d.co2), color: 'rgba(231, 76, 60, 1)' },
            { label: 'CO', data: percentageData.map(d => d.co), color: 'rgba(46, 204, 113, 1)' }
        ]);
        
        updateChart('co-co2-ratio-chart', 'CO/CO₂ 比例', charts.coCo2RatioTime, timePoints, ratioData);
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
                    backgroundColor: 'rgba(231, 76, 60, 0.2)',
                    borderColor: 'rgba(231, 76, 60, 1)',
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
                                borderColor: 'rgba(192, 57, 43, 0.5)',
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
            case 'co-co2-ratio-chart': charts.coCo2RatioTime = newChart; break;
        }
        
        return newChart;
    }
    
    // 更新多数据集图表
    function updateMultiDatasetChart(canvasId, chartInstance, labels, datasets) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        
        if (chartInstance) {
            chartInstance.data.labels = labels;
            
            // 更新每个数据集
            datasets.forEach((dataset, index) => {
                if (index < chartInstance.data.datasets.length) {
                    chartInstance.data.datasets[index].data = dataset.data;
                }
            });
            
            chartInstance.update();
            return chartInstance;
        }
        
        // 创建数据集配置
        const chartDatasets = datasets.map(dataset => ({
            label: dataset.label,
            data: dataset.data,
            backgroundColor: dataset.color.replace('1)', '0.2)'),
            borderColor: dataset.color,
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.4
        }));
        
        // 创建新图表
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
                                borderColor: 'rgba(192, 57, 43, 0.5)',
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
            case 'mole-time-chart': charts.moleTime = newChart; break;
            case 'concentration-time-chart': charts.concentrationTime = newChart; break;
            case 'percentage-time-chart': charts.percentageTime = newChart; break;
        }
        
        return newChart;
    }
    
    // 初始化页面时自动计算一次
    calculateBtn.click();
});
