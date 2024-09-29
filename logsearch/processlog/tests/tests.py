from django.test import TestCase, Client
from django.urls import reverse
from processlog.models import MasterLog, LogEntry
from rest_framework import status
import json
from django.utils import timezone
from datetime import datetime


class ProcessLogViewsTestCase(TestCase):
    def setUp(self):
        self.client = Client()
        self.master_log = MasterLog.objects.create(
            filename="test.csv",
            note="TestNote",
            business="TestBusiness",
            operation_time="01:00:00",
            total_operations=100,
        )
        self.log_entry = LogEntry.objects.create(
            master_log=self.master_log,
            time=timezone.now(),
            type="TestType",
            user_name="TestUser",
            explanation="TestAction",
            capimg="test_image.png",
        )

    def test_index(self):
        response = self.client.get(reverse("process-log"))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "processlog/process_log.html")

    def test_log_details_view(self):
        response = self.client.get(
            reverse("log_details_view", args=[self.master_log.id])
        )
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "processlog/process_log_details.html")

    def test_search_logs(self):
        url = reverse("search_logs")
        data = {"business": "TestBusiness", "action": "TestAction"}
        response = self.client.post(url, data, content_type="application/json")
        self.assertEqual(response.status_code, 200)
        results = json.loads(response.content)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["business"], "TestBusiness")

    def test_get_log_details(self):
        response = self.client.get(reverse("log_details", args=[self.master_log.id]))
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["explanation"], "TestAction")

    def test_get_log_info(self):
        response = self.client.get(reverse("get_log_info", args=[self.master_log.id]))
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        self.assertEqual(data["total_operations"], 100)
        self.assertEqual(data["operation_time"], "01:00:00")
