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

    function sendMessage() {
        const message = userInput.value;
        if (message.trim() !== '') {
            appendUserMessage(message);
            userInput.value = '';
            sendButton.classList.remove('active');
            sendButton.disabled = true;
            userInput.style.height = 'auto';

            fetch('/chatbot/get-response/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken'),
                },
                body: JSON.stringify({ message: message })
            })
            .then(response => response.json())
            .then(data => {
                appendChatbotMessage(data.message);

                if (data.expecting_keyword) {
                    userInput.focus();
                } else if (data.timeline) {
                    appendChatbotMessage("タイムラインが正常に生成されました。");
                    displayTimeline(data.timeline);  // Hiển thị timeline
                }
            })
            .catch(error => console.error('Error:', error));
        }
    }

    function displayTimeline(timelineHtml) {
        const timelineDiv = document.createElement('div');
        timelineDiv.innerHTML = timelineHtml;
        chatOutput.appendChild(timelineDiv);
        chatOutput.scrollTop = chatOutput.scrollHeight;  // Tự động cuộn xuống
    }

    function appendUserMessage(message) {
        const userMessageDiv = document.createElement('div');
        userMessageDiv.className = 'user-message';
        userMessageDiv.textContent = message;
        chatOutput.appendChild(userMessageDiv);
        chatOutput.scrollTop = chatOutput.scrollHeight;
    }

    function appendChatbotMessage(message) {
        const chatbotMessageDiv = document.createElement('div');
        chatbotMessageDiv.className = 'chatbot-message';
        chatbotMessageDiv.textContent = message;
        chatOutput.appendChild(chatbotMessageDiv);
        chatOutput.scrollTop = chatOutput.scrollHeight;
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
