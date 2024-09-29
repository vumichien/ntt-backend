from django.conf import settings
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from django.db.models import Sum, F, Prefetch
from django.shortcuts import render

import os
import pandas as pd
from datetime import datetime

from .models import MasterErrorLog, ErrorLog, ErrorStatistics, User


def error_log_visualization(request):
    return render(request, 'errorlog/error_log.html')

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
                    actions_str = ",".join(actions)

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
                            win_title=win_title,
                        )
                        if row["user_name"]:
                            user, _ = User.objects.get_or_create(
                                user_name=row["user_name"]
                            )
                            error_stat.users.add(user)

                    # Reset actions for the next error_type
                    actions = []

                if current_win_title != row["win_title"]:
                    current_win_title = row["win_title"]
                    actions = []

                if pd.notna(row["explanation"]):
                    actions.append(row["explanation"])

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
        query = (
            User.objects.annotate(error_count=Sum("errorstatistics__occurrence_count"))
            .values("user_name", "error_count")
            .order_by("-error_count")[:10]
        )
        result = [
            {"user_name": item["user_name"], "error_count": item["error_count"] or 0}
            for item in query
        ]

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
