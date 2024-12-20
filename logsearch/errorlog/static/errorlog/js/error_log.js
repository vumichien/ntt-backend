document.addEventListener('DOMContentLoaded', function() {
    let errorTypeBarChart, errorTypePieChart, userErrorBarChart, userErrorRadarChart;
    const userSelect = document.getElementById('userSelect');
    const filterErrorTypeInput = document.getElementById('filterErrorType');
    const filterProcedureInput = document.getElementById('filterProcedure');
    const filterButton = document.getElementById('filterButton');
    const errorTable = document.getElementById('errorTable');
    const errorTableBody  = document.getElementById('errorTable').getElementsByTagName('tbody')[0];
    const pagination = document.getElementById('pagination');
    let currentPage = 1;
    const recordsPerPage = 10;

    let errorActionBarChart;
    const errorTypeButtons = document.getElementById('errorTypeButtons');
    const errorActionChartContainer = document.getElementById('errorActionChartContainer');

    fetchErrorTypeData();
    fetchUserErrorData();
    fetchUsers();
    fetchSummaryData();
    fetchErrorActionData();
     // Hiển thị dữ liệu mặc định khi load trang
    fetchSummarizedErrorLogs();

    userSelect.addEventListener('change', () => fetchUserErrorRadarData(userSelect.value));

    // Thêm sự kiện cho nút filter
    filterButton.addEventListener('click', () => {
        const errorType = filterErrorTypeInput.value.trim();
        const procedure = filterProcedureInput.value.trim();
        currentPage = 1; // Reset trang về 1 khi filter
        fetchFilteredErrorLogs(errorType, procedure);
    });

    // Thêm sự kiện khi ấn Enter trong ô nhập để kích hoạt lọc
    [filterErrorTypeInput, filterProcedureInput].forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const errorType = filterErrorTypeInput.value.trim();
                const procedure = filterProcedureInput.value.trim();
                currentPage = 1; // Reset trang về 1 khi filter
                fetchFilteredErrorLogs(errorType, procedure);
            }
        });
    });

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
                            return `${context.parsed.y}人-${context.parsed.x}数`;
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

                if (data.length > 0) {
                    userSelect.value = data[0].user_name;
                    fetchUserErrorRadarData(data[0].user_name);
                }
            });
    }

    // Add at the top with other global variables
    let errorLogsData = {
        allLogs: [],          // Store all logs with their operation IDs
        operationMap: new Map() // Map to store error_type -> operation IDs mapping
    };

    // Function to initialize operation IDs for all logs
    function initializeErrorLogsData(logs) {
        errorLogsData.allLogs = logs.map((log, index) => ({
            ...log,
            operationId: `OP${String(index + 1).padStart(3, '0')}`
        }));

        // Create mapping of error_type to operation IDs
        errorLogsData.operationMap.clear();
        errorLogsData.allLogs.forEach(log => {
            if (!errorLogsData.operationMap.has(log.error_type)) {
                errorLogsData.operationMap.set(log.error_type, []);
            }
            errorLogsData.operationMap.get(log.error_type).push({
                operationId: log.operationId,
                actions: log.actions_before_error
            });
        });
    }

    // Modify fetchSummarizedErrorLogs
    function fetchSummarizedErrorLogs() {
        fetch('/error-log/summarized-error-logs/')
            .then(response => response.json())
            .then(data => {
                // Initialize the shared data structure first
                initializeErrorLogsData(data);

                if (data.length > 0) {
                    errorTable.style.display = 'table';
                } else {
                    errorTable.style.display = 'none';
                }
                displayErrorLogs(data);
            });
    }

    // Modify fetchFilteredErrorLogs
    function fetchFilteredErrorLogs(errorType, procedure) {
        fetch(`/error-log/summarized-error-logs/?error_type=${encodeURIComponent(errorType)}&procedure=${encodeURIComponent(procedure)}`)
            .then(response => response.json())
            .then(data => {
                if (data.length > 0) {
                    errorTable.style.display = 'table';
                } else {
                    errorTable.style.display = 'none';
                }
                // Use the filtered data for display but keep original operation IDs
                displayErrorLogs(data);
            });
    }

    // Modify displayErrorLogs to use the shared operation IDs
    function displayErrorLogs(logs) {
        const totalPages = Math.ceil(logs.length / recordsPerPage);
        const start = (currentPage - 1) * recordsPerPage;
        const end = start + recordsPerPage;
        const currentRecords = logs.slice(start, end);

        errorTableBody.innerHTML = '';
        currentRecords.forEach((log) => {
            const row = errorTableBody.insertRow();
            row.className = 'error-row';

            // Find the original log with operation ID
            const originalLog = errorLogsData.allLogs.find(
                l => l.error_type === log.error_type &&
                l.actions_before_error === log.actions_before_error
            );
            const operationId = originalLog ? originalLog.operationId : 'N/A';

            row.setAttribute('data-error-type', log.error_type);
            row.setAttribute('data-actions-before', log.actions_before_error);
            row.setAttribute('data-operation-id', operationId);

            row.insertCell(0).textContent = log.error_type;
            row.insertCell(1).textContent = `${log.total_occurrences}件`;
            row.insertCell(2).textContent = operationId;

            const actionsCell = row.insertCell(3);
            actionsCell.textContent = log.actions_before_error.split(',').join(' ⇒ ');

            const users = log.user_ids.split(', ');
            let displayedUsers = users.slice(0, 2).join(', ');
            if (users.length > 2) {
                displayedUsers += ', ...';
            }
            const userCell = row.insertCell(4);
            userCell.textContent = displayedUsers;
            if (users.length > 2) {
                userCell.title = users.join(', ');
            }

            row.addEventListener('click', function() {
                const errorType = this.getAttribute('data-error-type');
                const actionsBefore = this.getAttribute('data-actions-before');
                showErrorDetail(errorType, actionsBefore);
            });

            row.addEventListener('mouseenter', function() {
                this.classList.add('error-row-hover');
            });
            row.addEventListener('mouseleave', function() {
                this.classList.remove('error-row-hover');
            });
        });

        displayPagination(totalPages);
    }

    function showErrorDetail(errorType, actionsBefore) {
        const actionsBeforeDB = actionsBefore.split(' ⇒ ').join(',');
        const encodedActionsBefore = encodeURIComponent(actionsBeforeDB);
        fetch(`/error-log/error-detail/${errorType}/?actions_before_error=${encodedActionsBefore}`)
            .then(response => response.json())
            .then(data => {
                console.log("data from server", data);
                const errorStepsTimeline = document.getElementById('errorStepsTimeline');
                const recoveryStepsTimeline = document.getElementById('recoveryStepsTimeline');
                errorStepsTimeline.innerHTML = '';
                recoveryStepsTimeline.innerHTML = '';

                const inputSummary = document.getElementById('inputSummary');
                const recoveryInputSummary = document.getElementById('recoveryInputSummary');
                inputSummary.innerHTML = '';
                recoveryInputSummary.innerHTML = '';

                const errorInputData = [];
                const recoveryInputData = [];

                // Error steps
                data.error_steps.forEach((step, index) => {
                    const timelineItem = createTimelineItem(step, index + 1);
                    errorStepsTimeline.appendChild(timelineItem);
                    extractInputData(step, index + 1, errorInputData);
                });

                // Error card for error steps
                const errorCard = createErrorCard(errorType);
                errorStepsTimeline.appendChild(errorCard);

                // Error card for recovery steps (new)
                const recoveryErrorCard = createErrorCard(errorType);
                recoveryErrorCard.classList.add('recovery-error-card');
                recoveryStepsTimeline.appendChild(recoveryErrorCard);

                // Recovery steps
                data.recovery_steps.forEach((step, index) => {
                    const timelineItem = createTimelineItem(step, index + 1, true);
                    recoveryStepsTimeline.appendChild(timelineItem);
                    extractInputData(step, index + 1, recoveryInputData);
                });

                // Success card
                const successCard = createSuccessCard();
                recoveryStepsTimeline.appendChild(successCard);

                // Display input summaries
                displayInputSummary(inputSummary, errorInputData);
                displayInputSummary(recoveryInputSummary, recoveryInputData);

                const modal = new bootstrap.Modal(document.getElementById('errorDetailModal'));
                modal.show();
            })
            .catch(error => console.error('Error:', error));
    }

    function createTimelineItem(step, index, isRecovery = false) {
        const timelineItem = document.createElement('div');
        timelineItem.className = `timeline-item ${isRecovery ? 'recovery-step' : ''}`;
        timelineItem.innerHTML = `
            <div class="timeline-content">
                <div class="step-number">操作 ${index}</div>
                <img src="/media/${step.capimg}" alt="Captured" class="captured-image">
                <div class="text-content">
                    <p class="explanation">${step.explanation}</p>
                </div>
            </div>
        `;
        return timelineItem;
    }

    function createErrorCard(errorType) {
        const errorCard = document.createElement('div');
        errorCard.className = "timeline-item error-card";
        errorCard.innerHTML = `
            <div class="timeline-content">
                <p class="error-type">${errorType}</p>
            </div>
        `;
        return errorCard;
    }

    function createSuccessCard() {
        const successCard = document.createElement('div');
        successCard.className = "timeline-item success-card";
        successCard.innerHTML = `
            <div class="timeline-content">
                <p class="success-type">Success</p>
            </div>
        `;
        return successCard;
    }

    function extractInputData(step, index, inputData) {
        const match = step.explanation.match(/「(.+?)」を入力する/);
        if (match) {
            inputData.push(`操作 ${index}：${match[1]}`);
        }
    }

    function displayInputSummary(summaryElement, inputData) {
        if (inputData.length > 0) {
            summaryElement.innerHTML = inputData.map(item => {
                const [operation, value] = item.split('：');
                return `${operation}：${value.replace(/^.+?」へ「/, '')}`;
            }).join('<br>');
        } else {
            summaryElement.innerHTML = '入力データなし';
        }
    }

    document.addEventListener('DOMContentLoaded', function() {
        const closeButton = document.querySelector('#errorDetailModal .btn-close');
        if (closeButton) {
            closeButton.addEventListener('click', function() {
                const modal = bootstrap.Modal.getInstance(document.getElementById('errorDetailModal'));
                if (modal) {
                    modal.hide();
                }
            });
        }
    });

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
                const errorType = filterErrorTypeInput.value.trim();
                const procedure = filterProcedureInput.value.trim();
                fetchFilteredErrorLogs(errorType, procedure);

            });
            li.appendChild(a);
            pagination.appendChild(li);
        }
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

    function fetchErrorActionData() {
        fetch('/error-log/error-action-statistics/')
            .then(response => response.json())
            .then(data => {
                // Sort data alphabetically by error_type
                data.sort((a, b) => a.error_type.localeCompare(b.error_type));

                createErrorTypeButtons(data);

                // Create initial chart with first error type's data
                if (data.length > 0) {
                    const firstErrorType = data[0].error_type;
                    const matchingOperations = errorLogsData.operationMap.get(firstErrorType) || [];

                    // Map the actions data with operation IDs
                    const chartData = data[0].actions.map((action, index) => ({
                        operationId: matchingOperations[index]?.operationId || `OP${String(index + 1).padStart(3, '0')}`,
                        occurrence_count: action.occurrence_count
                    }));

                    createErrorActionBarChart(firstErrorType, chartData);

                    // Set the first button as active
                    const firstButton = errorTypeButtons.querySelector('button:not(.scroll-button):not(.ellipsis-button)');
                    if (firstButton) {
                        firstButton.classList.add('active');
                    }
                }
            })
            .catch(error => console.error('Error fetching error action data:', error));
    }

    function createErrorTypeButtons(data) {
        errorTypeButtons.innerHTML = '';

        // Sort data by error_type alphabetically
        data.sort((a, b) => a.error_type.localeCompare(b.error_type));

        const prevAllButton = document.createElement('button');
        prevAllButton.className = 'btn btn-outline-dark mr-2 scroll-button';
        prevAllButton.textContent = '<<';
        prevAllButton.addEventListener('click', () => scrollButtons('leftAll'));
        errorTypeButtons.appendChild(prevAllButton);

        const prevButton = document.createElement('button');
        prevButton.className = 'btn btn-outline-dark mr-2 scroll-button';
        prevButton.textContent = '<';
        prevButton.addEventListener('click', () => scrollButtons('left'));
        errorTypeButtons.appendChild(prevButton);

        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'button-container';
        buttonContainer.style.display = 'flex';
        buttonContainer.style.overflowX = 'hidden';
        errorTypeButtons.appendChild(buttonContainer);

        // Add left ellipsis button
        const leftEllipsis = document.createElement('button');
        leftEllipsis.className = 'btn btn-outline-secondary mr-2 ellipsis-button';
        leftEllipsis.textContent = '...';
        leftEllipsis.style.display = 'none';
        buttonContainer.appendChild(leftEllipsis);

        data.forEach((item, index) => {
            const button = document.createElement('button');
            button.className = 'btn btn-outline-primary mr-2 mb-2';
            button.textContent = item.error_type;
            button.addEventListener('click', () => {
                // Remove active class from all buttons
                buttonContainer.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');

                // Get matching operations for this error type
                const matchingOperations = errorLogsData.operationMap.get(item.error_type) || [];

                // Map the actions data with operation IDs
                const chartData = item.actions.map((action, index) => ({
                    operationId: matchingOperations[index]?.operationId || `OP${String(index + 1).padStart(3, '0')}`,
                    occurrence_count: action.occurrence_count
                }));

                createErrorActionBarChart(item.error_type, chartData);
            });
            buttonContainer.appendChild(button);
        });

        // Add right ellipsis button
        const rightEllipsis = document.createElement('button');
        rightEllipsis.className = 'btn btn-outline-secondary mr-2 ellipsis-button';
        rightEllipsis.textContent = '...';
        rightEllipsis.style.display = 'none';
        buttonContainer.appendChild(rightEllipsis);

        const nextButton = document.createElement('button');
        nextButton.className = 'btn btn-outline-dark scroll-button';
        nextButton.textContent = '>';
        nextButton.addEventListener('click', () => scrollButtons('right'));
        errorTypeButtons.appendChild(nextButton);

        const nextAllButton = document.createElement('button');
        nextAllButton.className = 'btn btn-outline-dark ml-2 scroll-button';
        nextAllButton.textContent = '>>';
        nextAllButton.addEventListener('click', () => scrollButtons('rightAll'));
        errorTypeButtons.appendChild(nextAllButton);

        // Show only the first 4 buttons initially
        const buttons = buttonContainer.querySelectorAll('button:not(.ellipsis-button)');
        buttons.forEach((button, index) => {
            if (index < 4) {
                button.style.display = 'inline-block';
            } else {
                button.style.display = 'none';
            }
        });

        // Update scroll button visibility
        updateScrollButtonVisibility();
    }

    function scrollButtons(direction) {
        const buttonContainer = errorTypeButtons.querySelector('.button-container');
        const buttons = buttonContainer.querySelectorAll('button:not(.ellipsis-button)');
        const visibleButtons = Array.from(buttons).filter(button => button.style.display !== 'none');
        const firstVisibleIndex = Array.from(buttons).indexOf(visibleButtons[0]);

        let newFirstVisibleIndex;
        switch(direction) {
            case 'left':
                newFirstVisibleIndex = Math.max(0, firstVisibleIndex - 1);
                break;
            case 'right':
                newFirstVisibleIndex = Math.min(buttons.length - 4, firstVisibleIndex + 1);
                break;
            case 'leftAll':
                newFirstVisibleIndex = 0;
                break;
            case 'rightAll':
                newFirstVisibleIndex = buttons.length - 4;
                break;
        }

        buttons.forEach((button, index) => {
            if (index >= newFirstVisibleIndex && index < newFirstVisibleIndex + 4) {
                button.style.display = 'inline-block';
            } else {
                button.style.display = 'none';
            }
        });

        updateScrollButtonVisibility();
    }

    function updateScrollButtonVisibility() {
        const buttonContainer = errorTypeButtons.querySelector('.button-container');
        const buttons = buttonContainer.querySelectorAll('button:not(.ellipsis-button)');
        const visibleButtons = Array.from(buttons).filter(button => button.style.display !== 'none');
        const firstVisibleIndex = Array.from(buttons).indexOf(visibleButtons[0]);

        const prevAllButton = errorTypeButtons.querySelector('.scroll-button:nth-child(1)');
        const prevButton = errorTypeButtons.querySelector('.scroll-button:nth-child(2)');
        const nextButton = errorTypeButtons.querySelector('.scroll-button:nth-last-child(2)');
        const nextAllButton = errorTypeButtons.querySelector('.scroll-button:last-child');
        const leftEllipsis = buttonContainer.querySelector('.ellipsis-button:first-child');
        const rightEllipsis = buttonContainer.querySelector('.ellipsis-button:last-child');

        prevAllButton.disabled = prevButton.disabled = firstVisibleIndex === 0;
        nextAllButton.disabled = nextButton.disabled = firstVisibleIndex >= buttons.length - 4;

        leftEllipsis.style.display = firstVisibleIndex > 0 ? 'inline-block' : 'none';
        rightEllipsis.style.display = firstVisibleIndex < buttons.length - 4 ? 'inline-block' : 'none';

        [prevAllButton, prevButton, nextButton, nextAllButton].forEach(button => {
            button.classList.toggle('disabled', button.disabled);
            if (button.disabled) {
                button.style.backgroundColor = '#6c757d';
                button.style.borderColor = '#6c757d';
                button.style.color = '#ffffff';
            } else {
                button.style.backgroundColor = '';
                button.style.borderColor = '';
                button.style.color = '';
            }
        });
    }

    // Modify createErrorActionBarChart to use the shared operation IDs
    function createErrorActionBarChart(errorType, chartData) {
        const ctx = errorActionChartContainer.getContext('2d');

        const chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: '発生件数'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'エラー発生前の操作 ID'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: `${errorType}のエラーアクション`
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `発生件数: ${context.parsed.y}`;
                        }
                    }
                }
            }
        };

        const chartDataConfig = {
            labels: chartData.map(item => item.operationId),
            datasets: [{
                label: '発生件数',
                data: chartData.map(item => item.occurrence_count),
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgb(75, 192, 192)',
                borderWidth: 1
            }]
        };

        if (errorActionBarChart) {
            errorActionBarChart.destroy();
        }

        errorActionBarChart = new Chart(ctx, {
            type: 'bar',
            data: chartDataConfig,
            options: chartOptions
        });
    }

    // Make sure to call fetchSummarizedErrorLogs before fetchErrorActionData
    document.addEventListener('DOMContentLoaded', function() {
        // ... other initialization code ...

        // First fetch the summarized logs to initialize the operation IDs
        fetchSummarizedErrorLogs().then(() => {
            // Then fetch and display the error action data
            fetchErrorActionData();
        });

        // ... rest of initialization code ...
    });
});
