document.addEventListener("DOMContentLoaded", function () {
  const searchForm = document.getElementById("searchForm");
  const searchResults = document.getElementById("searchResults");
  const logDetails = document.getElementById("logDetails");
  const 案件Card = document.getElementById("案件Card"); // Card của 案件
  const questionCard = document.getElementById("questionCard"); // Card cho câu hỏi

  // Khi nhấn nút 検索 (Tìm kiếm), ẩn 案件 và questionForm
  searchForm.addEventListener("submit", function (e) {
    e.preventDefault();
    const searchQuery = document.getElementById("searchInput").value;

    // Ẩn 案件 và các câu hỏi khi có kết quả tìm kiếm mới
    案件Card.style.display = "none"; // Ẩn ô input 案件
    questionCard.style.display = "none"; // Ẩn danh sách câu hỏi

    fetch("/process-log/search-logs/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCookie("csrftoken"),
      },
      body: JSON.stringify({ search_query: searchQuery }),
    })
      .then((response) => response.json())
      .then((data) => displaySearchResults(data))
      .catch((error) => console.error("Error:", error));
  });

  function displaySearchResults(results) {
    searchResults.innerHTML = ""; // Xóa kết quả cũ
    logDetails.style.display = "none"; // Ẩn log details nếu có

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
                        <p class="card-text">内容: ${result.content || 'N/A'}</p>
                        <p class="card-text">手順の特徴: ${result.procedure_features || 'N/A'}</p>
                        <p class="card-text">データ特徴: ${result.data_features || 'N/A'}</p>
                    </div>
                    <div class="card-footer">
                        <button class="btn btn-primary select-button w-100" data-log-id="${result.id}">選択</button>
                    </div>
                </div>
            `;
      searchResults.appendChild(resultCard);
    });

    document.querySelectorAll(".select-button").forEach((button) => {
      button.addEventListener("click", function () {
        const logId = this.getAttribute("data-log-id");
        selectLog(logId);
      });
    });
  }

  function selectLog(selectedLogId) {
    console.log("Selected log ID:", selectedLogId);

    // Clear any existing question forms
    const questionForm = document.getElementById("questionForm");
    if (questionForm) {
      questionForm.style.display = "none";  // Hide the previous question list
    }

    // Re-enable all logs (remove opacity)
    document.querySelectorAll(".result-card").forEach((card) => {
      card.style.opacity = "1";  // Restore opacity for all logs
    });

    // Dim all logs except the selected one
    document.querySelectorAll(".result-card").forEach((card) => {
      const button = card.querySelector(".select-button");
      if (button.getAttribute("data-log-id") !== selectedLogId) {
        card.style.opacity = "0.5";  // Dim the logs that are not selected
      }
    });

    案件Card.style.display = "block"; // Show the 案件 form when a log is selected

    // Attach the event listener for the 案件 form
    document.getElementById("保存Button").addEventListener("click", function () {
      save案件内容(selectedLogId);  // Save 案件内容 and fetch questions for the selected log
    });
  }

  function save案件内容(selectedLogId) {
    const 案件内容 = document.getElementById("案件内容").value;

    fetch(`/process-log/get-questions/${selectedLogId}/`)
      .then((response) => response.json())
      .then((data) => displayQuestions(data, selectedLogId))
      .catch((error) => console.error("Error:", error));
  }

  function displayQuestions(questions, selectedLogId) {
    const questionContainer = document.getElementById("questionContainer");
    questionContainer.innerHTML = "";  // Clear previous questions

    questions.forEach((question, index) => {
      const col = document.createElement("div");
      col.className = "col-md-6";
      col.innerHTML = `
            <label for="question_${question.question_id}" class="form-label">${index + 1}. ${question.question_text}</label>
            <input type="text" class="form-control" id="question_${question.question_id}">
        `;
      questionContainer.appendChild(col);
    });

    // Show the question form
    questionCard.style.display = "block";

    // Event listener for generating the procedure
    document.getElementById("generateButton").addEventListener("click", function () {
      generateProcedure(selectedLogId, questions);
    });
  }

  function generateProcedure(selectedLogId, questions) {
    const answers = {};
    questions.forEach((question) => {
      const answer = document.getElementById(`question_${question.question_id}`).value;
      answers[question.question_id] = answer;
    });

    // Save the answers in localStorage for later use
    localStorage.setItem("procedureAnswers", JSON.stringify(answers));

    // Redirect to log details page
    window.location.href = `/process-log/log-details-view/${selectedLogId}`;
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
