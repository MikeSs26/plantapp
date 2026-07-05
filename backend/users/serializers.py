import re

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

User = get_user_model()

USERNAME_RE = re.compile(r"^[a-zA-Z0-9_]{3,30}$")


def validate_username_value(value, *, exclude_pk=None):
    """Shared username validation: format + case-insensitive uniqueness."""
    value = (value or "").strip()
    if not USERNAME_RE.match(value):
        raise serializers.ValidationError(
            "El nombre de usuario debe tener 3–30 caracteres: letras, números o guion bajo."
        )
    qs = User.objects.filter(username__iexact=value)
    if exclude_pk is not None:
        qs = qs.exclude(pk=exclude_pk)
    if qs.exists():
        raise serializers.ValidationError("Ese nombre de usuario ya está en uso.")
    return value


class UserSerializer(serializers.ModelSerializer):
    """Public/editable data for the authenticated user (endpoint /me/)."""

    # Declared explicitly so validate_username (case-insensitive, self-excluding)
    # is the single source of truth, instead of the model's default UniqueValidator.
    username = serializers.CharField(required=False)
    trees_count = serializers.SerializerMethodField()
    likes_received = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "username",
            "display_name",
            "bio",
            "avatar_url",
            "location",
            "role",
            "created_at",
            "trees_count",
            "likes_received",
        ]
        read_only_fields = ["id", "email", "role", "created_at"]

    def validate_username(self, value):
        # Exclude the current user so they can keep (or re-save) their own handle.
        return validate_username_value(value, exclude_pk=self.instance.pk if self.instance else None)

    def get_trees_count(self, obj):
        return obj.trees.count()

    def get_likes_received(self, obj):
        # Likes received across all of this user's trees.
        from plantapp.models import Like

        return Like.objects.filter(tree__user=obj).count()


class PublicUserSerializer(serializers.ModelSerializer):
    """Public profile view (no email). Counts come annotated from the queryset."""

    trees_count = serializers.IntegerField(read_only=True)
    likes_received = serializers.IntegerField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "display_name",
            "bio",
            "avatar_url",
            "location",
            "role",
            "created_at",
            "trees_count",
            "likes_received",
        ]


class AdminUserSerializer(serializers.ModelSerializer):
    """Vista de usuario para el panel de administración.

    Expone más campos y permite editar `role` e `is_active`. Los conteos
    vienen anotados en el queryset del viewset (evita N+1).
    """

    trees_count = serializers.IntegerField(read_only=True)
    likes_received = serializers.IntegerField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "username",
            "display_name",
            "avatar_url",
            "location",
            "role",
            "is_active",
            "created_at",
            "trees_count",
            "likes_received",
        ]
        # Only role and active state are editable from the admin panel.
        read_only_fields = [
            "id",
            "email",
            "username",
            "display_name",
            "avatar_url",
            "location",
            "created_at",
            "trees_count",
            "likes_received",
        ]


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True, validators=[validate_password], style={"input_type": "password"}
    )
    username = serializers.CharField()

    class Meta:
        model = User
        fields = ["id", "email", "password", "username", "display_name"]

    def validate_username(self, value):
        return validate_username_value(value)

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)
