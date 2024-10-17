from django.conf import settings
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from django.db.models import Sum, F, Prefetch, Count, Avg
from django.shortcuts import render, get_object_or_404
from django.utils.html import escape

import os
import pandas as pd
from datetime import datetime
import re

from .models import MasterErrorLog, ErrorLog, ErrorStatistics, User


def error_log_visualization(request):
    return render(request, "errorlog/error_log.html")


@api_view(["GET"])
def import_error_log(request):
    try:
        error_log_folder = os.path.join(settings.BASE_DIR, "data", "error_logs")
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

            # Get or create user
            user_name = df["user_name"].iloc[0] if "user_name" in df.columns else None
            user = None
            if user_name:
                user, _ = User.objects.get_or_create(user_name=user_name)

            # Create or update MasterErrorLog
            master_error_log, created = MasterErrorLog.objects.update_or_create(
                filename=xlsx_file,
                defaults={
                    "business": business,
                    "note": note,
                    "operation_time": operation_time,
                    "total_operations": total_operations,
                    "user": user,
                },
            )

            # Delete existing ErrorLog entries for this MasterErrorLog
            ErrorLog.objects.filter(master_error_log=master_error_log).delete()

            actions = []
            captured_images = []  # Thêm danh sách để lưu các capimg tương ứng
            current_win_title = None

            for _, row in df.iterrows():
                error_log_data = {
                    "master_error_log": master_error_log,
                    "time": None,
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
                if current_win_title is None:
                    current_win_title = row["win_title"]

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
                    win_title = row["win_title"]
                    # Thêm `explanation` và `capimg` hiện tại trước khi lưu
                    if pd.notna(row["explanation"]):
                        actions.append(row["explanation"])
                    if pd.notna(row["capimg"]):
                        captured_images.append(row["capimg"])
                    actions_str = ",".join(actions)
                    images_str = ",".join(captured_images)

                    # Check if the actions sequence already exists for the same error_type and win_title
                    existing_stat = ErrorStatistics.objects.filter(
                        master_error_log=master_error_log,
                        error_type=key,
                        actions_before_error=actions_str,
                        win_title=win_title,
                    ).first()

                    if existing_stat:
                        # Increment the occurrence count and add the user
                        existing_stat.occurrence_count += 1
                        existing_stat.save()
                        if row["user_name"]:
                            user, _ = User.objects.get_or_create(
                                user_name=row["user_name"]
                            )
                            existing_stat.users.add(user)
                    else:
                        # Create a new ErrorStatistics record
                        error_stat = ErrorStatistics.objects.create(
                            master_error_log=master_error_log,
                            error_type=key,
                            occurrence_count=1,
                            actions_before_error=actions_str,
                            captured_images=images_str,
                            win_title=win_title,
                        )
                        if row["user_name"]:
                            user, _ = User.objects.get_or_create(
                                user_name=row["user_name"]
                            )
                            error_stat.users.add(user)

                    # Reset actions for the next error_type
                    actions = []
                    captured_images = []

                if current_win_title != row["win_title"]:
                    current_win_title = row["win_title"]
                    actions = []
                    captured_images = []

                if pd.notna(row["explanation"]):
                    actions.append(row["explanation"])
                if pd.notna(row["capimg"]):
                    captured_images.append(row["capimg"])

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


@api_view(["GET"])
def error_type_statistics(request):
    error_stats = (
        ErrorStatistics.objects.values("error_type")
        .annotate(total_occurrences=Sum("occurrence_count"))
        .order_by("-total_occurrences")[:10]
    )
    return Response(error_stats)


@api_view(["GET"])
def user_error_statistics(request, user_name=None):
    all_error_types = ErrorStatistics.objects.values_list(
        "error_type", flat=True
    ).distinct()

    if user_name:
        # Logic cho radar chart
        user_errors = (
            ErrorStatistics.objects.filter(users__user_name=user_name)
            .values("error_type")
            .annotate(error_count=Sum("occurrence_count"))
        )
        user_error_dict = {
            item["error_type"]: item["error_count"] for item in user_errors
        }
        result = [
            {
                "error_type": error_type,
                "error_count": user_error_dict.get(error_type, 0),
            }
            for error_type in all_error_types
        ]
    else:
        # Logic cho bubble chart
        user_error_counts = ErrorStatistics.objects.values("users").annotate(
            total_errors=Sum("occurrence_count")
        )

        error_distribution = {}
        for item in user_error_counts:
            total_errors = item["total_errors"]
            if total_errors in error_distribution:
                error_distribution[total_errors] += 1
            else:
                error_distribution[total_errors] = 1

        result = [
            {"error_count": error_count, "user_count": user_count}
            for error_count, user_count in error_distribution.items()
        ]

        result.sort(key=lambda x: x["error_count"])

    return Response(result)


@api_view(["GET"])
def get_users(request):
    users = User.objects.all().values("id", "user_name")
    return Response(users)


@api_view(["GET"])
def all_error_types(request):
    error_types = ErrorStatistics.objects.values_list(
        "error_type", flat=True
    ).distinct()
    return Response(list(error_types))


@api_view(["GET"])
def error_details(request, error_type):
    error_details = (
        ErrorStatistics.objects.filter(error_type=error_type)
        .annotate(
            filename=F("master_error_log__filename"), user_name=F("users__user_name")
        )
        .values(
            "filename",
            "user_name",
            "win_title",
            "occurrence_count",
            "actions_before_error",
        )
    )
    return Response(list(error_details))


@api_view(["GET"])
def summarized_error_logs(request):
    try:
        error_stats = (
            ErrorStatistics.objects.prefetch_related(
                Prefetch("users", queryset=User.objects.only("id", "user_name"))
            )
            .values("error_type", "actions_before_error")
            .annotate(total_occurrences=Sum("occurrence_count"))
            .order_by("-total_occurrences")
        )

        result = []
        for stat in error_stats:
            error_stat_entries = ErrorStatistics.objects.filter(
                error_type=stat["error_type"],
                actions_before_error=stat["actions_before_error"],
            ).prefetch_related("users")

            user_ids = set()
            user_names = set()
            for error_stat in error_stat_entries:
                user_ids.update(error_stat.users.values_list("id", flat=True))
                user_names.update(error_stat.users.values_list("user_name", flat=True))

            result.append(
                {
                    "error_type": stat["error_type"],
                    "total_occurrences": stat["total_occurrences"],
                    "actions_before_error": stat["actions_before_error"],
                    "user_ids": ", ".join(user_names),
                }
            )

        return Response(result, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# View to render the error search page
def error_search(request):
    return render(request, "errorlog/error_search.html")


@api_view(["GET"])
def search_error_flow(request):
    search_user = request.GET.get("user", "")
    error_type = request.GET.get("error_type", "")

    try:
        # Fetch all users whose name contains the search_user string
        users = User.objects.filter(user_name__icontains=search_user)
        if not users.exists():
            return Response(
                {"error": "User not found"}, status=status.HTTP_404_NOT_FOUND
            )

        # Search in ErrorStatistics based on all users and error type
        error_stats = ErrorStatistics.objects.filter(
            users__in=users, error_type=error_type
        ).all()

        if not error_stats.exists():
            return Response(
                {"error": "Error statistics not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Prepare data for all error_stats
        all_flows = []
        for error_stat in error_stats:
            try:
                master_log = MasterErrorLog.objects.get(id=error_stat.master_error_log.id)
            except MasterErrorLog.DoesNotExist:
                continue  # Bỏ qua error_stat này nếu không tìm thấy MasterErrorLog

            actions = error_stat.actions_before_error.split(",")
            images = error_stat.captured_images.split(",")
            flow = [
                {
                    "explanation": action,
                    "capimg": os.path.join(master_log.business, master_log.note[:-3], image),
                    "user_name": error_stat.users.first().user_name,  # Get first user name
                    "time": error_stat.master_error_log.error_entries.first().time,  # Get the time from first log entry
                }
                for action, image in zip(actions, images)
            ]
            all_flows.append(flow)

        return Response(all_flows)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
def summary_data(request):
    try:
        total_errors = ErrorStatistics.objects.aggregate(Sum("occurrence_count"))[
            "occurrence_count__sum"
        ]
        total_users_with_errors = (
            User.objects.filter(errorstatistics__isnull=False).distinct().count()
        )
        average_errors_per_user = (
            ErrorStatistics.objects.values("users")
            .annotate(error_count=Sum("occurrence_count"))
            .aggregate(Avg("error_count"))["error_count__avg"]
        )

        return Response(
            {
                "total_errors": total_errors,
                "total_users_with_errors": total_users_with_errors,
                "average_errors_per_user": average_errors_per_user or 0,
            }
        )
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
def error_detail(request, error_type):
    # Lấy actions_before_error từ request
    actions_before_error = request.GET.get("actions_before_error", "")

    # Tìm ErrorStatistics dựa trên error_type và actions_before_error
    error_stat = ErrorStatistics.objects.filter(
        error_type=error_type, actions_before_error=actions_before_error
    ).first()

    if not error_stat:
        return Response({"error": "ErrorStatistics not found"}, status=404)

    master_error_log = error_stat.master_error_log
    win_title = error_stat.win_title

    # Lấy thông tin từ MasterErrorLog
    try:
        master_log = MasterErrorLog.objects.get(id=master_error_log.id)
    except MasterErrorLog.DoesNotExist:
        return Response({"error": "MasterErrorLog not found"}, status=404)

    # Lấy tất cả các ErrorLog liên quan đến master_log và win_title
    log_entries = ErrorLog.objects.filter(
        master_error_log=master_error_log, win_title=win_title
    ).order_by("time")

    error_steps = []
    recovery_steps = []
    is_error_phase = True
    last_error_action = None
    for entry in log_entries:
        if is_error_phase:
            if entry.error_type == error_type:
                is_error_phase = False
            else:
                last_error_action = entry.explanation
                image_path = os.path.join(
                    master_log.business, master_log.note.strip()[:-3], entry.capimg
                )
                step = {"capimg": image_path, "explanation": escape(entry.explanation)}
                error_steps.append(step)
        else:
            image_path = os.path.join(
                master_log.business, master_log.note.strip()[:-3], entry.capimg
            )
            step = {"capimg": image_path, "explanation": escape(entry.explanation)}
            if are_actions_similar(last_error_action, entry.explanation):
                recovery_steps.append(step)
                break
            recovery_steps.append(step)

    return Response(
        {
            "error_type": error_type,
            "error_steps": error_steps,
            "recovery_steps": recovery_steps,
        }
    )


def are_actions_similar(action1, action2):
    # Extract the parts inside 「」
    parts1 = re.findall(r"「(.+?)」", action1)
    parts2 = re.findall(r"「(.+?)」", action2)

    # If the number of parts is different, they are not similar
    if len(parts1) != len(parts2):
        return False

    # Compare all parts except the second one (index 1)
    for i in range(len(parts1)):
        if i != 1 and parts1[i] != parts2[i]:
            return False

    return True
