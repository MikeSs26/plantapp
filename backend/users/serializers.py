from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """Datos públicos/editables del usuario autenticado (endpoint /me/)."""

    trees_count = serializers.SerializerMethodField()
    likes_received = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "email",
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

    def get_trees_count(self, obj):
        return obj.trees.count()

    def get_likes_received(self, obj):
        # Likes que han recibido los árboles de este usuario.
        from plantapp.models import Like

        return Like.objects.filter(tree__user=obj).count()


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
            "display_name",
            "avatar_url",
            "location",
            "role",
            "is_active",
            "created_at",
            "trees_count",
            "likes_received",
        ]
        # Solo el rol y el estado activo son editables desde el panel.
        read_only_fields = [
            "id",
            "email",
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

    class Meta:
        model = User
        fields = ["id", "email", "password", "display_name"]

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)
