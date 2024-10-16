from django.urls import path
from . import views

urlpatterns = [
    path("import-error-log/", views.import_error_log, name="import-error-log"),
    path(
        "aggregate-error-statistics/",
        views.aggregate_error_statistics,
        name="aggregate-error-statistics",
    ),
    path(
        "error-type-statistics/",
        views.error_type_statistics,
        name="error-type-statistics",
    ),
    path(
        "user-error-statistics/",
        views.user_error_statistics,
        name="user-error-statistics",
    ),
    path(
        "user-error-statistics/<str:user_name>/",
        views.user_error_statistics,
        name="user-error-statistics-filtered",
    ),
    path("users/", views.get_users, name="get-users"),
    path("error-details/<str:error_type>/", views.error_details, name="error-details"),
    path("all-error-types/", views.all_error_types, name="all-error-types"),
    path(
        "summarized-error-logs/",
        views.summarized_error_logs,
        name="summarized-error-logs",
    ),
    path(
        "",
        views.error_log_visualization,
        name="error-log",
    ),
    path("error-search/", views.error_search, name="error-search"),
    path("search-flow/", views.search_error_flow, name="search-flow"),
    path("summary-data/", views.summary_data, name="summary_data"),
]
