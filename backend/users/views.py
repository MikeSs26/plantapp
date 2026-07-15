from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db.models import Count
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.http import urlsafe_base64_decode
from rest_framework import generics, permissions, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .emails import email_verification_token, send_verification_email
from .permissions import IsAdminRole
from .serializers import (
    AdminUserSerializer,
    EmailVerifiedTokenObtainPairSerializer,
    PublicUserSerializer,
    RegisterSerializer,
    ResendVerificationSerializer,
    UserSerializer,
)

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    """Public signup. Creates an unverified account and emails a link."""

    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    throttle_scope = "register"

    def perform_create(self, serializer):
        # Email gate disabled: activate the account immediately, no email sent.
        if not settings.REQUIRE_EMAIL_VERIFICATION:
            serializer.save(email_verified=True)
            return
        user = serializer.save()
        try:
            send_verification_email(user)
        except Exception:  # noqa: BLE001
            # Don't leave an orphan account if the email can't go out (bad
            # address or SMTP misconfig): roll it back so the user can retry.
            user.delete()
            raise ValidationError(
                "No pudimos enviar el correo de verificación. Revisa que tu "
                "dirección sea correcta e inténtalo de nuevo."
            )


class EmailVerifiedLoginView(TokenObtainPairView):
    """Login that rejects accounts whose email hasn't been verified yet."""

    serializer_class = EmailVerifiedTokenObtainPairSerializer


class VerifyEmailView(APIView):
    """Confirm an email from the link's uid + token."""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        uidb64 = request.data.get("uid")
        token = request.data.get("token")
        if not uidb64 or not token:
            raise ValidationError("Enlace de verificación inválido.")
        try:
            uid = urlsafe_base64_decode(uidb64).decode()
            user = User.objects.get(pk=uid)
        except (User.DoesNotExist, ValueError, TypeError, OverflowError):
            raise ValidationError("Enlace de verificación inválido.")

        # Idempotent: a second click on an already-used link is a friendly no-op.
        if user.email_verified:
            return Response(
                {"detail": "Tu correo ya estaba verificado. ¡Puedes iniciar sesión!"}
            )
        if not email_verification_token.check_token(user, token):
            raise ValidationError(
                "El enlace de verificación expiró o no es válido. Solicita uno nuevo."
            )
        user.email_verified = True
        user.save(update_fields=["email_verified"])
        return Response({"detail": "¡Correo verificado! Ya puedes iniciar sesión."})


class ResendVerificationView(APIView):
    """Re-send the verification email for an unverified account."""

    permission_classes = [permissions.AllowAny]
    throttle_scope = "resend_email"

    def post(self, request):
        serializer = ResendVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        user = User.objects.filter(email__iexact=email, email_verified=False).first()
        if user:
            try:
                send_verification_email(user)
            except Exception:  # noqa: BLE001
                pass  # never reveal existence or SMTP state to the caller
        # Always the same generic response (avoid account enumeration).
        return Response(
            {
                "detail": "Si esa cuenta existe y aún no está verificada, "
                "te enviamos un nuevo enlace de verificación."
            }
        )


class MeView(generics.RetrieveUpdateAPIView):
    """Devuelve/actualiza el perfil del usuario autenticado."""

    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class PublicProfileView(generics.RetrieveAPIView):
    """Public profile of any user, looked up case-insensitively by username."""

    serializer_class = PublicUserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        qs = User.objects.annotate(
            trees_count=Count("trees", distinct=True),
            likes_received=Count("trees__likes", distinct=True),
        )
        return get_object_or_404(qs, username__iexact=self.kwargs["username"])


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
