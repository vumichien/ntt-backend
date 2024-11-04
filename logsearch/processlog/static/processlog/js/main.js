document.addEventListener("DOMContentLoaded", function () {
  const searchForm = document.getElementById("searchForm");
  const searchResults = document.getElementById("searchResults");
  const commonSelectButton = document.getElementById("commonSelectButton");
  const templateDisplay = document.getElementById("templateDisplay");
  let selectedLogIds = [];
  let questions = [];
  let currentQuestionIndex = 0;
  let templateSteps = [];
  let answers = {}; // Lưu trữ câu trả lời cho mỗi câu hỏi

  templateDisplay.style.display = "none"; // Ẩn templateDisplay khi trang vừa tải

  searchForm.addEventListener("submit", function (e) {
    e.preventDefault();
    const searchQuery = document.getElementById("searchInput").value;

    resetDisplay(); // Reset toàn bộ khi nhấn 検索

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
        show案件Form(); // Hiện 案件 form sau khi có kết quả tìm kiếm
      })
      .catch((error) => console.error("Error:", error));
  });

  function resetDisplay() {
    // Đặt lại tất cả các giao diện và giá trị khi tìm kiếm mới hoặc nhấn 検索
    const old案件Form = document.getElementById("案件Form");
    const oldQuestionForm = document.getElementById("questionForm");
    if (old案件Form) old案件Form.innerHTML = "";
    if (oldQuestionForm) oldQuestionForm.innerHTML = "";
    document.getElementById("案件Card").style.display = "none";
    document.getElementById("questionCard").style.display = "none";
    commonSelectButton.style.display = "none";
    templateDisplay.style.display = "none";
    templateDisplay.innerHTML = "";
    searchResults.innerHTML = "";
    questions = [];
    currentQuestionIndex = 0;
    answers = {};
  }

  function resetQuestionTemplate() {
    // Chỉ reset câu hỏi, template và các câu trả lời đã nhập
    const oldQuestionForm = document.getElementById("questionForm");
    if (oldQuestionForm) oldQuestionForm.innerHTML = "";
    document.getElementById("questionCard").style.display = "none";
    templateDisplay.style.display = "none";
    templateDisplay.innerHTML = "";
    questions = [];
    currentQuestionIndex = 0;
    answers = {};
  }

  function displaySearchResults(results) {
    searchResults.innerHTML = "";
    selectedLogIds = [];
    if (results.length > 0) {
      commonSelectButton.style.display = "block";
    }

    results.forEach((result) => searchResults.appendChild(createResultCard(result)));
  }

  function createResultCard(result) {
    const resultCard = document.createElement("div");
    resultCard.className = "col";
    resultCard.innerHTML = `
      <div class="card result-card h-100">
        <div class="card-header result-header">
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
         <div class="card-footer text-center">
          <input type="checkbox" class="select-checkbox" data-log-id="${result.id}" data-content="${result.content}">
        </div>
      </div>`;
    resultCard.querySelector(".select-checkbox").addEventListener("change", handleCheckbox);
    return resultCard;
  }

  function handleCheckbox() {
    const logId = this.getAttribute("data-log-id");
    if (this.checked) {
      selectedLogIds.push(logId);
    } else {
      selectedLogIds = selectedLogIds.filter(id => id !== logId);
    }
  }

  function show案件Form() {
    const 案件Card = document.getElementById("案件Card");
    案件Card.style.display = "block";
    const 案件Form = document.getElementById("案件Form");
    案件Form.innerHTML = `<input type="text" class="form-control" id="案件内容" placeholder="案件内容">`;
  }

  commonSelectButton.addEventListener("click", function () {
    if (selectedLogIds.length > 0) {
      resetQuestionTemplate(); // Reset câu hỏi và template khi nhấn "選択"
      // Lưu `master_log_ids` đã chọn vào `localStorage`
      localStorage.setItem("selectedMasterLogIds", JSON.stringify(selectedLogIds));
      const content = document.querySelector(`[data-log-id="${selectedLogIds[0]}"]`).getAttribute("data-content");
      fetchQuestionsAndTemplate(content);
      templateDisplay.style.display = "block";
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
    const questionContainer = document.createElement("div");
    questionContainer.classList.add("question-container");
    questionContainer.innerHTML = `
      <label for="question_${questions[index].question_id}" class="form-label">${questions[index].question_text}</label>
      <input type="text" class="form-control" id="question_${questions[index].question_id}" value="${answers[questions[index].question_id] || ''}">
    `;

    questionForm.appendChild(questionContainer);

    const inputElement = document.getElementById(`question_${questions[index].question_id}`);
    inputElement.addEventListener("keydown", function (event) {
      if (event.key === "Enter") handleNextQuestion();
    });

    const existingNextButton = document.getElementById("nextButton");
    if (existingNextButton) existingNextButton.remove();

    if (index < questions.length - 1) {
      addNextButton();
    } else {
      addGenerateButton();
    }

    displayTemplateStep(index);
  }

  function addNextButton() {
    const nextButton = document.createElement("button");
    nextButton.id = "nextButton";
    nextButton.className = "btn btn-primary mt-3";
    nextButton.textContent = "→";
    nextButton.addEventListener("click", handleNextQuestion);
    document.getElementById("questionForm").appendChild(nextButton);
  }

  function addGenerateButton() {
    const generateButton = document.createElement("button");
    generateButton.id = "generateButton";
    generateButton.className = "btn btn-primary mt-3";
    generateButton.textContent = "作業手順生成";
    generateButton.addEventListener("click", function () {
      saveCurrentAnswer();
      generateProcedure();
    });
    document.getElementById("questionForm").appendChild(generateButton);
  }

  function handleNextQuestion() {
    saveCurrentAnswer();

    const answer = document.getElementById(`question_${questions[currentQuestionIndex].question_id}`).value;
    const containsLetterAndNumber = /[a-zA-Z]/.test(answer) && /\d/.test(answer);

    if (containsLetterAndNumber && currentQuestionIndex + 2 < questions.length) {
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
    const step = templateSteps.find(step => step.input_id == questions[index].question_id);
    if (step) {
      const stepContainer = document.createElement("div");
      stepContainer.className = "timeline-item";
      stepContainer.innerHTML = `
        <div class="image-container">
          <img src="/media/${step.capimg}" alt="Captured" class="captured-image">
        </div>
        <div class="text-content">
          <p>${step.description.replace(`{${questions[index].question_id}}`, answers[questions[index].question_id] || '')}</p>
        </div>
      `;
      templateDisplay.appendChild(stepContainer);
    }
  }

  function displayRemainingTemplateSteps() {
    const remainingSteps = templateSteps.filter(step => !questions.some(q => q.question_id == step.input_id));
    remainingSteps.forEach((step) => {
      const stepContainer = document.createElement("div");
      stepContainer.className = "timeline-item";
      stepContainer.innerHTML = `
        <div class="image-container">
          <img src="/media/${step.capimg}" alt="Captured" class="captured-image">
        </div>
        <div class="text-content">
          <p>${step.description.replace(/\{(\d+)\}/g, (match, id) => answers[id] || '')}</p>
        </div>
      `;
      templateDisplay.appendChild(stepContainer);
    });
  }

  function saveCurrentAnswer() {
    const currentQuestion = questions[currentQuestionIndex];
    const inputElement = document.getElementById(`question_${currentQuestion.question_id}`);
    if (inputElement) {
      answers[currentQuestion.question_id] = inputElement.value;
    }
  }

  function generateProcedure() {
    localStorage.setItem("procedureAnswers", JSON.stringify(answers));
    const content = document.querySelector(`[data-log-id="${selectedLogIds[0]}"]`).getAttribute("data-content");
    window.location.href = `/process-log/log-details-view/${content}`;
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
