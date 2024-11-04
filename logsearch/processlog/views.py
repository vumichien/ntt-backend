from django.conf import settings
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from datetime import timedelta
from django.utils import timezone
from django.db.models import Q
import os
import glob
import csv
import re
from django.utils.dateparse import parse_datetime
from django.shortcuts import render
from django.http import HttpResponse, HttpResponseNotFound, JsonResponse
from collections import defaultdict
from .models import MasterLog, LogEntry, MasterLogInfo


def index(
    request,
):
    return render(request, "processlog/process_log.html")


def log_details_view(request, content):
    return render(request, "processlog/process_log_details.html", {"content": content})


@api_view(["POST"])
def search_logs(request):
    search_query = request.data.get("search_query", "")

    # Thực hiện tìm kiếm trong các trường content, procedure_features và data_features của MasterLogInfo
    matching_info = MasterLogInfo.objects.filter(
        Q(content__icontains=search_query)
        | Q(procedure_features__icontains=search_query)
        | Q(data_features__icontains=search_query)
    ).distinct()

    # Lấy các MasterLog liên kết với các MasterLogInfo phù hợp
    master_logs = MasterLog.objects.filter(info__in=matching_info)

    results = []
    for log in master_logs:
        try:
            info = log.info  # Truy cập thông tin từ bảng MasterLogInfo
            results.append(
                {
                    "id": log.id,
                    "filename": log.filename,
                    "note": log.note,
                    "operation_time": log.operation_time,
                    "total_operations": log.total_operations,
                    "content": info.content,
                    "procedure_features": info.procedure_features,
                    "data_features": info.data_features,
                }
            )
        except MasterLogInfo.DoesNotExist:
            # Nếu không có thông tin bổ sung, bỏ qua hoặc trả giá trị mặc định
            results.append(
                {
                    "id": log.id,
                    "filename": log.filename,
                    "note": log.note,
                    "operation_time": log.operation_time,
                    "total_operations": log.total_operations,
                    "content": "N/A",
                    "procedure_features": "N/A",
                    "data_features": "N/A",
                }
            )

    return Response(results)


@api_view(["POST"])
def search_logs_by_content(request):
    search_query = request.data.get("search_query", "")

    # Thực hiện tìm kiếm trong trường 'content' của bảng MasterLogInfo
    matching_logs = MasterLogInfo.objects.filter(
        content__icontains=search_query
    ).select_related("master_log")

    results = []
    for info in matching_logs:
        log = info.master_log  # Lấy log tương ứng từ bảng MasterLog
        results.append(
            {
                "id": log.id,
                "filename": log.filename,
                "note": log.note,
                "operation_time": log.operation_time,
                "total_operations": log.total_operations,
                "content": info.content,
                "procedure_features": info.procedure_features,
                "data_features": info.data_features,
            }
        )

    return Response(results)


@api_view(["GET"])
def get_questions_by_content(request, content):
    try:
        # Lấy một bản ghi đại diện cho content để lấy question_file và template_file
        master_log_info = MasterLogInfo.objects.filter(content=content).first()
        questions = []
        template_steps = []

        # Lấy câu hỏi từ question_file
        if master_log_info and master_log_info.question_file:
            with open(
                master_log_info.question_file.path, newline="", encoding="utf-8"
            ) as csvfile:
                reader = csv.DictReader(csvfile)
                for row in reader:
                    questions.append(
                        {
                            "question_id": row["question_id"],
                            "question_text": row["question_text"],
                        }
                    )

        # Lấy các bước từ template_file
        if master_log_info and master_log_info.template_file:
            with open(
                master_log_info.template_file.path, newline="", encoding="utf-8"
            ) as csvfile:
                reader = csv.DictReader(csvfile)
                for row in reader:
                    template_steps.append(
                        {
                            "step_id": row["step_id"],
                            "description": row["description"],
                            "capimg": row["capimg"],
                            "input_id": row.get(
                                "input_id"
                            ),  # input_id để liên kết với câu hỏi
                        }
                    )

        return Response({"questions": questions, "templateSteps": template_steps})
    except MasterLogInfo.DoesNotExist:
        return Response({"error": "Content not found"}, status=404)


