import json
import os
from django.http import JsonResponse
from django.shortcuts import render
import google.cloud.dialogflow_v2 as dialogflow

# Đường dẫn chính xác đến file JSON của bạn
os.environ[
    "GOOGLE_APPLICATION_CREDENTIALS"] = r"C:\work\logsearch\ntt-backend\logsearch\logsearch-438406-3344f6159368.json"


def chat_interface(request):
    return render(request, 'chatbot/chat_interface.html')


def get_chat_response(request):
    # Lấy tin nhắn từ user
    user_message = json.loads(request.body).get('message')

    # Tạo client session để gửi đến Dialogflow
    session_client = dialogflow.SessionsClient()

    # project_id từ file JSON của bạn
    project_id = "logsearch-438406"
    session_id = "12345"  # Bạn có thể thay thế session_id tùy theo user session của bạn
    session = session_client.session_path(project_id, session_id)

    # Chuẩn bị text input từ người dùng
    text_input = dialogflow.types.TextInput(text=user_message, language_code="ja")  # Ngôn ngữ tiếng Nhật

    # Tạo query input
    query_input = dialogflow.types.QueryInput(text=text_input)

    # Gửi yêu cầu đến Dialogflow
    response = session_client.detect_intent(session=session, query_input=query_input)

    # Lấy phản hồi từ Dialogflow
    chatbot_message = response.query_result.fulfillment_text

    # Trả về phản hồi cho frontend
    return JsonResponse({'message': chatbot_message})
