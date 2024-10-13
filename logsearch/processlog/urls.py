from django.urls import path
from . import views

urlpatterns = [
    path("", views.index, name="process-log"),
    path("import-process-log/", views.import_process_log, name="import_process_log"),
    path("master-logs/", views.get_master_logs, name="master_logs"),
    path("log-entries/<int:master_log_id>/", views.get_log_entries, name="log_entries"),
    path("search-logs/", views.search_logs, name="search_logs"),
    path("search-logs-by-content/", views.search_logs_by_content, name="search_logs_by_content"),
    path("log-details/<int:log_id>/", views.get_log_details, name="log_details"),
    path("get-log-info/<int:log_id>/", views.get_log_info, name="get_log_info"),
    path(
        "log-details-view/<int:log_id>",
        views.log_details_view,
        name="log_details_view",
    ),
    path("get-questions/<int:log_id>/", views.get_questions, name="get_questions"),
    path(
        "generate-procedure/<int:log_id>/",
        views.generate_procedure,
        name="generate_procedure",
    ),
]
