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
from django.http import HttpResponse, HttpResponseNotFound
from .models import MasterLog, LogEntry


def index(
    request,
):
    return render(request, "processlog/process_log.html")


def log_details_view(request, log_id):
    return render(request, "processlog/process_log_details.html", {"log_id": log_id})


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
def import_process_log(request):
    log_folder = os.path.join(settings.BASE_DIR, "data", "process_logs")
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
