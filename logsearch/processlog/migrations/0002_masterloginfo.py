# Generated by Django 5.1.1 on 2024-10-03 08:00

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('processlog', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='MasterLogInfo',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('content', models.CharField(blank=True, max_length=255, null=True)),
                ('procedure_features', models.CharField(blank=True, max_length=255, null=True)),
                ('data_features', models.CharField(blank=True, max_length=255, null=True)),
                ('master_log', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='info', to='processlog.masterlog')),
            ],
        ),
    ]
