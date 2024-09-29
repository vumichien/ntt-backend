document.addEventListener('DOMContentLoaded', function() {
    let errorTypeChart, userErrorChart;
    const errorTypeChartType = document.getElementById('errorTypeChartType');
    const userSelect = document.getElementById('userSelect');
    const errorTable = document.getElementById('errorTable').getElementsByTagName('tbody')[0];
    const pagination = document.getElementById('pagination');
    let currentPage = 1;
    const recordsPerPage = 10;

    fetchErrorTypeData();
    fetchUserErrorData();
    fetchUsers();
    fetchSummarizedErrorLogs();

    errorTypeChartType.addEventListener('change', fetchErrorTypeData);
    userSelect.addEventListener('change', () => fetchUserErrorData(userSelect.value));

    function fetchErrorTypeData() {
        fetch('/error-log/error-type-statistics/')
            .then(response => response.json())
            .then(data => {
                const ctx = document.getElementById('errorTypeChart').getContext('2d');
                const chartType = errorTypeChartType.value;
                const colors = generateColors(data.length);

                const chartData = {
                    labels: data.map(item => item.error_type),
                    datasets: [{
                        label: 'エラー発生回数',
                        data: data.map(item => item.total_occurrences),
                        backgroundColor: chartType === 'bar' ? 'rgba(75, 192, 192, 0.6)' : colors,
                        borderColor: chartType === 'bar' ? 'rgba(75, 192, 192, 1)' : colors,
                        borderWidth: 1
                    }]
                };

                const chartOptions = {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: chartType === 'pie'
                        }
                    },
                    scales: chartType === 'bar' ? {
                        x: {
                            title: {
                                display: true,
                                text: 'エラー種別'
                            }
                        },
                        y: {
                            title: {
                                display: true,
                                text: '発生件数'
                            },
                            beginAtZero: true
                        }
                    } : {}
                };

                if (errorTypeChart) {
                    errorTypeChart.destroy();
                }

                errorTypeChart = new Chart(ctx, {
                    type: chartType,
                    data: chartData,
                    options: chartOptions
                });
            });
    }

    function fetchUserErrorData(selectedUser = '') {
        Promise.all([
            fetch('/error-log/all-error-types/').then(response => response.json()),
            fetch(`/error-log/user-error-statistics/${selectedUser ? selectedUser + '/' : ''}`)
                .then(response => response.json())
        ])
        .then(([allErrorTypes, userData]) => {
            const ctx = document.getElementById('userErrorChart').getContext('2d');
            const chartType = selectedUser ? 'radar' : 'bar';

            let chartData, chartOptions;

            if (selectedUser) {
                const totalErrors = userData.reduce((sum, item) => sum + item.error_count, 0);
                chartData = {
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
                chartOptions = {
                    responsive: true,
                    maintainAspectRatio: false,
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
            } else {
                chartData = {
                    labels: userData.map(item => item.user_name),
                    datasets: [{
                        label: 'エラー回数',
                        data: userData.map(item => item.error_count),
                        backgroundColor: 'rgba(75, 192, 192, 0.6)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 1
                    }]
                };
                chartOptions = {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: 'ユーザー名'
                            }
                        },
                        y: {
                            title: {
                                display: true,
                                text: 'エラー回数'
                            },
                            beginAtZero: true
                        }
                    }
                };
            }

            if (userErrorChart) {
                userErrorChart.destroy();
            }

            userErrorChart = new Chart(ctx, {
                type: chartType,
                data: chartData,
                options: chartOptions
            });
        });
    }

    function fetchUsers() {
        fetch('/error-log/users/')
            .then(response => response.json())
            .then(data => {
                data.forEach(user => {
                    const option = document.createElement('option');
                    option.value = user.user_name;
                    option.textContent = user.user_name;
                    userSelect.appendChild(option);
                });
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
});