document.addEventListener('DOMContentLoaded', function() {
    const chatOutput = document.getElementById('chat-output');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    let saveTimeout;
    const chatHistoryList = document.getElementById('chat-history-list');
    let currentEditingFile = null;
    let lastKeyword = '';

    userInput.addEventListener('input', function() {
        adjustTextareaHeight(this);
        if (userInput.value.trim() !== '') {
            sendButton.classList.add('active');
            sendButton.disabled = false;
        } else {
            sendButton.classList.remove('active');
            sendButton.disabled = true;
        }
    });

    function adjustTextareaHeight(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = (textarea.scrollHeight) + 'px';
    }

    userInput.addEventListener('keydown', function(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });

    sendButton.addEventListener('click', function() {
        sendMessage();
    });

    function appendLoadingMessage(message) {
        const messageContainer = document.createElement('div');
        messageContainer.className = 'message-container chatbot-message-container';

        const avatar = document.createElement('img');
        avatar.className = 'avatar';
        avatar.src = '/static/chatbot/images/chatbot-avatar.png';
        avatar.alt = 'Chatbot Avatar';

        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'loading-message';
        loadingDiv.innerHTML = `${message}<span class="loading-dots"></span>`;

        messageContainer.appendChild(avatar);
        messageContainer.appendChild(loadingDiv);
        chatOutput.appendChild(messageContainer);
        chatOutput.scrollTop = chatOutput.scrollHeight;

        return messageContainer;
    }

    async function sendMessage(message = null) {
        const messageToSend = message || userInput.value;
        if (messageToSend.trim() !== '') {
            if (!message) {
                appendUserMessage(messageToSend);
                userInput.value = '';
                sendButton.classList.remove('active');
                sendButton.disabled = true;
                userInput.style.height = 'auto';
            }

            // Show initial loading message
            const loadingContainer = appendLoadingMessage('AI分析中');
            await new Promise(resolve => setTimeout(resolve, 1500));
            loadingContainer.remove();
            
            const csrftoken = getCookie('csrftoken');

            fetch('/chatbot/get-response/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrftoken,
                },
                body: JSON.stringify({ message: messageToSend })
            })
            .then(response => response.json())
            .then(async data => {
                if (data.message) {
                    if (data.expecting_keyword) {
                        lastKeyword = '';
                    } else if (lastKeyword === '' && data.message === "どんな手順を知りたいですか？") {
                        // Don't save lastKeyword
                    } else if (lastKeyword === '') {
                        lastKeyword = messageToSend;
                        saveChatHistory();
                    }
                    
                    if (data.raw_html) {
                        appendChatbotMessage(data.message, true);
                    } else {
                        appendChatbotMessage(data.message);
                    }
                }

                if (data.show_buttons) {
                    displayConfirmationButtons();
                } else if (data.expecting_keyword) {
                    lastKeyword = '';
                } else if (lastKeyword === '' && data.message !== "どんな手順を知りたいですか？") {
                    lastKeyword = messageToSend;
                }

                if (data.timeline) {
                    // Show データを集計中 loading
                    const loadingData = appendLoadingMessage('データを集計中');
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    loadingData.remove();

                    // Show 手順生成の準備中 loading
                    const loadingPrep = appendLoadingMessage('手順生成の準備中');
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    loadingPrep.remove();

                    // Display timeline
                    displayTimeline(data.timeline);
                }
            })
            .catch(error => console.error('Error:', error));

            resetSaveTimeout();
        }
    }

    function displayConfirmationButtons() {
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'button-container';

        const yesButton = document.createElement('button');
        yesButton.className = 'yes-button';
        yesButton.textContent = 'はい';
        yesButton.onclick = () => handleButtonClick('はい');

        const noButton = document.createElement('button');
        noButton.className = 'no-button';
        noButton.textContent = 'いいえ';
        noButton.onclick = () => handleButtonClick('いいえ');

        buttonContainer.appendChild(yesButton);
        buttonContainer.appendChild(noButton);
        chatOutput.appendChild(buttonContainer);
        chatOutput.scrollTop = chatOutput.scrollHeight;
    }

    function handleButtonClick(choice) {
        // Remove the button container
        const buttonContainer = document.querySelector('.button-container');
        if (buttonContainer) {
            buttonContainer.remove();
        }

        // Send the message without appending it to the chat
        sendMessage(choice);
    }

    function displayTimeline(timelineHtml) {
        const headerCardContainer = document.createElement('div');
        headerCardContainer.className = 'header-card-container';

        const headerCardMatch = timelineHtml.match(/<div class="timeline-header-card">[\s\S]*?<\/div>/);
        if (headerCardMatch) {
            headerCardContainer.innerHTML = headerCardMatch[0];
            timelineHtml = timelineHtml.replace(headerCardMatch[0], '');
        }

        chatOutput.appendChild(headerCardContainer);

        const timelineDiv = document.createElement('div');
        timelineDiv.className = 'chat-timeline';
        timelineDiv.innerHTML = timelineHtml;
        chatOutput.appendChild(timelineDiv);

        chatOutput.scrollTop = chatOutput.scrollHeight;
    }

    function appendUserMessage(message) {
        const messageContainer = document.createElement('div');
        messageContainer.className = 'message-container user-message-container';

        const avatar = document.createElement('img');
        avatar.className = 'avatar';
        avatar.src = '/static/chatbot/images/user-avatar.png';
        avatar.alt = 'User Avatar';

        const userMessageDiv = document.createElement('div');
        userMessageDiv.className = 'user-message';
        userMessageDiv.textContent = message;

        messageContainer.appendChild(userMessageDiv);
        messageContainer.appendChild(avatar);
        chatOutput.appendChild(messageContainer);
        chatOutput.scrollTop = chatOutput.scrollHeight;
    }

    function appendChatbotMessage(message, rawHtml = false) {
        const messageContainer = document.createElement('div');
        messageContainer.className = 'message-container chatbot-message-container';

        const avatar = document.createElement('img');
        avatar.className = 'avatar';
        avatar.src = '/static/chatbot/images/chatbot-avatar.png';
        avatar.alt = 'Chatbot Avatar';

        const chatbotMessageDiv = document.createElement('div');
        chatbotMessageDiv.className = 'chatbot-message';
        if (rawHtml) {
            chatbotMessageDiv.innerHTML = message;
        } else {
            chatbotMessageDiv.textContent = message;
        }

        messageContainer.appendChild(avatar);
        messageContainer.appendChild(chatbotMessageDiv);
        chatOutput.appendChild(messageContainer);
        chatOutput.scrollTop = chatOutput.scrollHeight;

        if (rawHtml) {
            const yesButton = chatbotMessageDiv.querySelector('.yes-button');
            const noButton = chatbotMessageDiv.querySelector('.no-button');
            if (yesButton) yesButton.addEventListener('click', () => handleButtonClick('はい'));
            if (noButton) noButton.addEventListener('click', () => handleButtonClick('いいえ'));
        }
    }

    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }

    function saveChatHistory() {
        const chatOutput = document.getElementById('chat-output').innerHTML;
        const timestamp = new Date().toISOString();

        fetch('/chatbot/save-history/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken'),
            },
            body: JSON.stringify({
                chat_content: chatOutput,
                timestamp: timestamp,
                keyword: lastKeyword,
                current_file: currentEditingFile
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                currentEditingFile = data.filename;
                updateChatHistoryList();
            }
        })
        .catch(error => console.error('Error:', error));
    }

    function updateChatHistoryList() {
        fetch('/chatbot/get-history/')
        .then(response => response.json())
        .then(data => {
            chatHistoryList.innerHTML = '';
            const groups = {};

            data.history.forEach(item => {
                if (!groups[item.group]) {
                    groups[item.group] = [];
                }
                groups[item.group].push(item);
            });

            for (const [group, items] of Object.entries(groups)) {
                const groupElement = document.createElement('div');
                groupElement.className = 'chat-history-group';
                groupElement.innerHTML = `<h4>${group}</h4>`;

                const groupList = document.createElement('ul');
                items.forEach(item => {
                    const li = document.createElement('li');
                    const date = new Date(item.timestamp);
                    const formattedDate = `${date.getFullYear()}/${(date.getMonth()+1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
                    li.innerHTML = `<strong>${item.keyword}</strong><span>${formattedDate}</span>`;
                    li.onclick = () => loadChatHistory(item.filename);
                    groupList.appendChild(li);
                });

                groupElement.appendChild(groupList);
                chatHistoryList.appendChild(groupElement);
            }
        })
        .catch(error => console.error('Error updating chat history:', error));
    }

    function loadChatHistory(filename) {
        fetch(`/chatbot/load-history/${filename}/`)
        .then(response => response.text())
        .then(html => {
            document.getElementById('chat-output').innerHTML = html;
            currentEditingFile = filename;
        })
        .catch(error => console.error('Error:', error));
    }

    function resetSaveTimeout() {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            if (currentEditingFile) {
                saveChatHistory();
            }
        }, 1000);
    }

    userInput.addEventListener('input', resetSaveTimeout);

    updateChatHistoryList();

    const newChatButton = document.getElementById('new-chat-button');

    newChatButton.addEventListener('click', function() {
        // Clear the chat output
        chatOutput.innerHTML = '';
        // Reset the current editing file
        currentEditingFile = null;
        // Reset the last keyword
        lastKeyword = '';
        // Clear the user input
        userInput.value = '';
        // Disable the send button
        sendButton.classList.remove('active');
        sendButton.disabled = true;

        // Add new fetch request to clear session
        fetch('/chatbot/clear-session/', {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCookie('csrftoken'),
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Optionally, you can add a welcome message here
                appendChatbotMessage("こんにちは！どのようなお手伝いができますか？");
            }
        })
        .catch(error => console.error('Error clearing session:', error));
    });
});

function appendChatbotMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.className = 'chatbot-message';
    messageElement.textContent = message;
    chatOutput.appendChild(messageElement);
    chatOutput.scrollTop = chatOutput.scrollHeight;
}
