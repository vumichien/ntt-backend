from django.test import TestCase, Client
from django.urls import reverse
from errorlog.models import MasterErrorLog, ErrorLog, ErrorStatistics, User
from rest_framework import status
import json
from django.utils import timezone

class ErrorLogViewsTestCase(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create(user_name="TestUser")
        self.master_error_log = MasterErrorLog.objects.create(
            filename="test.xlsx",
            business="TestBusiness",
            note="TestNote",
            operation_time="01:00:00",
            total_operations=100
        )
        self.error_log = ErrorLog.objects.create(
            master_error_log=self.master_error_log,
            time=timezone.now(),
            error_type="TestError",
            win_title="TestWindow",
            user_name="TestUser"
        )
        self.error_stat = ErrorStatistics.objects.create(
            error_type="TestError",
            occurrence_count=1,
            actions_before_error="Action1,Action2"
        )
        self.error_stat.users.add(self.user)

    def test_error_log_visualization(self):
        response = self.client.get(reverse('error-log'))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'errorlog/error_log.html')

    def test_error_type_statistics(self):
        response = self.client.get(reverse('error-type-statistics'))
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['error_type'], 'TestError')

    def test_user_error_statistics(self):
        response = self.client.get(reverse('user-error-statistics'))
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['user_name'], 'TestUser')

    def test_get_users(self):
        response = self.client.get(reverse('get-users'))
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['user_name'], 'TestUser')

    def test_summarized_error_logs(self):
        response = self.client.get(reverse('summarized-error-logs'))
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['error_type'], 'TestError')
        self.assertEqual(data[0]['total_occurrences'], 1)
