document.addEventListener('DOMContentLoaded', function() {
    const pathParts = window.location.pathname.split('/');
    const content = decodeURIComponent(pathParts[pathParts.length - 2]);
    console.log("Content passed to log details:", content);

    // Đặt trực tiếp `operationTime` bằng `content`
    document.getElementById('operationTime').textContent = content;

    // Lấy câu trả lời từ localStorage
    const answers = JSON.parse(localStorage.getItem('procedureAnswers') || '{}');

    if (content && answers) {
        generateProcedure(content, answers);  // Gọi API để lấy các bước từ template với câu trả lời
    }

    document.getElementById('backButton').addEventListener('click', function() {
        window.history.back();
    });

    function generateProcedure(content, answers) {
        fetch(`/process-log/generate-procedure/${content}/`, {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": getCookie("csrftoken"),
            },
            body: JSON.stringify({ answers: answers })
        })
        .then(response => response.json())
        .then(data => {
            console.log("Procedure steps:", data);
            document.getElementById('totalOperations').textContent = data.length; // Số bước của flow
            displayProcedure(data);
        })
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
