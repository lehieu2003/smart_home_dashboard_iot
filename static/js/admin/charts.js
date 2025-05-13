// Dashboard Charts Module
window.ChartManager = (function() {
    // Chart objects
    let deviceTypeChart;
    let userActivityChart;
    let deviceStatusChart;
    let powerConsumptionChart;
    
    // Load chart data from API
    function loadChartData() {
        // Show loading state
        updateLoadingState(true);
        
        fetch('/api/admin/chart-data')
            .then(response => {
                if (!response.ok) {
                    return response.json().then(data => {
                        throw new Error(data.message || 'Failed to load chart data');
                    }).catch(() => {
                        throw new Error(`Server responded with status: ${response.status}`);
                    });
                }
                return response.json();
            })
            .then(data => {
                createDeviceTypesChart(data.device_types);
                createUserActivityChart(data.user_activity);
                createDeviceStatusChart(data.device_status);
                
                // Update dashboard stats
                updateDashboardStats();
                
                // Load power consumption data
                loadPowerConsumptionData();
            })
            .catch(error => {
                console.error('Error loading chart data:', error);
                // Create fallback charts with sample data
                createFallbackCharts();
                
                // Show error message to user
                const refreshBtn = document.getElementById('refresh-stats');
                if (refreshBtn) {
                    refreshBtn.classList.add('btn-danger');
                    setTimeout(() => refreshBtn.classList.remove('btn-danger'), 2000);
                }
                
                // Try to load power consumption anyway
                loadPowerConsumptionData();
            })
            .finally(() => {
                // Hide loading state
                updateLoadingState(false);
            });
    }
    
    // Load power consumption data
    function loadPowerConsumptionData(period = 'day') {
        const powerChartContainer = document.getElementById('powerConsumptionChartContainer');
        if (!powerChartContainer) return;
        
        // Show loading indicator
        powerChartContainer.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"></div><p class="mt-2">Loading power consumption data...</p></div>';
        
        // Build the query parameters
        const params = new URLSearchParams({
            period: period
        });
        
        fetch(`/api/power-consumption?${params}`)
            .then(response => {
                if (!response.ok) {
                    return response.json().then(data => {
                        throw new Error(data.message || 'Failed to load power consumption data');
                    }).catch(() => {
                        throw new Error(`Server responded with status: ${response.status}`);
                    });
                }
                return response.json();
            })
            .then(data => {
                // Reset container
                powerChartContainer.innerHTML = '<canvas id="powerConsumptionChart" height="300"></canvas>';
                
                // Update period selectors
                const periodSelectors = document.querySelectorAll('.power-period-selector');
                periodSelectors.forEach(selector => {
                    selector.classList.remove('active');
                    if (selector.dataset.period === period) {
                        selector.classList.add('active');
                    }
                });
                
                createPowerConsumptionChart(data);
            })
            .catch(error => {
                console.error('Error loading power consumption data:', error);
                powerChartContainer.innerHTML = `<div class="alert alert-danger">Failed to load power consumption data: ${error.message}</div>`;
                
                // Create fallback chart with sample data
                createFallbackPowerConsumptionChart();
            });
    }
    
    // Create power consumption chart
    function createPowerConsumptionChart(data) {
        const ctx = document.getElementById('powerConsumptionChart');
        if (!ctx) return;
        
        const context = ctx.getContext('2d');
        
        // Destroy existing chart if it exists
        if (powerConsumptionChart) {
            powerConsumptionChart.destroy();
        }
        
        // Extract the time series data
        const labels = data.time_series.map(item => item.date);
        
        // Create datasets for each actuator
        const datasets = [];
        const actuators = data.actuators;
        
        // Generate consistent colors for actuators
        const actuatorColors = {};
        let colorIndex = 0;
        
        for (const actuatorId in actuators) {
            const hue = (colorIndex * 137) % 360;
            actuatorColors[actuatorId] = `hsla(${hue}, 70%, 60%, 0.8)`;
            colorIndex++;
        }
        
        // Create dataset for each actuator
        for (const actuatorId in actuators) {
            const actuatorInfo = actuators[actuatorId];
            const actuatorData = data.time_series.map(item => item[`actuator_${actuatorId}`] || 0);
            
            datasets.push({
                label: `${actuatorInfo.type} (ID: ${actuatorId})`,
                data: actuatorData,
                backgroundColor: actuatorColors[actuatorId],
                borderColor: actuatorColors[actuatorId],
                fill: false
            });
        }
        
        // Create chart
        powerConsumptionChart = new Chart(context, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: data.period === 'day' ? 'Date' : (data.period === 'month' ? 'Month' : 'Year')
                        },
                        stacked: true
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Power Consumption (kWh)'
                        },
                        beginAtZero: true,
                        stacked: true
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: `Power Consumption by ${data.period.charAt(0).toUpperCase() + data.period.slice(1)}`
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                }
            }
        });
        
        // Update the period display
        document.getElementById('powerPeriodDisplay').textContent = data.period.charAt(0).toUpperCase() + data.period.slice(1);
    }
    
    // Create fallback power consumption chart
    function createFallbackPowerConsumptionChart() {
        const ctx = document.getElementById('powerConsumptionChart');
        if (!ctx) return;
        
        // Reset container if needed
        const container = document.getElementById('powerConsumptionChartContainer');
        if (container && !ctx) {
            container.innerHTML = '<canvas id="powerConsumptionChart" height="300"></canvas>';
        }
        
        const context = ctx.getContext('2d');
        
        // Destroy existing chart if it exists
        if (powerConsumptionChart) {
            powerConsumptionChart.destroy();
        }
        
        // Generate sample data
        const labels = [];
        const data1 = [];
        const data2 = [];
        const today = new Date();
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
            data1.push(Math.random() * 3 + 1);  // Between 1-4 kWh
            data2.push(Math.random() * 2 + 0.5); // Between 0.5-2.5 kWh
        }
        
        // Create chart
        powerConsumptionChart = new Chart(context, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Heating (Sample)',
                        data: data1,
                        backgroundColor: 'rgba(255, 99, 132, 0.8)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        fill: false
                    },
                    {
                        label: 'Lighting (Sample)',
                        data: data2,
                        backgroundColor: 'rgba(54, 162, 235, 0.8)',
                        borderColor: 'rgba(54, 162, 235, 1)',
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
                            text: 'Date'
                        },
                        stacked: true
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Power Consumption (kWh) - Sample Data'
                        },
                        beginAtZero: true,
                        stacked: true
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Sample Power Consumption Data'
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                }
            }
        });
        
        // Update the period display
        const periodDisplay = document.getElementById('powerPeriodDisplay');
        if (periodDisplay) periodDisplay.textContent = 'Day (Sample Data)';
    }
    
    // Update loading state
    function updateLoadingState(isLoading) {
        const refreshBtn = document.getElementById('refresh-stats');
        if (refreshBtn) {
            if (isLoading) {
                refreshBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Loading...';
                refreshBtn.disabled = true;
            } else {
                refreshBtn.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Refresh';
                refreshBtn.disabled = false;
            }
        }
    }
    
    // Update dashboard statistics
    function updateDashboardStats() {
        fetch('/api/admin/statistics')
            .then(response => response.json())
            .then(data => {
                document.getElementById('total-users').textContent = data.user_count || '0';
                document.getElementById('total-devices').textContent = data.device_count || '0';
                document.getElementById('active-users').textContent = data.active_users || '0';
                document.getElementById('user-actions').textContent = data.actions_count || '0';
            })
            .catch(error => console.error('Error loading statistics:', error));
    }
    
    // Create fallback charts with sample data when API fails
    function createFallbackCharts() {
        // Fallback device types
        createDeviceTypesChart({
            'Light': 4,
            'Thermostat': 2,
            'Camera': 1,
            'Lock': 3
        });
        
        // Fallback user activity
        const dates = [];
        const sampleData = [];
        const today = new Date();
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            dates.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
            sampleData.push(Math.floor(Math.random() * 10));
        }
        
        createUserActivityChart(
            dates.map((date, index) => ({
                date: date,
                count: sampleData[index]
            }))
        );
        
        // Fallback device status
        createDeviceStatusChart({
            'online': 6,
            'offline': 3,
            'maintenance': 1
        });
    }
    
    // Create device types pie chart
    function createDeviceTypesChart(deviceTypes) {
        const ctx = document.getElementById('deviceTypesChart');
        if (!ctx) return;
        
        const context = ctx.getContext('2d');
        
        // Destroy existing chart if it exists
        if (deviceTypeChart) {
            deviceTypeChart.destroy();
        }
        
        // Prepare data
        const labels = Object.keys(deviceTypes);
        const data = Object.values(deviceTypes);
        const backgroundColors = generateColors(labels.length);
        
        // Create chart
        deviceTypeChart = new Chart(context, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: backgroundColors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right'
                    },
                    title: {
                        display: true,
                        text: 'Device Types Distribution'
                    }
                }
            }
        });
    }
    
    // Create user activity line chart
    function createUserActivityChart(userActivity) {
        const ctx = document.getElementById('userActivityChart');
        if (!ctx) return;
        
        const context = ctx.getContext('2d');
        
        // Destroy existing chart if it exists
        if (userActivityChart) {
            userActivityChart.destroy();
        }
        
        // Prepare data
        const labels = userActivity.map(item => item.date);
        const data = userActivity.map(item => item.count);
        
        // Create chart
        userActivityChart = new Chart(context, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'User Actions',
                    data: data,
                    fill: false,
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Number of Actions'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'User Activity (Last 7 Days)'
                    }
                }
            }
        });
    }
    
    // Create device status doughnut chart
    function createDeviceStatusChart(deviceStatus) {
        const ctx = document.getElementById('deviceStatusChart');
        if (!ctx) return;
        
        const context = ctx.getContext('2d');
        
        // Destroy existing chart if it exists
        if (deviceStatusChart) {
            deviceStatusChart.destroy();
        }
        
        // Prepare data
        const labels = Object.keys(deviceStatus);
        const data = Object.values(deviceStatus);
        const backgroundColors = {
            'online': 'rgba(75, 192, 192, 0.8)',
            'offline': 'rgba(255, 99, 132, 0.8)',
            'maintenance': 'rgba(255, 206, 86, 0.8)'
        };
        
        // Create chart
        deviceStatusChart = new Chart(context, {
            type: 'doughnut',
            data: {
                labels: labels.map(l => l.charAt(0).toUpperCase() + l.slice(1)),
                datasets: [{
                    data: data,
                    backgroundColor: labels.map(label => backgroundColors[label] || 'rgba(128, 128, 128, 0.8)'),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    title: {
                        display: true,
                        text: 'Device Status Overview'
                    }
                }
            }
        });
    }
    
    // Helper function to generate random colors
    function generateColors(count) {
        const colors = [];
        for (let i = 0; i < count; i++) {
            const hue = (i * 137) % 360; // Use golden ratio to spread colors
            colors.push(`hsla(${hue}, 70%, 60%, 0.8)`);
        }
        return colors;
    }
    
    // Public API
    return {
        loadCharts: loadChartData,
        refreshCharts: loadChartData,
        loadPowerConsumptionData: loadPowerConsumptionData
    };
})();
