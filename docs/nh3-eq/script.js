document.addEventListener('DOMContentLoaded', function() {
    // 定义常量
    const SIMULATION_TIME = 120; // 总模拟时间（分钟）
    const EQUILIBRIUM_TIME = 90; // 达到平衡的时间（分钟）
    const TIME_POINTS = 120; // 数据点数量
    const MOLAR_MASS = {
        N2: 28.0134, // g/mol
        H2: 2.01588, // g/mol
        NH3: 17.0305 // g/mol
    };
    
    // 获取DOM元素
    const inputModeRadios = document.querySelectorAll('input[name="input-mode"]');
    const reactantsInput = document.getElementById('reactants-input');
    const productsInput = document.getElementById('products-input');
    const n2Input = document.getElementById('n2-input');
    const h2Input = document.getElementById('h2-input');
    const nh3Input = document.getElementById('nh3-input');
    const kInput = document.getElementById('k-input');
    const calculateBtn = document.getElementById('calculate-btn');
    
    // 平衡结果显示元素
    const n2EqElement = document.getElementById('n2-eq');
    const h2EqElement = document.getElementById('h2-eq');
    const nh3EqElement = document.getElementById('nh3-eq');
    
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
        n2h2RatioTime: null,
        n2nh3RatioTime: null
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
        
        let initialN2, initialH2, initialNH3;
        
        if (inputMode === 'reactants') {
            initialN2 = parseFloat(n2Input.value);
            initialH2 = parseFloat(h2Input.value);
            initialNH3 = 0;
        } else {
            initialN2 = 0;
            initialH2 = 0;
            initialNH3 = parseFloat(nh3Input.value);
        }
        
        // 计算平衡状态
        const equilibriumState = calculateEquilibrium(initialN2, initialH2, initialNH3, K);
        
        // 显示平衡结果
        n2EqElement.textContent = equilibriumState.n2.toFixed(4);
        h2EqElement.textContent = equilibriumState.h2.toFixed(4);
        nh3EqElement.textContent = equilibriumState.nh3.toFixed(4);
        
        // 生成时间序列数据
        const timeSeriesData = generateTimeSeriesData(initialN2, initialH2, initialNH3, equilibriumState);
        
        // 更新图表
        updateCharts(timeSeriesData);
    });
    
    // 计算平衡状态
    function calculateEquilibrium(initialN2, initialH2, initialNH3, K) {
        if (initialN2 > 0 && initialH2 > 0) {
            // 从反应物开始
            return calculateEquilibriumFromReactants(initialN2, initialH2, K);
        } else if (initialNH3 > 0) {
            // 从产物开始
            return calculateEquilibriumFromProducts(initialNH3, K);
        }
        
        // 默认返回
        return { n2: 0, h2: 0, nh3: 0 };
    }
    
    // 从反应物计算平衡状态
    function calculateEquilibriumFromReactants(initialN2, initialH2, K) {
        // 设定反应程度为x
        // 平衡时：N2 = initialN2 - x, H2 = initialH2 - 3x, NH3 = 2x
        // 平衡常数K = [NH3]^2 / ([N2] * [H2]^3)
        
        // 使用数值方法求解x
        let x = 0;
        let xMax = Math.min(initialN2, initialH2 / 3);
        let step = xMax / 1000;
        
        for (let i = 0; i <= xMax; i += step) {
            let n2 = initialN2 - i;
            let h2 = initialH2 - 3 * i;
            let nh3 = 2 * i;
            
            if (n2 <= 0 || h2 <= 0) continue;
            
            let Kc = (nh3 * nh3) / (n2 * Math.pow(h2, 3));
            
            if (Math.abs(Kc - K) < 0.01 || Kc > K) {
                x = i;
                break;
            }
        }
        
        return {
            n2: initialN2 - x,
            h2: initialH2 - 3 * x,
            nh3: 2 * x
        };
    }
    
    // 从产物计算平衡状态
    function calculateEquilibriumFromProducts(initialNH3, K) {
        // 设定反应程度为x（逆反应）
        // 平衡时：N2 = x/2, H2 = 3x/2, NH3 = initialNH3 - x
        // 平衡常数K = [NH3]^2 / ([N2] * [H2]^3)
        
        // 使用数值方法求解x
        let x = 0;
        let xMax = initialNH3;
        let step = xMax / 1000;
        
        for (let i = 0; i <= xMax; i += step) {
            let n2 = i / 2;
            let h2 = 3 * i / 2;
            let nh3 = initialNH3 - i;
            
            if (nh3 <= 0) continue;
            
            let Kc = (nh3 * nh3) / (n2 * Math.pow(h2, 3));
            
            if (Math.abs(Kc - K) < 0.01 || Kc < K) {
                x = i;
                break;
            }
        }
        
        return {
            n2: x / 2,
            h2: 3 * x / 2,
            nh3: initialNH3 - x
        };
    }
    
    // 生成时间序列数据
    function generateTimeSeriesData(initialN2, initialH2, initialNH3, equilibriumState) {
        const timePoints = Array.from({length: TIME_POINTS}, (_, i) => i * SIMULATION_TIME / (TIME_POINTS - 1));
        
        // 计算初始总质量 - 质量守恒，应该在整个反应过程中保持不变
        const initialTotalMass = initialN2 * MOLAR_MASS.N2 + initialH2 * MOLAR_MASS.H2 + initialNH3 * MOLAR_MASS.NH3;
        
        // 容器体积设为1升
        const volume = 1; // L
        
        // 密度在恒温恒容条件下保持不变
        const density = initialTotalMass / volume;
        
        // 计算每个时间点的物质的量
        const data = timePoints.map(time => {
            let progress;
            if (time >= EQUILIBRIUM_TIME) {
                progress = 1; // 达到平衡
            } else {
                // 使用指数函数模拟反应进程
                progress = 1 - Math.exp(-5 * time / EQUILIBRIUM_TIME);
            }
            
            let n2, h2, nh3;
            
            if (initialN2 > 0 && initialH2 > 0) {
                // 从反应物开始
                n2 = initialN2 - progress * (initialN2 - equilibriumState.n2);
                h2 = initialH2 - progress * (initialH2 - equilibriumState.h2);
                nh3 = progress * equilibriumState.nh3;
            } else {
                // 从产物开始
                n2 = progress * equilibriumState.n2;
                h2 = progress * equilibriumState.h2;
                nh3 = initialNH3 - progress * (initialNH3 - equilibriumState.nh3);
            }
            
            // 计算各物理量
            const totalMoles = n2 + h2 + nh3;
            const averageMolarMass = initialTotalMass / totalMoles; // 使用总质量除以总物质的量
            
            // 假设初始总物质的量对应1个大气压
            const initialTotalMoles = initialN2 + initialH2 + initialNH3;
            const pressure = totalMoles / initialTotalMoles;
            
            return {
                time,
                n2,
                h2,
                nh3,
                totalMoles,
                totalMass: initialTotalMass, // 质量守恒
                averageMolarMass,
                pressure,
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
        const n2Data = data.map(d => d.n2);
        const h2Data = data.map(d => d.h2);
        const nh3Data = data.map(d => d.nh3);
        
        // 浓度数据 (mol/L) - 容器体积固定为1L
        const volume = 1; // L
        const n2ConcData = data.map(d => d.n2 / volume);
        const h2ConcData = data.map(d => d.h2 / volume);
        const nh3ConcData = data.map(d => d.nh3 / volume);
        
        // 百分含量数据 (%)
        const n2PercentData = data.map(d => (d.n2 / d.totalMoles) * 100);
        const h2PercentData = data.map(d => (d.h2 / d.totalMoles) * 100);
        const nh3PercentData = data.map(d => (d.nh3 / d.totalMoles) * 100);
        
        // 比例数据
        const n2h2RatioData = data.map(d => d.h2 > 0 ? d.n2 / d.h2 : 0);
        const n2nh3RatioData = data.map(d => d.nh3 > 0 ? d.n2 / d.nh3 : 0);
        
        // 更新或创建基本图表
        updateChart('mass-chart', '混合气体总质量 (g)', charts.mass, timePoints, massData);
        updateChart('mole-chart', '混合气体总物质的量 (mol)', charts.mole, timePoints, moleData);
        updateChart('density-chart', '混合气体密度 (g/L)', charts.density, timePoints, densityData);
        updateChart('pressure-chart', '体系压强 (atm)', charts.pressure, timePoints, pressureData);
        updateChart('molar-mass-chart', '混合气体平均摩尔质量 (g/mol)', charts.molarMass, timePoints, molarMassData);
        
        // 更新或创建新增图表 - 使用多数据集
        updateMultiDatasetChart('mole-time-chart', charts.moleTime, timePoints, [
            { label: 'N₂', data: n2Data, color: 'rgba(54, 162, 235, 1)' },
            { label: 'H₂', data: h2Data, color: 'rgba(255, 99, 132, 1)' },
            { label: 'NH₃', data: nh3Data, color: 'rgba(75, 192, 192, 1)' }
        ]);
        
        updateMultiDatasetChart('concentration-time-chart', charts.concentrationTime, timePoints, [
            { label: 'N₂', data: n2ConcData, color: 'rgba(54, 162, 235, 1)' },
            { label: 'H₂', data: h2ConcData, color: 'rgba(255, 99, 132, 1)' },
            { label: 'NH₃', data: nh3ConcData, color: 'rgba(75, 192, 192, 1)' }
        ]);
        
        updateMultiDatasetChart('percentage-time-chart', charts.percentageTime, timePoints, [
            { label: 'N₂', data: n2PercentData, color: 'rgba(54, 162, 235, 1)' },
            { label: 'H₂', data: h2PercentData, color: 'rgba(255, 99, 132, 1)' },
            { label: 'NH₃', data: nh3PercentData, color: 'rgba(75, 192, 192, 1)' }
        ]);
        
        // 分别更新两个比例图表
        updateMultiDatasetChart('n2h2-ratio-chart', charts.n2h2RatioTime, timePoints, [
            { label: 'N₂/H₂', data: n2h2RatioData, color: 'rgba(153, 102, 255, 1)' }
        ]);
        
        updateMultiDatasetChart('n2nh3-ratio-chart', charts.n2nh3RatioTime, timePoints, [
            { label: 'N₂/NH₃', data: n2nh3RatioData, color: 'rgba(255, 159, 64, 1)' }
        ]);
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
                    backgroundColor: 'rgba(46, 204, 113, 0.2)',
                    borderColor: 'rgba(46, 204, 113, 1)',
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
                                borderColor: 'rgba(255, 99, 132, 0.5)',
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
            case 'mole-time-chart': charts.moleTime = newChart; break;
            case 'concentration-time-chart': charts.concentrationTime = newChart; break;
            case 'percentage-time-chart': charts.percentageTime = newChart; break;
            case 'ratio-time-chart': charts.ratioTime = newChart; break;
        }
        
        return newChart;
    }
    
    // 更新多数据集图表
    function updateMultiDatasetChart(canvasId, chartInstance, labels, datasets) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        
        if (chartInstance) {
            chartInstance.data.labels = labels;
            datasets.forEach((dataset, index) => {
                chartInstance.data.datasets[index].data = dataset.data;
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
                                borderColor: 'rgba(255, 99, 132, 0.5)',
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
            case 'n2h2-ratio-chart': charts.n2h2RatioTime = newChart; break;
            case 'n2nh3-ratio-chart': charts.n2nh3RatioTime = newChart; break;
        }
        
        return newChart;
    }
    
    // 初始化页面时自动计算一次
    calculateBtn.click();
});
