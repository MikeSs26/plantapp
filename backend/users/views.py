from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db.models import Count
from django.utils import timezone
from rest_framework import generics, permissions, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from .permissions import IsAdminRole
from .serializers import AdminUserSerializer, RegisterSerializer, UserSerializer

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    """Registro público de nuevos reforestadores."""

    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class MeView(generics.RetrieveUpdateAPIView):
    """Devuelve/actualiza el perfil del usuario autenticado."""

    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class AdminUserViewSet(viewsets.ModelViewSet):
    """Gestión de usuarios (solo admins): listar, cambiar rol/estado, borrar.

    No se crean usuarios aquí (eso es el registro público), por eso se
    limitan los métodos a GET/PATCH/DELETE.
    """

    permission_classes = [IsAdminRole]
    serializer_class = AdminUserSerializer
    http_method_names = ["get", "patch", "delete", "head", "options"]

    def get_queryset(self):
        return User.objects.annotate(
            trees_count=Count("trees", distinct=True),
            likes_received=Count("trees__likes", distinct=True),
        ).order_by("-created_at")

    def perform_update(self, serializer):
        # Candado: un admin no puede quitarse su propio rol y quedar sin acceso.
        instance = serializer.instance
        new_role = serializer.validated_data.get("role", instance.role)
        new_active = serializer.validated_data.get("is_active", instance.is_active)
        if instance.id == self.request.user.id and (
            new_role != "admin" or not new_active
        ):
            raise ValidationError(
                "No puedes quitarte tu propio rol de administrador ni desactivarte."
            )
        serializer.save()

    def perform_destroy(self, instance):
        # Candado: no puedes eliminar tu propia cuenta desde el panel.
        if instance.id == self.request.user.id:
            raise ValidationError("No puedes eliminar tu propia cuenta de administrador.")
        instance.delete()


class AdminStatsView(APIView):
    """Métricas globales para el panel de administración (solo admins)."""

    permission_classes = [IsAdminRole]

    def get(self, request):
        from plantapp.models import Comment, Like, Tree

        week_ago = timezone.now() - timedelta(days=7)
        return Response(
            {
                "users": User.objects.count(),
                "admins": User.objects.filter(role="admin").count(),
                "trees": Tree.objects.count(),
                "comments": Comment.objects.count(),
                "likes": Like.objects.count(),
                "new_users_week": User.objects.filter(created_at__gte=week_ago).count(),
                "new_trees_week": Tree.objects.filter(planted_at__gte=week_ago).count(),
            }
        )
