document.addEventListener('DOMContentLoaded', function() {
    const chatOutput = document.getElementById('chat-output');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');

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

    function sendMessage(message = null) {
        const messageToSend = message || userInput.value;
        if (messageToSend.trim() !== '') {
            if (!message) {
                appendUserMessage(messageToSend);
                userInput.value = '';
                sendButton.classList.remove('active');
                sendButton.disabled = true;
                userInput.style.height = 'auto';
            }

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
            .then(data => {
                if (data.message) {
                    if (data.raw_html) {
                        appendChatbotMessage(data.message, true);
                    } else {
                        appendChatbotMessage(data.message);
                    }
                }

                if (data.show_buttons) {
                    displayConfirmationButtons();
                } else if (data.expecting_keyword) {
                    userInput.focus();
                }

                if (data.timeline) {
                    displayTimeline(data.timeline);
                }
            })
            .catch(error => console.error('Error:', error));
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
});
