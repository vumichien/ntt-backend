from django.db import models

class MasterLog(models.Model):
    filename = models.CharField(max_length=100)
    business = models.CharField(max_length=50, null=True, blank=True)
    operation_time = models.CharField(max_length=8)  # To store "HH:MM:SS"
    total_operations = models.IntegerField()
    note = models.CharField(max_length=100, null=True, blank=True)

    def __str__(self):
        return f"{self.filename} - {self.total_operations} operations"

class LogEntry(models.Model):
    master_log = models.ForeignKey(
        MasterLog, on_delete=models.CASCADE, related_name="entries"
    )
    time = models.DateTimeField(null=True, blank=True)
    type = models.CharField(max_length=50, null=True, blank=True)
    user_name = models.CharField(max_length=255, null=True, blank=True)
    pc_name = models.CharField(max_length=255, null=True, blank=True)
    win_title = models.CharField(max_length=255, null=True, blank=True)
    win_urlpath = models.TextField(null=True, blank=True)
    win_hwnd = models.FloatField(null=True, blank=True)
    win_class = models.CharField(max_length=255, null=True, blank=True)
    app_path = models.CharField(max_length=255, null=True, blank=True)
    app_pid = models.FloatField(null=True, blank=True)
    capimg = models.CharField(max_length=255, null=True, blank=True)
    period = models.FloatField(null=True, blank=True)
    ope_action = models.CharField(max_length=50, null=True, blank=True)
    ope_value = models.TextField(null=True, blank=True)
    ope_boxw = models.FloatField(null=True, blank=True)
    ope_boxh = models.FloatField(null=True, blank=True)
    ope_boxt = models.FloatField(null=True, blank=True)
    ope_boxl = models.FloatField(null=True, blank=True)
    html_type = models.CharField(max_length=50, null=True, blank=True)
    html_tag = models.CharField(max_length=50, null=True, blank=True)
    html_value = models.TextField(null=True, blank=True)
    html_id = models.CharField(max_length=255, null=True, blank=True)
    html_name = models.CharField(max_length=255, null=True, blank=True)
    html_title = models.CharField(max_length=255, null=True, blank=True)
    html_class = models.CharField(max_length=255, null=True, blank=True)
    excel_book = models.CharField(max_length=255, null=True, blank=True)
    excel_sheet = models.CharField(max_length=255, null=True, blank=True)
    excel_cellpos = models.CharField(max_length=50, null=True, blank=True)
    captureChangeFlg = models.BooleanField(null=True, blank=True)
    pastOpeAdjust = models.TextField(null=True, blank=True)
    getlabel = models.TextField(null=True, blank=True)
    plugin = models.CharField(max_length=255, null=True, blank=True)
    explanation = models.TextField(null=True, blank=True)