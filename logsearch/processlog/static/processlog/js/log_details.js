document.addEventListener('DOMContentLoaded', function() {
    const pathParts = window.location.pathname.split('/');
    const content = decodeURIComponent(pathParts[pathParts.length - 2]);
    console.log("Content passed to log details:", content);

    // Đặt trực tiếp `operationTime` bằng `content`
    document.getElementById('procedureContent').textContent = content;

    // Lấy mảng `master_log_ids` đã chọn từ `localStorage`
    const selectedMasterLogIds = JSON.parse(localStorage.getItem('selectedMasterLogIds') || '[]');
    console.log("Selected Master Log IDs:", selectedMasterLogIds);

    // Lấy câu trả lời từ localStorage
    const answers = JSON.parse(localStorage.getItem('procedureAnswers') || '{}');

    if (content && answers) {
        generateProcedure(content, answers);
        fetchHistoryInputs(selectedMasterLogIds);
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
            document.getElementById('totalSteps').textContent = data.length; // Số bước của flow
            displayProcedure(data);
        })
        .catch(error => console.error('Error:', error));
    }

    // Gọi API để lấy giá trị input từ history files
    function fetchHistoryInputs(selectedMasterLogIds) {
        fetch(`/process-log/get-history-inputs/`, {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": getCookie("csrftoken"),
            },
            body: JSON.stringify({ selected_master_log_ids: selectedMasterLogIds })
        })
        .then(response => response.json())
        .then(data => displayHistoryInputs(data))
        .catch(error => console.error('Error:', error));
    }

    function displayHistoryInputs(historyData) {
        const historyContent = document.getElementById("history-content");
        historyContent.innerHTML = ''; // Clear existing content

        historyData.forEach(fileData => {
            const fileTitle = document.createElement("div");
            fileTitle.className = "history-entry";
            fileTitle.innerHTML = `<span>${fileData.filename}</span>`;

            const inputsList = document.createElement("ul");
            fileData.inputs.forEach(input => {
                const inputItem = document.createElement("li");
                inputItem.innerHTML = `「${input.field_name}」における入力値：「${input.input_value}」`;
                inputsList.appendChild(inputItem);
            });

            historyContent.appendChild(fileTitle);
            historyContent.appendChild(inputsList);
        });
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
