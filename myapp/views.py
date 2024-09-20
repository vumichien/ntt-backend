from .models import MasterLog, LogEntry, ErrorLog, MasterErrorLog, User, ErrorStatistics
from rest_framework.decorators import api_view
from rest_framework.response import Response
from datetime import datetime
from rest_framework import status
import csv
import io
import os
import glob

import re
from datetime import timedelta
from django.utils import timezone
import pandas as pd
from django.db.models import F, Sum, Count, Q
from django.db.models import Value as V
from django.db import models
from django.conf import settings
from django.utils.dateparse import parse_datetime
from collections import defaultdict


@api_view(["POST"])
def search_logs(request):
    business = request.data.get("business", "")
    action = request.data.get("action", "")

    master_logs = MasterLog.objects.filter(Q(business__icontains=business)).distinct()

    if action:
        matching_log_entries = (
            LogEntry.objects.filter(explanation__icontains=action)
            .values("master_log_id")
            .distinct()
        )

        master_logs = master_logs.filter(id__in=matching_log_entries)

    results = []
    for log in master_logs:
        results.append(
            {
                "id": log.id,
                "filename": log.filename,
                "note": log.note,
                "business": log.business,
                "operation_time": log.operation_time,
                "total_operations": log.total_operations,
            }
        )

    return Response(results)


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
def process_log_files(request):
    log_folder = os.path.join(settings.BASE_DIR, "samples")
    csv_files = glob.glob(os.path.join(log_folder, "*", "*", "*.log.csv"))

    for csv_file in csv_files:
        # Extract filename without prefix and extension
        filename_full = os.path.basename(csv_file)
        match = re.search(r"(bdot\d+_\d+)", filename_full)
        if match:
            filename = match.group(1)
        else:
            continue  # Skip this file if it doesn't match the expected pattern

        path_parts = csv_file.split(os.path.sep)
        business = path_parts[-3]
        note = path_parts[-2]

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

        master_log, created = MasterLog.objects.update_or_create(
            filename=filename,
            defaults={
                "business": business,
                "operation_time": operation_time,
                "total_operations": total_operations,
                "note": note,
            },
        )

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
                        # If conversion fails, set to None
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
def hello_world(request):
    return Response({"message": "Hello, world!"})


