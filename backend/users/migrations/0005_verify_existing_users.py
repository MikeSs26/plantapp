"""Grandfather all pre-existing users as email-verified.

Accounts created before email verification existed are trusted as-is, so the
new login gate doesn't lock out real users. Runs on Neon via Render migrate.
"""

from django.db import migrations


def mark_existing_verified(apps, schema_editor):
    User = apps.get_model("users", "User")
    User.objects.update(email_verified=True)


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0004_user_email_verified"),
    ]

    operations = [
        migrations.RunPython(mark_existing_verified, noop),
    ]
