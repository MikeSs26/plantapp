from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    ordering = ["email"]
    list_display = ["email", "display_name", "role", "is_staff"]
    list_filter = ["role", "is_staff", "is_superuser", "is_active"]
    search_fields = ["email", "display_name"]

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Perfil", {"fields": ("display_name", "bio", "avatar_url", "location")}),
        (
            "Roles y permisos",
            {
                "fields": (
                    "role",
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        ("Fechas", {"fields": ("last_login", "created_at")}),
    )
    readonly_fields = ["created_at", "last_login"]

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "password1", "password2", "display_name", "role"),
            },
        ),
    )