@api_view(["POST"])
def generate_procedure(request, content):
    try:
        # Lấy một bản ghi đầu tiên từ các kết quả trả về để tránh nhân lên
        master_log_info = MasterLogInfo.objects.filter(content=content).first()

        if not master_log_info:
            return Response({"error": "Log not found"}, status=404)

        answers = request.data.get("answers", {})
        steps = []

        # Đọc từ template_file của bản ghi đầu tiên
        if master_log_info.template_file:
            with open(
                master_log_info.template_file.path, newline="", encoding="utf-8"
            ) as csvfile:
                reader = csv.DictReader(csvfile)
                for row in reader:
                    input_id = row.get("input_id")
                    description = row["description"]

                    # Nếu input_id có trong answers, thay thế placeholder
                    if input_id:
                        if input_id in answers:
                            description = description.replace(
                                f"{{{input_id}}}", answers[input_id]
                            )
                        else:
                            # Bỏ qua bước này nếu input_id không nằm trong answers
                            continue

                    steps.append(
                        {
                            "step_id": row["step_id"],
                            "description": description,
                            "capimg": row["capimg"],
                        }
                    )

        return Response(steps)
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(["GET"])
def get_log_details(request, log_id):
    try:
        master_log = MasterLog.objects.get(id=log_id)
        entries = LogEntry.objects.filter(
            master_log=master_log, capimg__isnull=False
        ).order_by("time")

        results = []
        action_time = timedelta()
        first_entry_time = entries.first().time if entries.exists() else None
        run_time = timedelta()

        for entry in entries:
            if first_entry_time:
                run_time = entry.time - first_entry_time
                action_time += run_time
                first_entry_time = entry.time

            # Format action_time and run_time
            action_time_str = f"{action_time.seconds // 3600:02d}:{(action_time.seconds % 3600) // 60:02d}:{action_time.seconds % 60:02d}"
            run_time_sec = run_time.total_seconds()

            results.append(
                {
                    "capimg": f"{master_log.business}/{master_log.note}/{entry.capimg}",
                    "explanation": entry.explanation,
                    "action_time": f"{action_time_str} ({int(run_time_sec)} sec)",
                }
            )

        return Response(results)
    except MasterLog.DoesNotExist:
        return Response({"error": "Log not found"}, status=status.HTTP_404_NOT_FOUND)


@api_view(["GET"])
def import_process_log(request):
    log_folder = os.path.join(settings.BASE_DIR, "data", "process_logs")

    # Dictionary để lưu trữ info_id tương ứng với từng filename trong log_info.csv
    log_info_map = {}

    # Bước 1: Nhập thông tin từ file log_info.csv để tạo MasterLogInfo và lưu info_id cho từng filename
    info_file = os.path.join(log_folder, "log_info.csv")
    with open(info_file, "r", encoding="utf-8") as file:
        csv_reader = csv.DictReader(file)

        for row in csv_reader:
            filename = row["filename"]
            content = row["content"]
            procedure_features = row["procedure_features"]
            data_features = row["data_features"]
            document_name = row["document_name"]
            page_number = row["page_number"]
            document_content = row["document_content"]

            # Tìm file question và template dựa trên content
            question_file = os.path.join(
                log_folder, "questions", f"{content}_question.csv"
            )
            template_file = os.path.join(
                log_folder, "templates", f"{content}_template.csv"
            )

            question_file_path = (
                question_file if os.path.exists(question_file) else None
            )
            template_file_path = (
                template_file if os.path.exists(template_file) else None
            )

            # Tạo một bản ghi mới trong MasterLogInfo và lưu lại info_id và filename
            master_log_info = MasterLogInfo.objects.create(
                content=content,
                procedure_features=procedure_features,
                data_features=data_features,
                question_file=question_file_path,
                template_file=template_file_path,
                document_name=document_name,
                page_number=page_number,
                document_content=document_content,
            )

            # Lưu lại info_id của MasterLogInfo mới tạo cho filename này
            log_info_map[filename] = master_log_info.id

    # Bước 2: Nhập các file log chi tiết và tạo MasterLog với info_id tương ứng từ log_info_map
    csv_files = glob.glob(os.path.join(log_folder, "*", "*", "*.log.csv"))
    for csv_file in csv_files:
        # Extract filename without prefix and extension
        filename_full = os.path.basename(csv_file)
        match = re.search(r"(bdot\d+_\d+)", filename_full)
        if match:
            filename = match.group(1)
        else:
            continue  # Skip this file if it doesn't match the expected pattern

        # Load info_id từ log_info_map
        info_id = log_info_map.get(filename)
        if not info_id:
            continue  # Skip if there's no matching info_id for this filename in log_info_map

        # Load additional details for MasterLog
        path_parts = csv_file.split(os.path.sep)
        business = path_parts[-3]
        note = path_parts[-2]

        # Tìm file history dựa trên filename cho mỗi MasterLog
        history_file = os.path.join(log_folder, "histories", f"{filename}_history.csv")
        history_file_path = history_file if os.path.exists(history_file) else None

        # Tạo hoặc cập nhật MasterLog với info_id từ log_info_map
        with open(csv_file, "r", encoding="utf-8") as file:
            csv_reader = csv.DictReader(file)
            rows = list(csv_reader)

        if not rows:
            continue

        def parse_and_make_aware(time_str):
            parsed_time = parse_datetime(time_str)
            if parsed_time is None:
                return None
            if timezone.is_naive(parsed_time):
                return timezone.make_aware(parsed_time)
            return parsed_time

        first_timestamp = parse_and_make_aware(rows[0]["time"])
        last_timestamp = parse_and_make_aware(rows[-1]["time"])

        if first_timestamp and last_timestamp:
            operation_time_delta = last_timestamp - first_timestamp
            hours, remainder = divmod(operation_time_delta.total_seconds(), 3600)
            minutes, seconds = divmod(remainder, 60)
            operation_time = f"{int(hours):02d}:{int(minutes):02d}:{int(seconds):02d}"
        else:
            operation_time = "00:00:00"

        total_operations = len(rows)

        # Tạo hoặc cập nhật MasterLog và liên kết với MasterLogInfo
        master_log, created = MasterLog.objects.update_or_create(
            filename=filename,
            defaults={
                "info_id": info_id,  # Liên kết với MasterLogInfo dựa trên filename
                "business": business,
                "operation_time": operation_time,
                "total_operations": total_operations,
                "note": note,
                "history_file": history_file_path,
            },
        )

        # Clear existing LogEntries for this master_log
        LogEntry.objects.filter(master_log=master_log).delete()

        valid_fields = [
            f.name
            for f in LogEntry._meta.get_fields()
            if f.name != "id" and f.name != "master_log"
        ]

        for row in rows:
            entry_data = {
                key: (value if value != "" else None)
                for key, value in row.items()
                if key in valid_fields
            }

            if "time" in entry_data and entry_data["time"]:
                entry_data["time"] = parse_and_make_aware(entry_data["time"])

            # Convert numeric fields to float
            numeric_fields = [
                "win_hwnd",
                "app_pid",
                "ope_boxw",
                "ope_boxh",
                "ope_boxt",
                "ope_boxl",
                "period",
            ]
            for field in numeric_fields:
                if field in entry_data and entry_data[field]:
                    try:
                        entry_data[field] = float(entry_data[field])
                    except ValueError:
                        entry_data[field] = None

            if "captureChangeFlg" in entry_data:
                entry_data["captureChangeFlg"] = (
                    entry_data["captureChangeFlg"] == "True"
                    if entry_data["captureChangeFlg"]
                    else None
                )

            LogEntry.objects.create(master_log=master_log, **entry_data)

    return Response(
        {"message": "CSV files processed successfully"}, status=status.HTTP_200_OK
    )


