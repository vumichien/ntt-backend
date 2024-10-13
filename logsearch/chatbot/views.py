import json
import os
import requests
from django.http import JsonResponse
from django.shortcuts import render
import google.cloud.dialogflow_v2 as dialogflow
from django.urls import reverse
from processlog.models import MasterLogInfo

# Đường dẫn đến file JSON của Google Dialogflow
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = (
    r"C:\work\logsearch\ntt-backend\logsearch\logsearch-438406-3344f6159368.json"
)


def chat_interface(request):
    return render(request, "chatbot/chat_interface.html")


def get_chat_response(request):
    user_message = json.loads(request.body).get("message")

    # Kiểm tra nếu chatbot đang đợi từ khóa mới sau khi từ khóa trước không tìm thấy log
    if request.session.get("expecting_keyword", False):
        # Đoạn này xử lý tìm kiếm log dựa vào từ khóa
        search_query = user_message
        request.session["expecting_keyword"] = False  # Reset trạng thái đợi từ khóa

        # Gọi API search_logs_by_content để tìm log dựa trên từ khóa
        logs = MasterLogInfo.objects.filter(
            content__icontains=search_query
        ).select_related("master_log")
        if logs.exists():
            log = logs.first().master_log
            log_id = log.id
            request.session["selected_log_id"] = log_id  # Lưu log_id vào session

            # Gọi API get_questions để lấy danh sách câu hỏi
            get_questions_url = request.build_absolute_uri(
                reverse("get_questions", args=[log_id])
            )
            response = requests.get(get_questions_url)
            if response.status_code == 200:
                questions = response.json()

                if questions:
                    chatbot_message = f"質問1: {questions[0]['question_text']}"
                    request.session["questions"] = questions  # Lưu danh sách câu hỏi
                    request.session["question_index"] = (
                        0  # Lưu index của câu hỏi hiện tại
                    )
                    request.session["expecting_answer"] = (
                        True  # Đặt trạng thái đang đợi câu trả lời
                    )
                    return JsonResponse(
                        {"message": chatbot_message, "expecting_answer": True}
                    )
            else:
                chatbot_message = "質問を取得できませんでした。もう一度お試しください。"
                return JsonResponse({"message": chatbot_message})
        else:
            chatbot_message = (
                "ログが見つかりませんでした。他のキーワードを試してください。"
            )
            # Đặt lại trạng thái đợi từ khóa để người dùng có thể nhập từ khóa mới
            request.session["expecting_keyword"] = True
            return JsonResponse({"message": chatbot_message})

    # Nếu đang chờ câu trả lời từ người dùng cho câu hỏi hiện tại
    if request.session.get("expecting_answer", False):
        questions = request.session.get("questions", [])
        question_index = request.session.get("question_index", 0)
        answers = request.session.get("answers", {})

        # Lưu câu trả lời hiện tại
        answer = user_message
        answers[questions[question_index]["question_id"]] = answer
        request.session["answers"] = answers  # Lưu câu trả lời vào session

        # Chuyển sang câu hỏi tiếp theo nếu có
        if question_index < len(questions) - 1:
            question_index += 1
            chatbot_message = f"質問{question_index + 1}: {questions[question_index]['question_text']}"
            request.session["question_index"] = question_index
            return JsonResponse({"message": chatbot_message, "expecting_answer": True})
        else:
            chatbot_message = "全ての質問が完了しました。処理を生成しています..."
            request.session["expecting_answer"] = (
                False  # Kết thúc trạng thái đợi câu trả lời
            )

            # Gọi API generate_procedure để tạo quy trình
            log_id = request.session.get("selected_log_id")
            generate_procedure_url = request.build_absolute_uri(
                reverse("generate_procedure", args=[log_id])
            )
            response = requests.post(generate_procedure_url, json={"answers": answers})
            # Khi API trả về procedure
            if response.status_code == 200:
                try:
                    procedure = response.json()  # Đảm bảo đây là list của các dict
                    timeline_html = render_procedure_timeline(procedure)
                    return JsonResponse(
                        {"message": chatbot_message, "timeline": timeline_html}
                    )
                except (ValueError, TypeError) as e:
                    print(f"Error in procedure response: {e}")
                    return JsonResponse({"message": "手順を生成できませんでした。"})
            else:
                return JsonResponse({"message": "手順を生成できませんでした。"})

    # Gọi Dialogflow để xử lý intent khác nếu không phải tìm kiếm log
    session_client = dialogflow.SessionsClient()
    project_id = "logsearch-438406"
    session_id = "12345"
    session = session_client.session_path(project_id, session_id)
    text_input = dialogflow.types.TextInput(text=user_message, language_code="ja")
    query_input = dialogflow.types.QueryInput(text=text_input)
    response = session_client.detect_intent(session=session, query_input=query_input)
    chatbot_message = response.query_result.fulfillment_text

    # Nếu phản hồi từ Dialogflow là câu hỏi tìm kiếm log, chuyển sang trạng thái tìm kiếm log
    if "どのキーワードでログを検索したいですか？" in chatbot_message:
        request.session["expecting_keyword"] = True  # Đặt trạng thái đợi từ khóa
        return JsonResponse({"message": chatbot_message, "expecting_keyword": True})

    # Nếu không phải câu hỏi tìm kiếm log, tiếp tục với intent thông thường
    return JsonResponse({"message": chatbot_message})


def render_procedure_timeline(procedure_steps):
    timeline_html = ""
    for step in procedure_steps:
        step_html = f"""
        <div class="timeline-item">
            <div class="timeline-content">
                <img src="/media/{step['capimg']}" alt="Captured" class="captured-image">
                <div class="text-content">
                    <p class="explanation">{step['description']}</p>
                </div>
            </div>
        </div>
        """
        timeline_html += step_html
    return timeline_html
