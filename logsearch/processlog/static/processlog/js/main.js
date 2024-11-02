document.addEventListener("DOMContentLoaded", function () {
  const searchForm = document.getElementById("searchForm");
  const searchResults = document.getElementById("searchResults");
  const commonSelectButton = document.getElementById("commonSelectButton");
  let selectedLogIds = [];
  let questions = [];
  let currentQuestionIndex = 0;
  let templateSteps = [];

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
    commonSelectButton.style.display = "none";

    fetch("/process-log/search-logs/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCookie("csrftoken"),
      },
      body: JSON.stringify({ search_query: searchQuery }),
    })
      .then((response) => response.json())
      .then((data) => {
        displaySearchResults(data);
        show案件Form(); // Automatically show the 案件 form after search results
      })
      .catch((error) => console.error("Error:", error));
  });

  function displaySearchResults(results) {
    searchResults.innerHTML = "";
    selectedLogIds = [];

    results.forEach((result) => {
      const resultCard = document.createElement("div");
      resultCard.className = "col";
      resultCard.innerHTML = `
        <div class="card result-card h-100">
            <div class="card-header result-header">
              <input type="checkbox" class="select-checkbox" data-log-id="${result.id}" data-content="${result.content}" style="margin-right: 10px;">
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

  function show案件Form() {
    const 案件Card = document.getElementById("案件Card");
    案件Card.style.display = "block";
    const 案件Form = document.getElementById("案件Form");
    案件Form.innerHTML = `<input type="text" class="form-control" id="案件内容" placeholder="案件内容">`;
  }

  commonSelectButton.addEventListener("click", function () {
    if (selectedLogIds.length > 0) {
      const content = document.querySelector(`[data-log-id="${selectedLogIds[0]}"]`).getAttribute("data-content");
      fetchQuestionsAndTemplate(content);
    }
  });

  function fetchQuestionsAndTemplate(content) {
    fetch(`/process-log/get-questions/${content}/`)
      .then((response) => response.json())
      .then((data) => {
        questions = data.questions;
        templateSteps = data.templateSteps;
        displayQuestion(0);
      })
      .catch((error) => console.error("Error:", error));
  }

  function displayQuestion(index) {
    currentQuestionIndex = index;
    const questionCard = document.getElementById("questionCard");
    questionCard.style.display = "block";
    const questionForm = document.getElementById("questionForm");
    questionForm.innerHTML = `
      <label for="question_${questions[index].question_id}" class="form-label">${questions[index].question_text}</label>
      <input type="text" class="form-control" id="question_${questions[index].question_id}">
      <button id="nextButton" class="btn btn-primary mt-3">→</button>
    `;

    document.getElementById("nextButton").addEventListener("click", handleNextQuestion);
    document.getElementById(`question_${questions[index].question_id}`).addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        handleNextQuestion();
      }
    });

    displayTemplateStep(index);
  }

  function handleNextQuestion() {
    const answer = document.getElementById(`question_${questions[currentQuestionIndex].question_id}`).value;
    const containsLetterAndNumber = /[a-zA-Z]/.test(answer) && /\d/.test(answer);

    const storedAnswers = JSON.parse(localStorage.getItem("procedureAnswers") || "{}");
    storedAnswers[questions[currentQuestionIndex].question_id] = answer;
    localStorage.setItem("procedureAnswers", JSON.stringify(storedAnswers));

    if (containsLetterAndNumber) {
      currentQuestionIndex += 2;
    } else {
      currentQuestionIndex += 1;
    }

    if (currentQuestionIndex < questions.length) {
      displayQuestion(currentQuestionIndex);
    } else {
      displayRemainingTemplateSteps();
    }
  }

  function displayTemplateStep(index) {
      const templateDisplay = document.getElementById("templateDisplay");
      const step = templateSteps.find(step => step.input_id == questions[index].question_id);

      if (step) {
        templateDisplay.innerHTML = `
          <div class="timeline-item">
            <div class="image-container">
              <img src="/media/${step.capimg}" alt="Captured" class="captured-image">
            </div>
            <div class="text-content">
              <p>${step.description}</p>
            </div>
          </div>
        `;
      }
    }

  function displayRemainingTemplateSteps() {
      const templateDisplay = document.getElementById("templateDisplay");
      templateDisplay.innerHTML = templateSteps.slice(currentQuestionIndex).map(step => `
        <div class="timeline-item">
          <div class="image-container">
            <img src="/media/${step.capimg}" alt="Captured" class="captured-image">
          </div>
          <div class="text-content">
            <p>${step.description}</p>
          </div>
        </div>
      `).join("");
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
