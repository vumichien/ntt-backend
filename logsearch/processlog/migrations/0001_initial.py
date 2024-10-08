# Generated by Django 5.1 on 2024-09-26 12:03

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="MasterLog",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("filename", models.CharField(max_length=100)),
                ("business", models.CharField(blank=True, max_length=50, null=True)),
                ("operation_time", models.CharField(max_length=8)),
                ("total_operations", models.IntegerField()),
                ("note", models.CharField(blank=True, max_length=100, null=True)),
            ],
        ),
        migrations.CreateModel(
            name="LogEntry",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("time", models.DateTimeField(blank=True, null=True)),
                ("type", models.CharField(blank=True, max_length=50, null=True)),
                ("user_name", models.CharField(blank=True, max_length=255, null=True)),
                ("pc_name", models.CharField(blank=True, max_length=255, null=True)),
                ("win_title", models.CharField(blank=True, max_length=255, null=True)),
                ("win_urlpath", models.TextField(blank=True, null=True)),
                ("win_hwnd", models.FloatField(blank=True, null=True)),
                ("win_class", models.CharField(blank=True, max_length=255, null=True)),
                ("app_path", models.CharField(blank=True, max_length=255, null=True)),
                ("app_pid", models.FloatField(blank=True, null=True)),
                ("capimg", models.CharField(blank=True, max_length=255, null=True)),
                ("period", models.FloatField(blank=True, null=True)),
                ("ope_action", models.CharField(blank=True, max_length=50, null=True)),
                ("ope_value", models.TextField(blank=True, null=True)),
                ("ope_boxw", models.FloatField(blank=True, null=True)),
                ("ope_boxh", models.FloatField(blank=True, null=True)),
                ("ope_boxt", models.FloatField(blank=True, null=True)),
                ("ope_boxl", models.FloatField(blank=True, null=True)),
                ("html_type", models.CharField(blank=True, max_length=50, null=True)),
                ("html_tag", models.CharField(blank=True, max_length=50, null=True)),
                ("html_value", models.TextField(blank=True, null=True)),
                ("html_id", models.CharField(blank=True, max_length=255, null=True)),
                ("html_name", models.CharField(blank=True, max_length=255, null=True)),
                ("html_title", models.CharField(blank=True, max_length=255, null=True)),
                ("html_class", models.CharField(blank=True, max_length=255, null=True)),
                ("excel_book", models.CharField(blank=True, max_length=255, null=True)),
                (
                    "excel_sheet",
                    models.CharField(blank=True, max_length=255, null=True),
                ),
                (
                    "excel_cellpos",
                    models.CharField(blank=True, max_length=50, null=True),
                ),
                ("captureChangeFlg", models.BooleanField(blank=True, null=True)),
                ("pastOpeAdjust", models.TextField(blank=True, null=True)),
                ("getlabel", models.TextField(blank=True, null=True)),
                ("plugin", models.CharField(blank=True, max_length=255, null=True)),
                ("explanation", models.TextField(blank=True, null=True)),
                (
                    "master_log",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="entries",
                        to="processlog.masterlog",
                    ),
                ),
            ],
        ),
    ]
