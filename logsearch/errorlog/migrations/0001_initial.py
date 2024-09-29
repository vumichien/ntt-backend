# Generated by Django 5.1 on 2024-09-26 12:03

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="MasterErrorLog",
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
            name="User",
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
                ("user_name", models.CharField(max_length=255, unique=True)),
            ],
        ),
        migrations.CreateModel(
            name="ErrorLog",
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
                ("time", models.DateTimeField()),
                ("type", models.CharField(blank=True, max_length=50, null=True)),
                ("user_name", models.CharField(blank=True, max_length=255, null=True)),
                ("pc_name", models.CharField(blank=True, max_length=255, null=True)),
                ("win_title", models.CharField(blank=True, max_length=255, null=True)),
                (
                    "win_urlpath",
                    models.CharField(blank=True, max_length=255, null=True),
                ),
                ("win_hwnd", models.FloatField(blank=True, null=True)),
                ("win_class", models.CharField(blank=True, max_length=255, null=True)),
                ("app_path", models.CharField(blank=True, max_length=255, null=True)),
                ("capimg", models.CharField(blank=True, max_length=255, null=True)),
                ("explanation", models.TextField(blank=True, null=True)),
                ("error_type", models.CharField(blank=True, max_length=50, null=True)),
                ("error_content", models.TextField(blank=True, null=True)),
                (
                    "master_error_log",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="error_entries",
                        to="errorlog.mastererrorlog",
                    ),
                ),
            ],
        ),
        migrations.AddField(
            model_name="mastererrorlog",
            name="user",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                to="errorlog.user",
            ),
        ),
        migrations.CreateModel(
            name="ErrorStatistics",
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
                ("error_type", models.CharField(max_length=50)),
                ("occurrence_count", models.IntegerField()),
                ("actions_before_error", models.TextField()),
                ("win_title", models.CharField(blank=True, max_length=255, null=True)),
                (
                    "master_error_log",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="error_statistics",
                        to="errorlog.mastererrorlog",
                    ),
                ),
                ("users", models.ManyToManyField(to="errorlog.user")),
            ],
        ),
    ]