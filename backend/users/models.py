from django.contrib.auth.models import AbstractUser
from django.db import models

from .managers import UserManager


class User(AbstractUser):
    """Usuario personalizado que inicia sesión con email.

    Incluye campos de perfil y un rol básico (reforestador / admin).
    """

    class Role(models.TextChoices):
        USER = "user", "Reforestador"
        ADMIN = "admin", "Administrador"

    # Eliminamos username: el login es por email.
    username = None
    email = models.EmailField("correo electrónico", unique=True)

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
