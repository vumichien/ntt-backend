from django.urls import path
from . import views

urlpatterns = [
    path("", views.chat_interface, name="chat_interface"),
    path("get-response/", views.get_chat_response, name="get_chat_response"),
    path("save-history/", views.save_chat_history, name="save_chat_history"),
    path("get-history/", views.get_chat_history, name="get_chat_history"),
    path(
        "load-history/<str:filename>/",
        views.load_chat_history,
        name="load_chat_history",
    ),
]
