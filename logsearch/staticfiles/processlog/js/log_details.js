document.addEventListener('DOMContentLoaded', function() {
    const pathParts = window.location.pathname.split('/');
    const logId = pathParts[pathParts.length - 1];
    const urlParams = new URLSearchParams(window.location.search);
    const searchAction = urlParams.get('action');
    console.log(logId, searchAction);

    if (logId) {
        fetchLogDetails(logId);
        fetchLogInfo(logId);
    }

    document.getElementById('backButton').addEventListener('click', function() {
        window.history.back();
    });

    function fetchLogDetails(logId) {
        fetch(`/process-log/log-details/${logId}/`)
            .then(response => response.json())
            .then(data => displayLogDetails(data, searchAction))
            .catch(error => console.error('Error:', error));
    }

    function fetchLogInfo(logId) {
        fetch(`/process-log/get-log-info/${logId}/`)
            .then(response => response.json())
            .then(data => {
                document.getElementById('totalOperations').textContent = data.total_operations;
                document.getElementById('operationTime').textContent = data.operation_time;
            })
            .catch(error => console.error('Error:', error));
    }

    function displayLogDetails(details, searchAction) {
        const timeline = document.getElementById('timeline');
        timeline.innerHTML = '';

        details.forEach((detail, index) => {
            const isHighlighted = searchAction && detail.explanation &&
                detail.explanation.toLowerCase().includes(searchAction.toLowerCase());
            const timelineItem = document.createElement('div');
            timelineItem.className = `timeline-item ${isHighlighted ? 'highlighted' : ''}`;
            timelineItem.innerHTML = `
                <div class="timeline-content">
                    <img src="/media/${detail.capimg}" alt="Captured" class="captured-image">
                    <div class="text-content">
                        <p class="explanation ${isHighlighted ? 'highlighted-text' : ''}">${detail.explanation}</p>
                        <p class="action-time">開始時間：${detail.action_time}</p>
                    </div>
                </div>
            `;
            timeline.appendChild(timelineItem);
        });
    }
});