@api_view(["GET"])
def get_master_logs(request):
    master_logs = MasterLog.objects.all()
    data = [
        {
            "id": log.id,
            "filename": log.filename,
            "operation_time": log.operation_time,
            "total_operations": log.total_operations,
            "business": log.business,
            "note": log.note,
        }
        for log in master_logs
    ]
    return Response(data)


@api_view(["GET"])
def get_log_entries(request, master_log_id):
    try:
        master_log = MasterLog.objects.get(id=master_log_id)
        entries = LogEntry.objects.filter(
            master_log=master_log, capimg__isnull=False
        ).order_by("time")

        def format_time(time):
            if time:
                # Convert to local time
                local_time = timezone.localtime(time)
                # Format as "YYYY-MM-DD HH:MM:SS"
                return local_time.strftime("%Y-%m-%d %H:%M:%S")
            return None

        data = [
            {
                "id": entry.id,
                "time": format_time(entry.time),
                "type": entry.type,
                "user_name": entry.user_name,
                "pc_name": entry.pc_name,
                "win_title": entry.win_title,
                "win_urlpath": entry.win_urlpath,
                "win_hwnd": entry.win_hwnd,
                "win_class": entry.win_class,
                "app_path": entry.app_path,
                "app_pid": entry.app_pid,
                "capimg": entry.capimg,
                "period": entry.period,
                "ope_action": entry.ope_action,
                "ope_value": entry.ope_value,
                "ope_boxw": entry.ope_boxw,
                "ope_boxh": entry.ope_boxh,
                "ope_boxt": entry.ope_boxt,
                "ope_boxl": entry.ope_boxl,
                "html_type": entry.html_type,
                "html_tag": entry.html_tag,
                "html_value": entry.html_value,
                "html_id": entry.html_id,
                "html_name": entry.html_name,
                "html_title": entry.html_title,
                "html_class": entry.html_class,
                "excel_book": entry.excel_book,
                "excel_sheet": entry.excel_sheet,
                "excel_cellpos": entry.excel_cellpos,
                "captureChangeFlg": entry.captureChangeFlg,
                "pastOpeAdjust": entry.pastOpeAdjust,
                "getlabel": entry.getlabel,
                "plugin": entry.plugin,
                "explanation": entry.explanation,
            }
            for entry in entries
        ]
        return Response(data)
    except MasterLog.DoesNotExist:
        return Response(
            {"error": "MasterLog not found"}, status=status.HTTP_404_NOT_FOUND
        )


