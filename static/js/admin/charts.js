// Dashboard Charts Module
window.ChartManager = (function() {
    // Chart objects
    let deviceTypeChart;
    let userActivityChart;
    let deviceStatusChart;
    
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
            })
            .finally(() => {
                // Hide loading state
                updateLoadingState(false);
            });
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
        refreshCharts: loadChartData
    };
})();
