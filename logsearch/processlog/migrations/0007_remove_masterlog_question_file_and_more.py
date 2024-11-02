# Generated by Django 5.1.1 on 2024-11-01 07:43

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('processlog', '0006_alter_masterlog_question_file_and_more'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='masterlog',
            name='question_file',
        ),
        migrations.RemoveField(
            model_name='masterlog',
            name='template_file',
        ),
        migrations.RemoveField(
            model_name='masterloginfo',
            name='master_log',
        ),
        migrations.AddField(
            model_name='masterlog',
            name='history_file',
            field=models.FileField(blank=True, max_length=255, null=True, upload_to='data/process_logs/history/'),
        ),
        migrations.AddField(
            model_name='masterlog',
            name='info',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, related_name='logs', to='processlog.masterloginfo'),
        ),
        migrations.AddField(
            model_name='masterloginfo',
            name='question_file',
            field=models.FileField(blank=True, max_length=255, null=True, upload_to='data/process_logs/questions/'),
        ),
        migrations.AddField(
            model_name='masterloginfo',
            name='template_file',
            field=models.FileField(blank=True, max_length=255, null=True, upload_to='data/process_logs/templates/'),
        ),
        migrations.AlterField(
            model_name='logentry',
            name='master_log',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, related_name='entries', to='processlog.masterlog'),
        ),
    ]