document.addEventListener("DOMContentLoaded", function () {
  const searchForm = document.getElementById("searchForm");
  const searchResults = document.getElementById("searchResults");

  searchForm.addEventListener("submit", function (e) {
    e.preventDefault();
    const searchQuery = document.getElementById("searchInput").value;

    // Clear previous forms and results
    const old案件Form = document.getElementById("案件Form");
    const oldQuestionForm = document.getElementById("questionForm");
    if (old案件Form) old案件Form.innerHTML = "";
    if (oldQuestionForm) oldQuestionForm.innerHTML = "";
    document.getElementById("案件Card").style.display = "none";
    document.getElementById("questionCard").style.display = "none";

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
    searchResults.innerHTML = ""; // Clear previous search results

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
    // Clear any existing question forms
    const questionForm = document.getElementById("questionForm");
    if (questionForm) questionForm.innerHTML = "";

    // Re-enable all logs (remove opacity)
    document.querySelectorAll(".result-card").forEach((card) => {
      card.style.opacity = "1"; // Restore opacity for all logs
    });

    // Dim all logs except the selected one
    document.querySelectorAll(".result-card").forEach((card) => {
      const button = card.querySelector(".select-button");
      if (button.getAttribute("data-log-id") !== selectedLogId) {
        card.style.opacity = "0.5"; // Dim the logs that are not selected
      }
    });

    // Display and populate 案件 form
    const 案件Card = document.getElementById("案件Card");
    案件Card.style.display = "block";
    const 案件Form = document.getElementById("案件Form");
    案件Form.innerHTML = `
      <input type="text" class="form-control" id="案件内容" placeholder="案件内容">
      <button id="保存Button" class="btn btn-success mt-2">保存</button>
    `;

    document.getElementById("保存Button").addEventListener("click", function () {
      save案件内容(selectedLogId);  // Pass the selectedLogId to save the new log's 案件
    });
  }

  function save案件内容(selectedLogId) {
    const 案件内容 = document.getElementById("案件内容").value;

    fetch(`/process-log/get-questions/${selectedLogId}/`)
      .then((response) => response.json())
      .then((data) => displayQuestions(data, selectedLogId))  // Pass selectedLogId to display the new list of questions
      .catch((error) => console.error("Error:", error));
  }

  function displayQuestions(questions, selectedLogId) {
    const questionCard = document.getElementById("questionCard");
    questionCard.style.display = "block";  // Show the card
    const questionForm = document.getElementById("questionForm");

    const formRow = document.createElement("div");
    formRow.className = "row g-3";

    questions.forEach((question, index) => {
      const col = document.createElement("div");
      col.className = "col-md-6";
      col.innerHTML = `
        <label for="question_${question.question_id}" class="form-label">${index + 1}. ${question.question_text}</label>
        <input type="text" class="form-control" id="question_${question.question_id}">
      `;
      formRow.appendChild(col);
    });

    questionForm.appendChild(formRow);

    const generateButton = document.createElement("button");
    generateButton.id = "generateButton";
    generateButton.className = "btn btn-primary mt-3";
    generateButton.textContent = "作業手順生成";
    questionForm.appendChild(generateButton);

    generateButton.addEventListener("click", function () {
      generateProcedure(selectedLogId, questions);  // Pass selectedLogId to generate the procedure
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
