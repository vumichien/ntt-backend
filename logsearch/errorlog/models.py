from django.db import models

class User(models.Model):
    user_name = models.CharField(max_length=255, unique=True)

    def __str__(self):
        return self.user_name

class MasterErrorLog(models.Model):
    filename = models.CharField(max_length=100)
    business = models.CharField(max_length=50, null=True, blank=True)
    operation_time = models.CharField(max_length=8)  # To store "HH:MM:SS"
    total_operations = models.IntegerField()
    note = models.CharField(max_length=100, null=True, blank=True)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"{self.filename} - {self.total_operations} operations"

class ErrorLog(models.Model):
    master_error_log = models.ForeignKey(
        MasterErrorLog,
        on_delete=models.CASCADE,
        related_name="error_entries",
        null=True,
        blank=True,
    )
    time = models.DateTimeField()
    type = models.CharField(max_length=50, null=True, blank=True)
    user_name = models.CharField(max_length=255, null=True, blank=True)
    pc_name = models.CharField(max_length=255, null=True, blank=True)
    win_title = models.CharField(max_length=255, null=True, blank=True)
    win_urlpath = models.CharField(max_length=255, null=True, blank=True)
    win_hwnd = models.FloatField(null=True, blank=True)
    win_class = models.CharField(max_length=255, null=True, blank=True)
    app_path = models.CharField(max_length=255, null=True, blank=True)
    capimg = models.CharField(max_length=255, null=True, blank=True)
    explanation = models.TextField(null=True, blank=True)
    error_type = models.CharField(max_length=50, null=True, blank=True)
    error_content = models.TextField(null=True, blank=True)

    def __str__(self):
        return f"Error Log - {self.time}"

class ErrorStatistics(models.Model):
    master_error_log = models.ForeignKey(
        MasterErrorLog,
        on_delete=models.CASCADE,
        related_name="error_statistics",
        null=True,
        blank=True,
    )
    error_type = models.CharField(max_length=50)
    occurrence_count = models.IntegerField()
    actions_before_error = models.TextField()
    win_title = models.CharField(max_length=255, null=True, blank=True)
    users = models.ManyToManyField(User)

    def __str__(self):
        return f"{self.error_type} - {self.occurrence_count} occurrences in {self.master_error_log.filename if self.master_error_log else 'Unknown'}"
