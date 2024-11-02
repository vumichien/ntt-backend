document.addEventListener('DOMContentLoaded', function() {
    const pathParts = window.location.pathname.split('/');
    const logId = pathParts[pathParts.length - 1];

    // Lấy câu trả lời từ localStorage
    const answers = JSON.parse(localStorage.getItem('procedureAnswers') || '{}');

    if (logId && answers) {
        generateProcedure(logId, answers);  // Gọi API để lấy các bước từ template với câu trả lời
        fetchLogInfo(logId);
    }

    document.getElementById('backButton').addEventListener('click', function() {
        window.history.back();
    });

    // Hàm để gọi API và truyền câu trả lời
    function generateProcedure(logId, answers) {
        fetch(`/process-log/generate-procedure/${logId}/`, {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": getCookie("csrftoken"),
            },
            body: JSON.stringify({ answers: answers })
        })
        .then(response => response.json())
        .then(data => displayProcedure(data))
        .catch(error => console.error('Error:', error));
    }

    // Hiển thị các bước trong timeline
    function displayProcedure(steps) {
        const timeline = document.getElementById('timeline');
        timeline.innerHTML = '';

        steps.forEach((step, index) => {
            const timelineItem = document.createElement('div');
            timelineItem.className = "timeline-item";
            timelineItem.innerHTML = `
                <div class="timeline-content">
                    <img src="/media/${step.capimg}" alt="Captured" class="captured-image">
                    <div class="text-content">
                        <p class="explanation">${step.description}</p>
                    </div>
                </div>
            `;
            timeline.appendChild(timelineItem);

            if (index < steps.length - 1) {
                const arrow = document.createElement('div');
                arrow.className = "timeline-arrow";
                arrow.innerHTML = '<div class="arrow"></div>';
                timeline.appendChild(arrow);
            }
        });
    }

    // Lấy thông tin tóm tắt về log
    function fetchLogInfo(logId) {
        fetch(`/process-log/get-log-info/${logId}/`)
            .then(response => response.json())
            .then(data => {
                document.getElementById('totalOperations').textContent = data.total_operations;
                document.getElementById('operationTime').textContent = data.operation_time;
            })
            .catch(error => console.error('Error:', error));
    }

    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }
});