@api_view(["GET"])
def get_log_info(request, content):
    try:
        # Lấy tất cả các bản ghi MasterLogInfo có content khớp
        master_log_infos = MasterLogInfo.objects.filter(content=content)

        # Kiểm tra nếu có bản ghi nào, nếu không trả về lỗi
        if not master_log_infos.exists():
            return JsonResponse({"error": "Log not found"}, status=404)

        total_operations = 0
        # Duyệt qua từng bản ghi MasterLogInfo để đếm số bước từ template_file của từng bản ghi
        for master_log_info in master_log_infos:
            if master_log_info.template_file:
                with open(
                    master_log_info.template_file.path, newline="", encoding="utf-8"
                ) as csvfile:
                    reader = csv.DictReader(csvfile)
                    total_operations += sum(1 for row in reader)

        # Chỉ lấy `content` từ bản ghi đầu tiên
        procedure_content = master_log_infos.first().content

        return JsonResponse(
            {
                "total_operations": total_operations,
                "procedure_content": procedure_content,
            }
        )

    except MasterLogInfo.DoesNotExist:
        return JsonResponse({"error": "Log not found"}, status=404)


@api_view(["POST"])
def get_history_inputs(request):
    # Lấy danh sách các `master_log_id` từ request
    selected_master_log_ids = request.data.get("selected_master_log_ids", [])
    inputs_summary = []

    # Duyệt qua từng `master_log_id` và lấy dữ liệu từ `history_file`
    for log_id in selected_master_log_ids:
        try:
            master_log = MasterLog.objects.get(id=log_id)
            if master_log.history_file and master_log.history_file.path:
                history_file_path = master_log.history_file.path

                if os.path.exists(history_file_path):
                    with open(history_file_path, "r", encoding="utf-8") as file:
                        reader = csv.DictReader(file)
                        file_inputs = {"filename": master_log.filename, "inputs": []}

                        fields_before_button = (
                            []
                        )  # Danh sách các `field_name` trước khi gặp nút nhấn
                        # Đọc từng dòng trong file và trích xuất input dựa trên `input_id`
                        for row in reader:
                            input_id = row.get("input_id")
                            description = row.get("description")

                            # Kiểm tra nếu có pattern "XXを押下する" trong description
                            button_match = re.search(r"(.+?)を押下する", description)
                            if button_match:
                                # Nếu tìm thấy, thêm các `field_name` từ các bước trước đó vào file_inputs
                                button_label = button_match.group(1)
                                file_inputs["inputs"].append(
                                    {
                                        "check_label": f"{button_label}前のチェック項目",
                                        "fields": fields_before_button.copy(),  # Sao chép các trường trước nút nhấn
                                    }
                                )
                                # Reset lại fields_before_button sau khi thêm
                                fields_before_button.clear()
                            else:
                                # Nếu không phải nút nhấn, kiểm tra và thêm các giá trị input vào `fields_before_button`
                                match = re.search(
                                    r"「(.*?)」へ「(.*?)」を(入力|選択)する",
                                    description,
                                )
                                if match:
                                    field_name = match.group(
                                        1
                                    )  # Tên trường, ví dụ: レポートID
                                    input_value = match.group(
                                        2
                                    )  # Giá trị input, ví dụ: MDL-700
                                    file_inputs["inputs"].append(
                                        {
                                            "field_name": field_name,
                                            "input_value": input_value,
                                        }
                                    )
                                    # Thêm `field_name` vào danh sách trước khi nhấn nút
                                    fields_before_button.append(field_name)

                        inputs_summary.append(file_inputs)

        except MasterLog.DoesNotExist:
            continue

    # Trả về kết quả dưới dạng JSON
    return Response(inputs_summary)


@api_view(["GET"])
def get_manual_info(request, content):
    try:
        manual_info = MasterLogInfo.objects.filter(content=content).first()
        if manual_info:
            document_content = manual_info.document_content

            # Kiểm tra nếu document_content là ảnh dựa trên đuôi file
            if document_content and document_content.lower().endswith(
                (".jpg", ".jpeg", ".png", ".gif")
            ):
                document_content = request.build_absolute_uri(
                    settings.MEDIA_URL + document_content
                )

            data = {
                "document_name": manual_info.document_name,
                "page_number": manual_info.page_number,
                "document_content": document_content,
            }
            return Response(data)
        return Response({"error": "No manual info found"}, status=404)
    except MasterLogInfo.DoesNotExist:
        return Response({"error": "Content not found"}, status=404)
