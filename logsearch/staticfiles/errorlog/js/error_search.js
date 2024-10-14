document.addEventListener('DOMContentLoaded', function() {
    const errorTypeSelect = document.getElementById('errorTypeSelect');
    const searchForm = document.getElementById('searchErrorForm');
    const timeline = document.getElementById('timeline');
    const errorFlow = document.getElementById('errorFlow');
    const backButton = document.getElementById('backButton');

    // Fetch error types and populate the dropdown
    fetch('/error-log/all-error-types/')
        .then(response => response.json())
        .then(data => {
            data.forEach(type => {
                const option = document.createElement('option');
                option.value = type;
                option.textContent = type;
                errorTypeSelect.appendChild(option);
            });
        });

    // Handle the search form submission
    searchForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const searchUser = document.getElementById('searchUser').value;
        const selectedErrorType = errorTypeSelect.value;

        fetch(`/error-log/search-flow/?user=${searchUser}&error_type=${selectedErrorType}`)
            .then(response => response.json())
            .then(data => displayErrorFlow(data))
            .catch(error => console.error('Error:', error));
    });

    function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }


    // Function to display the error flow (capimg + explanation)
    function displayErrorFlow(flowData) {
        timeline.innerHTML = '';
        flowData.forEach((step, index) => {
            const timelineItem = document.createElement('div');
            timelineItem.className = "timeline-item";
            // Nếu đây là dòng cuối cùng, thêm lớp 'last-explanation' để thay đổi màu
            const explanationClass = index === flowData.length - 1 ? 'last-explanation' : 'explanation';

            timelineItem.innerHTML = `
                <div class="timeline-content">
                    <img src="/media/${step.capimg}" alt="Captured Image" class="captured-image">
                    <div class="text-content">
                        <p class="${explanationClass}">${escapeHtml(step.explanation)}</p>
                    </div>
                </div>
            `;
            timeline.appendChild(timelineItem);
        });

        errorFlow.style.display = 'block';  // Show the flow
    }

    // Back button to return to search form
    backButton.addEventListener('click', function() {
        errorFlow.style.display = 'none';
        searchForm.reset();
    });
});