@api_view(["POST"])
def import_csv(request):
    try:
        # Nhận tệp CSV từ request
        csv_file = request.FILES["file"]

        # Kiểm tra định dạng tệp
        if not csv_file.name.endswith(".csv"):
            return Response(
                {"error": "Đây không phải là tệp CSV"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Đọc nội dung tệp CSV
        data_set = csv_file.read().decode("UTF-8")
        io_string = io.StringIO(data_set)
        next(io_string)  # Bỏ qua tiêu đề của tệp CSV

        # Xử lý từng dòng trong CSV
        for row in csv.reader(io_string, delimiter=","):
            # Kiểm tra nếu dòng rỗng hoặc không hợp lệ
            if not row or not row[0]:
                continue

            try:
                date = datetime.strptime(row[0], "%Y-%m-%d").date()
            except ValueError:
                continue  # Ignore invalid date format

            a_count = int(row[1]) if row[1] else 0
            b_count = int(row[2]) if row[2] else 0
            c_count = int(row[3]) if row[3] else 0
            # Update or create ClickData objects
            ClickData.objects.update_or_create(
                timestamp=date,
                button="A",
                defaults={"count": a_count},
            )
            ClickData.objects.update_or_create(
                timestamp=date,
                button="B",
                defaults={"count": b_count},
            )
            ClickData.objects.update_or_create(
                timestamp=date,
                button="C",
                defaults={"count": c_count},
            )

        return Response(
            {"message": "CSVファイルからデータが正常にインポートされました"},
            status=status.HTTP_200_OK,
        )

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
def get_log_info(request, log_id):
    try:
        master_log = MasterLog.objects.get(id=log_id)
        return Response(
            {
                "total_operations": master_log.total_operations,
                "operation_time": master_log.operation_time,
            }
        )
    except MasterLog.DoesNotExist:
        return Response({"error": "Log not found"}, status=status.HTTP_404_NOT_FOUND)


@api_view(["GET"])
def import_error_log(request):
    try:
        error_log_folder = os.path.join(settings.BASE_DIR, "error-log")
        xlsx_files = [f for f in os.listdir(error_log_folder) if f.endswith(".xlsx")]

        if not xlsx_files:
            return Response(
                {"error": "No XLSX files found in the error-log folder"},
                status=status.HTTP_404_NOT_FOUND,
            )

        for xlsx_file in xlsx_files:
            file_path = os.path.join(error_log_folder, xlsx_file)
            df = pd.read_excel(file_path)

            # Extract business and note from filename
            filename_parts = os.path.splitext(xlsx_file)[0].split("_")
            business = filename_parts[0]
            note = "_".join(filename_parts[1:])

            # Calculate operation_time and total_operations
            first_time = df["time"].min()
            last_time = df["time"].max()
            operation_time_delta = last_time - first_time
            hours, remainder = divmod(operation_time_delta.total_seconds(), 3600)
            minutes, seconds = divmod(remainder, 60)
            operation_time = f"{int(hours):02d}:{int(minutes):02d}:{int(seconds):02d}"
            total_operations = len(df)

            # Create or update MasterErrorLog
            master_error_log, created = MasterErrorLog.objects.update_or_create(
                filename=xlsx_file,
                defaults={
                    "business": business,
                    "note": note,
                    "operation_time": operation_time,
                    "total_operations": total_operations,
                },
            )

            # Delete existing ErrorLog entries for this MasterErrorLog
            ErrorLog.objects.filter(master_error_log=master_error_log).delete()

            error_stats = defaultdict(
                lambda: {"count": 0, "actions": [], "users": set(), "win_title": set()}
            )

            actions = []
            for _, row in df.iterrows():
                error_log_data = {
                    "master_error_log": master_error_log,
                    "time": None,  # We'll handle this separately
                    "type": row["type"],
                    "user_name": row["user_name"],
                    "pc_name": row["pc_name"],
                    "win_title": row["win_title"],
                    "win_urlpath": row["win_urlpath"],
                    "win_hwnd": row["win_hwnd"],
                    "win_class": row["win_class"],
                    "app_path": row["app_path"],
                    "capimg": row["capimg"],
                    "explanation": row["explanation"],
                    "error_type": row["error_type"],
                    "error_content": row["error_content"],
                }

                # Convert NaN values to None
                error_log_data = {
                    k: (v if pd.notna(v) else None) for k, v in error_log_data.items()
                }

                # Handle the 'time' field separately
                time_value = row["time"]
                if pd.notna(time_value):
                    if isinstance(time_value, str):
                        try:
                            error_log_data["time"] = timezone.make_aware(
                                datetime.fromisoformat(time_value)
                            )
                        except ValueError:
                            # If it's not in ISO format, try parsing it as a timestamp
                            error_log_data["time"] = timezone.make_aware(
                                datetime.fromtimestamp(float(time_value))
                            )
                    elif isinstance(time_value, (int, float)):
                        # If it's a number, treat it as a timestamp
                        error_log_data["time"] = timezone.make_aware(
                            datetime.fromtimestamp(time_value)
                        )
                    else:
                        # If it's already a datetime object
                        error_log_data["time"] = timezone.make_aware(time_value)

                ErrorLog.objects.create(**error_log_data)

                if pd.notna(row["error_type"]):
                    key = row["error_type"]
                    error_stats[key]["count"] += 1
                    error_stats[key]["actions"].append(",".join(actions))
                    error_stats[key]["users"].add(row["user_name"])
                    error_stats[key]["win_title"].add(row["win_title"])
                    actions = []
                elif pd.notna(row["explanation"]):
                    actions.append(row["explanation"])

            # Create or update ErrorStatistics for this MasterErrorLog
            for error_type, stats in error_stats.items():
                error_stat, created = ErrorStatistics.objects.update_or_create(
                    master_error_log=master_error_log,
                    error_type=error_type,
                    defaults={
                        "occurrence_count": stats["count"],
                        "actions_before_error": "\n".join(stats["actions"]),
                        "win_title": ", ".join(stats["win_title"]),
                    },
                )

                # Update users
                for user_name in stats["users"]:
                    user, _ = User.objects.get_or_create(user_name=user_name)
                    error_stat.users.add(user)

        return Response(
            {"message": "Error log data imported and statistics updated successfully"},
            status=status.HTTP_200_OK,
        )

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
def aggregate_error_statistics(request):
    try:
        aggregated_stats = (
            ErrorStatistics.objects.values("error_type", "actions_before_error")
            .annotate(
                total_occurrences=Sum("occurrence_count"),
            )
            .order_by("-total_occurrences")
        )

        result = []
        for stat in aggregated_stats:
            error_stats = ErrorStatistics.objects.filter(
                error_type=stat["error_type"],
                actions_before_error=stat["actions_before_error"],
            )
            win_titles = set()
            user_ids = set()
            for error_stat in error_stats:
                win_titles.add(error_stat.win_title)
                user_ids.update(error_stat.users.values_list("id", flat=True))

            result.append(
                {
                    "error_type": stat["error_type"],
                    "actions_before_error": stat["actions_before_error"],
                    "total_occurrences": stat["total_occurrences"],
                    "win_titles": ", ".join(filter(None, win_titles)),
                    "user_ids": list(user_ids),
                }
            )

        return Response(result, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
