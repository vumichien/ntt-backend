from django.urls import path
from . import views

urlpatterns = [
    path('process-logs/', views.process_log_files, name='process_logs'),
    path('master-logs/', views.get_master_logs, name='master_logs'),
    path('log-entries/<int:master_log_id>/', views.get_log_entries, name='log_entries'),
    path('search_logs/', views.search_logs, name='search_logs'),
    path('log-details/<int:log_id>/', views.get_log_details, name='log_details'),
    path('get_log_info/<int:log_id>/', views.get_log_info, name='get_log_info'),
    path('import-error-log/', views.import_error_log, name='import_error_log'),
    path('aggregate-error-statistics/', views.aggregate_error_statistics, name='aggregate_error_statistics'),
]