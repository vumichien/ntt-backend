document.addEventListener('DOMContentLoaded', function() {
    const errorTypeSelect = document.getElementById('errorTypeSelect');
    const searchForm = document.getElementById('searchErrorForm');
    const timeline = document.getElementById('timeline');
    const errorFlow = document.getElementById('errorFlow');
    const backButton = document.getElementById('backButton');
    const leftArrow = document.getElementById('leftArrow');
    const rightArrow = document.getElementById('rightArrow');
    let currentIndex = 0;
    let flowDataArray = [];

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
            .then(data => {
                flowDataArray = data;
                currentIndex = 0;
                displayErrorFlow(flowDataArray[currentIndex]);  // Display first result
                updateArrowVisibility(); // Update the visibility of the arrows
            })
            .catch(error => console.error('Error:', error));
    });

    // Left arrow click event
    leftArrow.addEventListener('click', function() {
        if (currentIndex > 0) {
            currentIndex--;
            displayErrorFlow(flowDataArray[currentIndex]);
            updateArrowVisibility();
        }
    });

    // Right arrow click event
    rightArrow.addEventListener('click', function() {
        if (currentIndex < flowDataArray.length - 1) {
            currentIndex++;
            displayErrorFlow(flowDataArray[currentIndex]);
            updateArrowVisibility();
        }
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
         // Update header with user and time information
        const userHeader = document.getElementById('userHeader');
        const timeHeader = document.getElementById('timeHeader');
        const firstStep = flowData[0];

         if (firstStep) {
            // Set the user_name and time
            userHeader.textContent = `${firstStep.user_name}の操作履歴`;
            timeHeader.textContent = `(日時：${new Date(firstStep.time).toLocaleDateString('ja-JP')})`;
        } else {
            userHeader.textContent = "No Data Available";
            timeHeader.textContent = "";
        }

        // Show the header if it's hidden
        document.getElementById('errorHeader').style.display = 'block';

        // Rest of the code to display timeline
        timeline.innerHTML = '';
        flowData.forEach((step, index) => {
            const timelineItem = document.createElement('div');
            timelineItem.className = "timeline-item";
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

    // Function to update the visibility of arrows
    function updateArrowVisibility() {
        leftArrow.style.visibility = currentIndex === 0 ? 'hidden' : 'visible';
        rightArrow.style.visibility = currentIndex === flowDataArray.length - 1 ? 'hidden' : 'visible';
    }

    // Back button to return to search form
    backButton.addEventListener('click', function() {
        errorFlow.style.display = 'none';
        searchForm.reset();
    });
});
