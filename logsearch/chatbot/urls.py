from django.urls import path
from . import views

urlpatterns = [
    path('', views.chat_interface, name='chat_interface'),
    path('get-response/', views.get_chat_response, name='get_chat_response'),
]
