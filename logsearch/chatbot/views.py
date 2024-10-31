import json
import os
import requests
from django.http import JsonResponse
from django.shortcuts import render
import google.cloud.dialogflow_v2 as dialogflow
from django.urls import reverse
from processlog.models import MasterLogInfo
from django.conf import settings
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
import json
from datetime import datetime, timezone, timedelta

# Đường dẫn đến file JSON của Google Dialogflow
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = os.path.join(
    settings.BASE_DIR, "logsearch-438406-3344f6159368.json"
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
            chatbot_message = "手順が見つかりませんでした。他の手順を試してください。"
            # Đặt lại trạng thái đợi từ khóa để người dùng có thể nhập từ khóa mới
            request.session["expecting_keyword"] = True
            return JsonResponse({"message": chatbot_message})

    # Nếu đang chờ câu trả lời từ người dùng cho câu hỏi hiện tại
    if request.session.get("expecting_answer", False):
        questions = request.session.get("questions", [])
        question_index = request.session.get("question_index", 0)
        answers = request.session.get("answers", {})

        # Save the current answer
        answer = user_message
        answers[questions[question_index]["question_id"]] = answer
        request.session["answers"] = answers  # Save answers to session

        # Move to the next question if available
        if question_index < len(questions) - 1:
            question_index += 1
            chatbot_message = f"質問{question_index + 1}: {questions[question_index]['question_text']}"
            request.session["question_index"] = question_index
            return JsonResponse({"message": chatbot_message, "expecting_answer": True})
        else:
            # Ask if the user wants to generate the procedure
            chatbot_message = """
            <div class="chatbot-message-with-buttons">
                <span class="chatbot-text">全ての質問が完了しました。操作を生成しますか？</span>
                <div class="button-container">
                    <button class="yes-button">はい</button>
                    <button class="no-button">いいえ</button>
                </div>
            </div>
            """
            request.session["expecting_answer"] = False
            request.session["awaiting_procedure_confirmation"] = True
            return JsonResponse({"message": chatbot_message, "raw_html": True})

    # Handle procedure confirmation
    if request.session.get("awaiting_procedure_confirmation", False):
        request.session["awaiting_procedure_confirmation"] = False
        if user_message == "はい":
            # Call API to generate procedure
            log_id = request.session.get("selected_log_id")
            generate_procedure_url = request.build_absolute_uri(
                reverse("generate_procedure", args=[log_id])
            )
            response = requests.post(
                generate_procedure_url,
                json={"answers": request.session.get("answers", {})},
            )
            # When API returns procedure
            if response.status_code == 200:
                try:
                    procedure = response.json()

                    # Fetch log info
                    log_info_url = request.build_absolute_uri(
                        reverse("get_log_info", args=[log_id])
                    )
                    log_info_response = requests.get(log_info_url)
                    log_info = (
                        log_info_response.json()
                        if log_info_response.status_code == 200
                        else {}
                    )

                    # Create the header card with log info
                    header_card = f"""
                    <div class="timeline-header-card">
                        <h3>操作手順概要</h3>
                        <p><strong>操作数:</strong> {log_info.get('total_operations', 'N/A')}</p>
                        <p><strong>手順の内容:</strong> {log_info.get('operation_time', 'N/A')}</p>
                    </div>
                    """

                    # Combine header card and timeline
                    timeline_html = header_card + render_procedure_timeline(procedure)

                    return JsonResponse({"timeline": timeline_html})
                except (ValueError, TypeError) as e:
                    print(f"Error in procedure response: {e}")
                    return JsonResponse({"message": "手順を生成できませんでした。"})
            else:
                return JsonResponse({"message": "手順を生成できませんでした。"})
        elif user_message == "いいえ":
            request.session["expecting_keyword"] = True
            return JsonResponse(
                {
                    "message": "どんな手順を知りたいですか？",
                    "expecting_keyword": True,
                }
            )

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
    if "どんな手順を知りたいですか？" in chatbot_message:
        request.session["expecting_keyword"] = True  # Đặt trạng thái đợi từ khóa
        return JsonResponse({"message": chatbot_message, "expecting_keyword": True})

    # Nếu không phải câu hỏi tìm kiếm log, tiếp tục với intent thông thường
    return JsonResponse({"message": chatbot_message})


def render_procedure_timeline(procedure_steps):
    timeline_html = '<div class="chat-timeline">'
    for i, step in enumerate(procedure_steps, start=1):
        step_html = f"""
        <div class="timeline-item">
            <div class="step-number">操作 {i}</div>
            <div class="timeline-content">
                <img src="/media/{step['capimg']}" alt="Captured" class="captured-image">
                <div class="text-content">
                    <p class="explanation">{step['description']}</p>
                </div>
            </div>
        </div>
        """
        timeline_html += step_html

        # Add arrow between items, except for the last item
        if i < len(procedure_steps):
            timeline_html += '<div class="timeline-arrow"></div>'

    timeline_html += "</div>"
    return timeline_html


def generate_procedure(request):
    log_id = request.session.get("selected_log_id")
    answers = request.session.get("answers", {})
    generate_procedure_url = request.build_absolute_uri(
        reverse("generate_procedure", args=[log_id])
    )
    response = requests.post(generate_procedure_url, json={"answers": answers})

    if response.status_code == 200:
        try:
            procedure = response.json()
            timeline_html = render_procedure_timeline(procedure)
            return JsonResponse(
                {"message": "処理が生成されました。", "timeline": timeline_html}
            )
        except (ValueError, TypeError) as e:
            print(f"Error in procedure response: {e}")
            return JsonResponse({"message": "手順を生成できませんでした。"})
    else:
        return JsonResponse({"message": "手順を生成できませんでした。"})


@csrf_exempt
def save_chat_history(request):
    if request.method == "POST":
        data = json.loads(request.body)
        chat_content = data.get("chat_content")
        timestamp = data.get("timestamp")
        keyword = data.get("keyword", "Unknown")
        current_file = data.get("current_file")

        if current_file:
            # Update existing file
            filepath = os.path.join(settings.MEDIA_ROOT, "chat_histories", current_file)
        else:
            # Create new file
            safe_keyword = "".join([c if c.isalnum() else "_" for c in keyword])
            filename = (
                f"{safe_keyword}_{timestamp.replace(':', '-').replace('.', '-')}.html"
            )
            filepath = os.path.join(settings.MEDIA_ROOT, "chat_histories", filename)

        os.makedirs(os.path.dirname(filepath), exist_ok=True)

        with open(filepath, "w", encoding="utf-8") as f:
            f.write(chat_content)

        return JsonResponse({"success": True, "filename": os.path.basename(filepath)})
    return JsonResponse({"success": False})


def get_chat_history(request):
    history_dir = os.path.join(settings.MEDIA_ROOT, "chat_histories")
    files = os.listdir(history_dir)
    history = []
    now = datetime.now(timezone.utc)

    for f in files:
        if f.endswith(".html"):
            try:
                parts = f.split("_")
                keyword = parts[0]
                timestamp_str = "_".join(parts[1:])[:-5]  # Remove .html
                timestamp = datetime.strptime(timestamp_str, "%Y-%m-%dT%H-%M-%S-%fZ")
                timestamp = timestamp.replace(tzinfo=timezone.utc)

                days_ago = (now - timestamp).days

                if days_ago == 0:
                    group = "今日"
                elif days_ago < 7:
                    group = "過去7日間"
                elif days_ago < 30:
                    group = "過去30日間"
                else:
                    group = "30日以上前"

                history.append(
                    {
                        "filename": f,
                        "keyword": keyword,
                        "timestamp": timestamp.isoformat(),
                        "group": group,
                    }
                )
            except Exception as e:
                print(f"Error parsing file {f}: {str(e)}")

    history.sort(key=lambda x: x["timestamp"], reverse=True)
    return JsonResponse({"history": history})


def load_chat_history(request, filename):
    filepath = os.path.join(settings.MEDIA_ROOT, "chat_histories", filename)
    if os.path.exists(filepath):
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
        return HttpResponse(content)
    return HttpResponse("File not found", status=404)
