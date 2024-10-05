document.addEventListener('DOMContentLoaded', function() {
    const pathParts = window.location.pathname.split('/');
    const logId = pathParts[pathParts.length - 1];

    // Lấy câu trả lời của người dùng từ localStorage
    const answers = JSON.parse(localStorage.getItem('procedureAnswers') || '{}');

    if (logId && answers) {
        generateProcedure(logId, answers);  // Gọi API để lấy các thao tác từ template
        fetchLogInfo(logId);
    }

    document.getElementById('backButton').addEventListener('click', function() {
        window.history.back();
    });

    // Hàm gọi API và hiển thị thao tác
    function generateProcedure(logId, answers) {
    console.log(answers);
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

    // Hiển thị các thao tác và hình ảnh tương ứng
    function displayProcedure(steps) {
        const timeline = document.getElementById('timeline');
        timeline.innerHTML = '';

        steps.forEach((step) => {
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
        });
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
