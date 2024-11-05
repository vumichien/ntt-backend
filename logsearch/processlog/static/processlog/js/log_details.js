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
        fetchManualInfo(content);
        fetchHistoryInputs(selectedMasterLogIds, answers);
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

    function fetchManualInfo(content) {
        fetch(`/process-log/get-manual-info/${content}/`)
            .then(response => response.json())
            .then(data => displayManualInfo(data))
            .catch(error => console.error('Error:', error));
    }

   function displayManualInfo(data) {
        document.getElementById("documentName").textContent = data.document_name || "N/A";
        document.getElementById("pageNumber").textContent = data.page_number || "N/A";
        const documentContentElement = document.getElementById("documentContent");

        if (data.document_content && (data.document_content.endsWith('.jpg') || data.document_content.endsWith('.jpeg') || data.document_content.endsWith('.png') || data.document_content.endsWith('.gif'))) {
            // Nếu là đường dẫn hình ảnh, thêm thẻ ảnh
            documentContentElement.innerHTML = `<img src="${data.document_content}" alt="Document Image" style="max-width: 100%;">`;
        } else {
            // Nếu là văn bản, hiển thị dưới dạng văn bản
            documentContentElement.textContent = data.document_content;
        }
    }

    // Gọi API để lấy giá trị input từ history files
    function fetchHistoryInputs(selectedMasterLogIds, inputIds) {
        fetch(`/process-log/get-history-inputs/`, {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": getCookie("csrftoken"),
            },
            body: JSON.stringify({
                selected_master_log_ids: selectedMasterLogIds,
                input_ids: Object.keys(inputIds) // Chỉ gửi các input_id có trong answers
            })
        })
        .then(response => response.json())
        .then(data => displayHistoryInputs(data))
        .catch(error => console.error('Error:', error));
    }

    function displayHistoryInputs(historyData) {
        const historyContent = document.getElementById("history-content");
        historyContent.innerHTML = ''; // Xóa nội dung cũ

        historyData.forEach(fileData => {
            const fileTitle = document.createElement("div");
            fileTitle.className = "history-entry";
            fileTitle.innerHTML = `<span>${fileData.filename}</span>`;

            const inputsList = document.createElement("ul");
            let fieldsBeforeButton = [];

            fileData.inputs.forEach(input => {
                if (input.check_label) {
                    // Nếu có check_label, hiển thị danh sách các field trước button nhấn
                    const checkLabel = document.createElement("li");
                    checkLabel.className = "check-label";
                    // Ghép nối các trường trước button nhấn bằng dấu phẩy và xuống dòng với lùi thụt
                    const fieldsText = fieldsBeforeButton.join("、");
                    checkLabel.innerHTML = `<strong>${input.check_label}：</strong><br><span class="indented">${fieldsText}</span>`;
                    inputsList.appendChild(checkLabel);

                    // Reset fieldsBeforeButton để chuẩn bị cho các step tiếp theo
                    fieldsBeforeButton = [];
                } else {
                    // Nếu là input bình thường, thêm vào danh sách input và fieldsBeforeButton
                    const inputItem = document.createElement("li");
                    inputItem.innerHTML = `「${input.field_name}」における入力値：「${input.input_value}」`;
                    inputsList.appendChild(inputItem);

                    fieldsBeforeButton.push(`「${input.field_name}」`);
                }
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
