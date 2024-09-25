from django.urls import path
from . import views

urlpatterns = [
    path("process-logs/", views.process_log_files, name="process_logs"),
    path("master-logs/", views.get_master_logs, name="master_logs"),
    path("log-entries/<int:master_log_id>/", views.get_log_entries, name="log_entries"),
    path("search_logs/", views.search_logs, name="search_logs"),
    path("log-details/<int:log_id>/", views.get_log_details, name="log_details"),
    path("get_log_info/<int:log_id>/", views.get_log_info, name="get_log_info"),
    path("import-error-log/", views.import_error_log, name="import_error_log"),
    path(
        "aggregate-error-statistics/",
        views.aggregate_error_statistics,
        name="aggregate_error_statistics",
    ),
    path(
        "error_type_statistics/",
        views.error_type_statistics,
        name="error_type_statistics",
    ),
    path(
        "user_error_statistics/",
        views.user_error_statistics,
        name="user_error_statistics",
    ),
    path(
        "user_error_statistics/<str:user_name>/",
        views.user_error_statistics,
        name="user_error_statistics_filtered",
    ),
    path("users/", views.get_users, name="get_users"),
    path("error_details/<str:error_type>/", views.error_details, name="error_details"),
    path("all_error_types/", views.all_error_types, name="all_error_types"),
    path(
        "summarized_error_logs/",
        views.summarized_error_logs,
        name="summarized_error_logs",
    ),
]
