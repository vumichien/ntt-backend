document.addEventListener("DOMContentLoaded", function () {
  const searchForm = document.getElementById("searchForm");
  const searchResults = document.getElementById("searchResults");
  const logDetails = document.getElementById("logDetails");

  searchForm.addEventListener("submit", function (e) {
    e.preventDefault();
    const business = document.getElementById("businessInput").value;
    const action = document.getElementById("actionInput").value;

    fetch("/process-log/search-logs/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCookie("csrftoken"),
      },
      body: JSON.stringify({ business, action }),
    })
      .then((response) => response.json())
      .then((data) => displaySearchResults(data))
      .catch((error) => console.error("Error:", error));
  });

  function displaySearchResults(results) {
    searchResults.innerHTML = "";
    logDetails.style.display = "none";

    results.forEach((result) => {
      const resultCard = document.createElement("div");
      resultCard.className = "col";
      resultCard.innerHTML = `
                <div class="card result-card h-100">
                    <div class="card-header result-header">
                        <h5 class="card-title mb-0">${result.filename}</h5>
                        <small class="text-muted">${result.note}</small>
                    </div>
                    <div class="card-body">
                        <p class="card-text">操作時間: ${result.operation_time}</p>
                        <p class="card-text">総操作数: ${result.total_operations}</p>
                    </div>
                    <div class="card-footer">
                        <button class="btn btn-primary details-button w-100" data-log-id="${result.id}">詳細</button>
                    </div>
                </div>
            `;
      searchResults.appendChild(resultCard);
    });

    document.querySelectorAll(".details-button").forEach((button) => {
      button.addEventListener("click", function () {
        const logId = this.getAttribute("data-log-id");
        const searchAction = document.getElementById("actionInput").value;
        window.location.href = `/process-log/log-details-view/${logId}?action=${encodeURIComponent(searchAction)}`;
      });
    });
  }

  function fetchLogDetails(logId) {
    fetch(`/log-details/${logId}/`)
      .then((response) => response.json())
      .then((data) => displayLogDetails(data, logId))
      .catch((error) => console.error("Error:", error));
  }

  function displayLogDetails(details, logId) {
    searchResults.style.display = "none";
    logDetails.style.display = "block";
    logDetails.innerHTML =
      '<button id="backButton" class="btn btn-secondary mb-3">前へ</button>';

    fetch(`/get-log-info/${logId}/`)
      .then((response) => response.json())
      .then((logInfo) => {
        const logSummary = document.createElement("div");
        logSummary.className = "card mb-4";
        logSummary.innerHTML = `
                    <div class="card-body">
                        <h5 class="card-title">ログ概要</h5>
                        <p class="card-text">操作数: ${logInfo.total_operations}</p>
                        <p class="card-text">操作時間: ${logInfo.operation_time}</p>
                    </div>
                `;
        logDetails.appendChild(logSummary);

        const timeline = document.createElement("div");
        timeline.className = "timeline";
        details.forEach((detail) => {
          const timelineItem = document.createElement("div");
          timelineItem.className = "timeline-item";
          timelineItem.innerHTML = `
                        <div class="timeline-content">
                            <img src="/media/${detail.capimg}" alt="Captured" class="captured-image img-fluid">
                            <div class="text-content">
                                <p class="explanation">${detail.explanation}</p>
                                <p class="action-time text-muted">開始時間：${detail.action_time}</p>
                            </div>
                        </div>
                    `;
          timeline.appendChild(timelineItem);
        });
        logDetails.appendChild(timeline);
      })
      .catch((error) => console.error("Error:", error));

    document
      .getElementById("backButton")
      .addEventListener("click", function () {
        logDetails.style.display = "none";
        searchResults.style.display = "flex";
      });
  }

  function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== "") {
      const cookies = document.cookie.split(";");
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.substring(0, name.length + 1) === name + "=") {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  }
});
