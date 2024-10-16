document.addEventListener('DOMContentLoaded', function() {
    let errorTypeBarChart, errorTypePieChart, userErrorBarChart, userErrorRadarChart;
    const userSelect = document.getElementById('userSelect');
    const errorTable = document.getElementById('errorTable').getElementsByTagName('tbody')[0];
    const pagination = document.getElementById('pagination');
    let currentPage = 1;
    const recordsPerPage = 10;

    fetchErrorTypeData();
    fetchUserErrorData();
    fetchUsers();
    fetchSummarizedErrorLogs();
    fetchSummaryData();

    userSelect.addEventListener('change', () => fetchUserErrorRadarData(userSelect.value));

    function fetchErrorTypeData() {
        fetch('/error-log/error-type-statistics/')
            .then(response => response.json())
            .then(data => {
                createErrorTypeBarChart(data);
                createErrorTypePieChart(data);
            });
    }

    function createErrorTypeBarChart(data) {
        const ctx = document.getElementById('errorTypeBarChart').getContext('2d');
        const chartData = {
            labels: data.map(item => item.error_type),
            datasets: [{
                label: 'エラー発生回数',
                data: data.map(item => item.total_occurrences),
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgb(75, 192, 192)',
                borderWidth: 1
            }]
        };

        const chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    grid: {
                        display: false,
                        drawBorder: false,
                    },
                    ticks: {
                        padding: 5
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: '発生件数'
                    },
                    grid: {
                        display: true,
                        drawBorder: false,
                    },
                    ticks: {
                        padding: 5
                    }
                }
            },
            plugins: {
                legend: {
                    display: false,
                }
            },
            layout: {
                padding: {
                    left: 10,
                    right: 30,
                    top: 0,
                    bottom: 0
                }
            }
        };

        if (errorTypeBarChart) {
            errorTypeBarChart.destroy();
        }

        errorTypeBarChart = new Chart(ctx, {
            type: 'bar',
            data: chartData,
            options: chartOptions
        });
    }

    function createErrorTypePieChart(data) {
        data.sort((a, b) => a.error_type.localeCompare(b.error_type));

        const ctx = document.getElementById('errorTypePieChart').getContext('2d');
        const totalOccurrences = data.reduce((sum, item) => sum + item.total_occurrences, 0);
        const chartData = {
            labels: data.map(item => item.error_type),
            datasets: [{
                data: data.map(item => item.total_occurrences),
                backgroundColor: [
                    'rgba(255, 99, 132, 0.2)',
                    'rgba(255, 159, 64, 0.2)',
                    'rgba(255, 205, 86, 0.2)',
                    'rgba(75, 192, 192, 0.2)',
                    'rgba(54, 162, 235, 0.2)',
                    'rgba(153, 102, 255, 0.2)',
                    'rgba(201, 203, 207, 0.2)'
                ],
                borderColor: [
                    'rgb(255, 99, 132)',
                    'rgb(255, 159, 64)',
                    'rgb(255, 205, 86)',
                    'rgb(75, 192, 192)',
                    'rgb(54, 162, 235)',
                    'rgb(153, 102, 255)',
                    'rgb(201, 203, 207)'
                ],
                borderWidth: 1
            }]
        };

        const chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        sort: (a, b) => a.text.localeCompare(b.text)
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw;
                            const percentage = ((value / totalOccurrences) * 100).toFixed(1);
                            return `${label}: ${value}件 (${percentage}%)`;
                        }
                    }
                }
            }
        };

        if (errorTypePieChart) {
            errorTypePieChart.destroy();
        }

        errorTypePieChart = new Chart(ctx, {
            type: 'pie',
            data: chartData,
            options: chartOptions
        });
    }

    function fetchUserErrorData() {
        fetch('/error-log/user-error-statistics/')
            .then(response => response.json())
            .then(data => {
                createUserErrorBubbleChart(data);
            });
    }

    function createUserErrorBubbleChart(data) {
        const ctx = document.getElementById('userErrorBarChart').getContext('2d');

        const maxErrorCount = Math.max(...data.map(item => item.error_count));
        const maxUserCount = Math.max(...data.map(item => item.user_count));

        const xAxisMax = Math.ceil(maxErrorCount * 1.1);
        const yAxisMax = Math.ceil(maxUserCount * 1.2);

        const chartData = {
            datasets: [{
                label: 'ユーザーエラー統計',
                data: data.map(item => ({
                    x: item.error_count,
                    y: item.user_count,
                    r: Math.sqrt(item.user_count) * 2
                })),
                backgroundColor: 'rgba(255, 159, 64, 0.2)',
                borderColor: 'rgb(255, 159, 64)',
                borderWidth: 1
            }]
        };

        const chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    title: {
                        display: true,
                        text: 'エラー回数'
                    },
                    min: 0,
                    max: xAxisMax,
                    ticks: {
                        stepSize: 1,
                        precision: 0
                    },
                    grid: {
                        display: true,
                        drawBorder: true,
                    },
                },
                y: {
                    title: {
                        display: true,
                        text: 'ユーザー数'
                    },
                    min: 0,
                    max: yAxisMax,
                    ticks: {
                        stepSize: 5,
                        precision: 0
                    },
                    grid: {
                        display: true,
                        drawBorder: true,
                    },
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.parsed.y}人`;
                        }
                    }
                },
                legend: {
                    display: false
                }
            }
        };

        if (userErrorBarChart) {
            userErrorBarChart.destroy();
        }

        userErrorBarChart = new Chart(ctx, {
            type: 'bubble',
            data: chartData,
            options: chartOptions
        });
    }

    function fetchUserErrorRadarData(selectedUser) {
        if (!selectedUser) {
            if (userErrorRadarChart) {
                userErrorRadarChart.destroy();
            }
            return;
        }

        Promise.all([
            fetch('/error-log/all-error-types/').then(response => response.json()),
            fetch(`/error-log/user-error-statistics/${selectedUser}/`).then(response => response.json())
        ])
        .then(([allErrorTypes, userData]) => {
            createUserErrorRadarChart(allErrorTypes, userData);
        });
    }

    userSelect.addEventListener('change', () => fetchUserErrorRadarData(userSelect.value));

    function createUserErrorRadarChart(allErrorTypes, userData) {
        const ctx = document.getElementById('userErrorRadarChart').getContext('2d');
        const totalErrors = userData.reduce((sum, item) => sum + item.error_count, 0);
        const chartData = {
            labels: allErrorTypes,
            datasets: [{
                label: 'エラー割合 (%)',
                data: allErrorTypes.map(errorType => {
                    const error = userData.find(item => item.error_type === errorType);
                    return error ? ((error.error_count / totalErrors) * 100).toFixed(2) : 0;
                }),
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                borderColor: 'rgba(75, 192, 192, 1)',
                pointBackgroundColor: 'rgba(75, 192, 192, 1)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgba(75, 192, 192, 1)',
            }]
        };

        const chartOptions = {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 1.5,
            scales: {
                r: {
                    beginAtZero: true,
                    suggestedMax: 100,
                    ticks: {
                        stepSize: 20,
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const label = context.label || '';
                            const value = parseFloat(context.raw).toFixed(2);
                            const errorCount = userData.find(item => item.error_type === label)?.error_count || 0;
                            return `${label}: ${value}% (${errorCount}件)`;
                        }
                    }
                }
            }
        };

        if (userErrorRadarChart) {
            userErrorRadarChart.destroy();
        }

        userErrorRadarChart = new Chart(ctx, {
            type: 'radar',
            data: chartData,
            options: chartOptions
        });
    }

    function fetchUsers() {
        fetch('/error-log/users/')
            .then(response => response.json())
            .then(data => {
                const userSelect = document.getElementById('userSelect');
                userSelect.innerHTML = '<option value="">ユーザーを選択</option>';
                data.forEach(user => {
                    const option = document.createElement('option');
                    option.value = user.user_name;
                    option.textContent = user.user_name;
                    userSelect.appendChild(option);
                });

                // Chọn user đầu tiên và tải dữ liệu radar chart
                if (data.length > 0) {
                    userSelect.value = data[0].user_name;
                    fetchUserErrorRadarData(data[0].user_name);
                }
            });
    }


    function fetchSummarizedErrorLogs() {
        fetch('/error-log/summarized-error-logs/')
            .then(response => response.json())
            .then(data => {
                data.sort((a, b) => a.error_type.localeCompare(b.error_type));
                displayErrorLogs(data);
            });
    }

    function displayErrorLogs(logs) {
        const totalPages = Math.ceil(logs.length / recordsPerPage);
        const start = (currentPage - 1) * recordsPerPage;
        const end = start + recordsPerPage;
        const currentRecords = logs.slice(start, end);

        errorTable.innerHTML = '';
        currentRecords.forEach(log => {
            const row = errorTable.insertRow();
            row.insertCell(0).textContent = log.error_type;
            row.insertCell(1).textContent = `${log.total_occurrences}件`;
            row.insertCell(2).textContent = log.actions_before_error.split(',').join(' ⇒ ');
            row.insertCell(3).textContent = log.user_ids;
        });

        displayPagination(totalPages);
    }

    function displayPagination(totalPages) {
        pagination.innerHTML = '';
        for (let i = 1; i <= totalPages; i++) {
            const li = document.createElement('li');
            li.className = `page-item ${i === currentPage ? 'active' : ''}`;
            const a = document.createElement('a');
            a.className = 'page-link';
            a.href = '#';
            a.textContent = i;
            a.addEventListener('click', (e) => {
                e.preventDefault();
                currentPage = i;
                fetchSummarizedErrorLogs();
            });
            li.appendChild(a);
            pagination.appendChild(li);
        }
    }

    function generateColors(count) {
        const colors = [];
        for (let i = 0; i < count; i++) {
            colors.push(`hsl(${(i * 360) / count}, 70%, 70%)`);
        }
        return colors;
    }

    function fetchSummaryData() {
        fetch('/error-log/summary-data/')
            .then(response => response.json())
            .then(data => {
                document.getElementById('totalErrors').textContent = data.total_errors.toLocaleString();
                document.getElementById('totalUsersWithErrors').textContent = data.total_users_with_errors.toLocaleString();
                document.getElementById('averageErrorsPerUser').textContent = data.average_errors_per_user.toFixed(2);
            });
    }
});
