from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0002_userprofile"),
    ]

    operations = [
        migrations.AddField(
            model_name="userprofile",
            name="avatar_s3_key",
            field=models.CharField(blank=True, default="", max_length=512),
        ),
    ]
