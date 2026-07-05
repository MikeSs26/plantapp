import re

from django.contrib.auth.base_user import BaseUserManager


def slugify_username(base):
    """Reduce an arbitrary string to a valid username seed (a-z, 0-9, _)."""
    cleaned = re.sub(r"[^a-zA-Z0-9_]", "", base or "").lower()
    return cleaned[:20] or "user"


class UserManager(BaseUserManager):
    """Manager for a User that logs in by email instead of username."""

    use_in_migrations = True

    def generate_unique_username(self, seed):
        """Return a username derived from ``seed`` that is not yet taken."""
        base = slugify_username(seed)
        candidate = base
        i = 1
        while self.model.objects.filter(username__iexact=candidate).exists():
            i += 1
            candidate = f"{base}{i}"
        return candidate

    def _create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email)
        # Guarantee every user has a public handle, even if created via
        # createsuperuser or any path that does not pass one explicitly.
        if not extra_fields.get("username"):
            extra_fields["username"] = self.generate_unique_username(email.split("@")[0])
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", "admin")

        if extra_fields.get("is_staff") is not True:
            raise ValueError("A superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("A superuser must have is_superuser=True.")

        return self._create_user(email, password, **extra_fields)
