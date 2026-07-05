from django.contrib.auth.models import AbstractUser
from django.core.validators import RegexValidator
from django.db import models

from .managers import UserManager


class User(AbstractUser):
    """Custom user that authenticates by email.

    Login is by email, but each user also has a unique public ``username``
    handle used in profile URLs. Includes profile fields and a basic role
    (reforestador / admin).
    """

    class Role(models.TextChoices):
        USER = "user", "Reforestador"
        ADMIN = "admin", "Administrador"

    email = models.EmailField("correo electrónico", unique=True)

    # Public unique handle (e.g. /app/users/<username>). Login is still by email,
    # so this is NOT the USERNAME_FIELD. Nullable so pre-existing rows migrate
    # cleanly; the registration flow and a data migration guarantee it is set.
    username_validator = RegexValidator(
        r"^[a-zA-Z0-9_]{3,30}$",
        "Username must be 3–30 characters: letters, numbers, or underscores.",
    )
    username = models.CharField(
        "nombre de usuario",
        max_length=30,
        unique=True,
        null=True,
        blank=True,
        validators=[username_validator],
    )

    role = models.CharField(
        max_length=20, choices=Role.choices, default=Role.USER
    )

    # --- Campos de perfil personalizable ---
    display_name = models.CharField("nombre público", max_length=100, blank=True)
    bio = models.TextField("biografía", blank=True)
    avatar_url = models.URLField("foto de perfil", max_length=500, blank=True)
    location = models.CharField("ubicación", max_length=120, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []  # email y password ya son obligatorios

    objects = UserManager()

    def __str__(self):
        return self.email
