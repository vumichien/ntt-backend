document.addEventListener("DOMContentLoaded", function () {
  const searchForm = document.getElementById("searchForm");
  const searchResults = document.getElementById("searchResults");
  const commonSelectButton = document.getElementById("commonSelectButton");
  let selectedLogIds = [];

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
    commonSelectButton.style.display = "none"; // Hide common select button

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
    selectedLogIds = []; // Clear selected IDs

    results.forEach((result) => {
      const resultCard = document.createElement("div");
      resultCard.className = "col";
      resultCard.innerHTML = `
        <div class="card result-card h-100">
            <div class="card-header result-header">
              <input type="checkbox" class="select-checkbox" data-log-id="${result.id}" style="margin-right: 10px;">
              <div>
                <h5 class="card-title mb-0 d-inline">${result.filename}</h5>
              </div>
              <div>
                <small>${result.note}</small>
              </div>
            </div>
            <div class="card-body">
                <p class="card-text">操作時間: ${result.operation_time}</p>
                <p class="card-text">総操作数: ${result.total_operations}</p>
                <p class="card-text">内容: ${result.content || 'N/A'}</p>
                <p class="card-text">手順の特徴: ${result.procedure_features || 'N/A'}</p>
                <p class="card-text">データ特徴: ${result.data_features || 'N/A'}</p>
            </div>
        </div>
      `;
      searchResults.appendChild(resultCard);
    });

    // Show common select button if there are results
    if (results.length > 0) {
      commonSelectButton.style.display = "block";
    }

    document.querySelectorAll(".select-checkbox").forEach((checkbox) => {
      checkbox.addEventListener("change", function () {
        const logId = this.getAttribute("data-log-id");
        if (this.checked) {
          selectedLogIds.push(logId);
        } else {
          selectedLogIds = selectedLogIds.filter(id => id !== logId);
        }
      });
    });
  }

  commonSelectButton.addEventListener("click", function () {
    if (selectedLogIds.length > 0) {
      show案件Form(selectedLogIds);
    }
  });

  function show案件Form(logIds) {
    // Display 案件 form
    const 案件Card = document.getElementById("案件Card");
    案件Card.style.display = "block";
    const 案件Form = document.getElementById("案件Form");
    案件Form.innerHTML = `
      <input type="text" class="form-control" id="案件内容" placeholder="案件内容">
      <button id="AnalysisButton" class="btn btn-primary mt-2">分析</button>
    `;

    document.getElementById("AnalysisButton").addEventListener("click", function () {
      save案件内容(logIds);  // Pass selected log IDs to save the new log's 案件
    });
  }

  function save案件内容(logIds) {
    const 案件内容 = document.getElementById("案件内容").value;

    const questionCard = document.getElementById("questionCard");
    if (questionCard.style.display === "block") {
      // 問題がすでに表示されている場合は何もしない
      return;
    }

    fetch(`/process-log/get-questions/${logIds[0]}/`)  // Display questions for the first selected log as an example
      .then((response) => response.json())
      .then((data) => displayQuestions(data, logIds))
      .catch((error) => console.error("Error:", error));
  }

  function displayQuestions(questions, logIds) {
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
      generateProcedure(logIds, questions);  // Pass selected log IDs to generate the procedure
    });
  }

  function generateProcedure(logIds, questions) {
    const answers = {};
    questions.forEach((question) => {
      const answer = document.getElementById(`question_${question.question_id}`).value;
      answers[question.question_id] = answer;
    });

    // Save the answers in localStorage for later use
    localStorage.setItem("procedureAnswers", JSON.stringify(answers));

    // Redirect to log details page of the first selected log as an example
    window.location.href = `/process-log/log-details-view/${logIds[0]}`;
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
