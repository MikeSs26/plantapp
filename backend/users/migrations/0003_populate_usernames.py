"""Backfill a unique username for every pre-existing user.

Runs on all environments (including production on Neon via Render's migrate
step), so users created before the username field always get a handle.
"""

import re

from django.db import migrations


def slugify(base):
    cleaned = re.sub(r"[^a-zA-Z0-9_]", "", base or "").lower()
    return cleaned[:20] or "user"


def populate_usernames(apps, schema_editor):
    User = apps.get_model("users", "User")
    used = set(
        User.objects.exclude(username__isnull=True).values_list("username", flat=True)
    )
    used = {u.lower() for u in used}

    for user in User.objects.filter(username__isnull=True):
        base = slugify((user.email or "user").split("@")[0])
        candidate = base
        i = 1
        while candidate.lower() in used:
            i += 1
            candidate = f"{base}{i}"
        user.username = candidate
        used.add(candidate.lower())
        user.save(update_fields=["username"])


def noop(apps, schema_editor):
    # Reversing just clears the generated handles.
    User = apps.get_model("users", "User")
    User.objects.update(username=None)


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0002_user_username"),
    ]

    operations = [
        migrations.RunPython(populate_usernames, noop),
    ]
