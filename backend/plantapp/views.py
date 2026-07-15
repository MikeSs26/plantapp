import time

import cloudinary.uploader
from django.contrib.auth import get_user_model
from django.db.models import Count, Exists, OuterRef, Q
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Comment, Like, Tree
from .permissions import IsOwnerOrReadOnly
from .serializers import CommentSerializer, TreeSerializer
from .validators import (
    validate_daily_limit,
    validate_proximity,
    validate_within_user_radius,
)

User = get_user_model()


class TreePagination(PageNumberPagination):
    page_size = 12


class TreeViewSet(viewsets.ModelViewSet):
    serializer_class = TreeSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]
    pagination_class = TreePagination

    def get_queryset(self):
        # Anotamos likes/comentarios y si el usuario actual ya dio like.
        # distinct=True evita que los JOINs multipliquen los conteos.
        user = self.request.user
        qs = (
            Tree.objects.select_related("user")
            .annotate(
                likes_count=Count("likes", distinct=True),
                comments_count=Count("comments", distinct=True),
                liked_by_me=Exists(
                    Like.objects.filter(tree=OuterRef("pk"), user=user)
                ),
            )
        )

        # Filtros del feed (servidor, para que funcionen con paginación).
        params = self.request.query_params
        search = params.get("search", "").strip()
        if search:
            qs = qs.filter(
                Q(species__icontains=search)
                | Q(user__display_name__icontains=search)
            )
        if params.get("mine") == "1":
            qs = qs.filter(user=user)
        # Filter by a specific author (used by public profile pages).
        author_id = params.get("user")
        if author_id:
            qs = qs.filter(user_id=author_id)

        if params.get("ordering") == "likes":
            return qs.order_by("-likes_count", "-planted_at")
        return qs.order_by("-planted_at")

    def get_permissions(self):
        # Dar like a un árbol ajeno es válido: no exige ser el dueño.
        if self.action == "like":
            return [permissions.IsAuthenticated()]
        return super().get_permissions()

    def perform_create(self, serializer):
        user = self.request.user

        # Live geolocation, required on every submission (not stored, only
        # used to prove physical presence near the tree being registered).
        reporter_lat = self.request.data.get("reporter_latitude")
        reporter_lng = self.request.data.get("reporter_longitude")
        if reporter_lat in (None, "") or reporter_lng in (None, ""):
            raise ValidationError(
                {
                    "reporter_latitude": (
                        "Debes compartir tu ubicación actual para registrar un árbol."
                    )
                }
            )

        # Anti-fraud gates: daily cap, geo-temporal duplicate, and user-radius check.
        validate_daily_limit(user)
        validate_proximity(
            user,
            serializer.validated_data["latitude"],
            serializer.validated_data["longitude"],
        )
        validate_within_user_radius(
            reporter_lat,
            reporter_lng,
            serializer.validated_data["latitude"],
            serializer.validated_data["longitude"],
        )
        # The tree belongs to the authenticated user (token owner).
        serializer.save(user=user)

    @action(detail=True, methods=["post"])
    def like(self, request, pk=None):
        """Alterna el like del usuario actual sobre este árbol."""
        tree = self.get_object()
        like, created = Like.objects.get_or_create(user=request.user, tree=tree)
        if not created:
            like.delete()
        return Response(
            {"liked": created, "likes_count": tree.likes.count()}
        )

    @action(detail=False, methods=["get"])
    def weather(self, request):
        """Live weather at each of the user's tree locations, fetched
        concurrently (see plantapp/weather.py). Returns the wall-clock time so
        the frontend can show that N lookups ran in parallel, not in series."""
        from .weather import fetch_weather_for_trees

        trees = list(
            Tree.objects.filter(user=request.user)
            .order_by("-planted_at")
            .values("id", "species", "latitude", "longitude")[:20]
        )
        start = time.perf_counter()
        results = fetch_weather_for_trees(trees)
        elapsed_ms = round((time.perf_counter() - start) * 1000)
        return Response(
            {
                "count": len(results),
                "elapsed_ms": elapsed_ms,
                "results": results,
            }
        )

    @action(detail=False)
    def locations(self, request):
        """Todos los árboles con datos mínimos para el mapa (sin paginar)."""
        trees = self.get_queryset()
        data = [
            {
                "id": t.id,
                "latitude": t.latitude,
                "longitude": t.longitude,
                "species": t.species,
                "photo_url": t.photo_url,
                "planted_by": t.user.display_name,
                "likes_count": t.likes_count,
            }
            for t in trees
        ]
        return Response(data)


class CommentViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    """Comentarios: listar por árbol (?tree=id), crear, y borrar los propios."""

    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]

    def get_queryset(self):
        qs = Comment.objects.select_related("user").order_by("created_at")
        tree_id = self.request.query_params.get("tree")
        if tree_id:
            qs = qs.filter(tree_id=tree_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class UploadView(APIView):
    """Sube una imagen a Cloudinary y devuelve la URL segura.

    El frontend sube la foto aquí, recibe la URL, y luego la manda como
    photo_url al crear el árbol. Así el secret nunca sale del servidor.
    """

    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        file = request.FILES.get("file")
        if not file:
            return Response(
                {"error": "No se envió ningún archivo."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            result = cloudinary.uploader.upload(
                file,
                folder="plantapp/trees",
                resource_type="image",
                # Normaliza cualquier formato (HEIC del celular, PNG, etc.) a JPG,
                # que todos los navegadores muestran. Además reduce fotos enormes.
                format="jpg",
                transformation=[
                    {
                        "width": 1600,
                        "height": 1600,
                        "crop": "limit",
                        "quality": "auto:good",
                    }
                ],
            )
        except Exception:  # noqa: BLE001
            return Response(
                {"error": "No se pudo subir la imagen."},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        return Response({"url": result["secure_url"]})


class LeaderboardView(APIView):
    """Top 10 de usuarios que más árboles han plantado."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        top = (
            User.objects.annotate(tree_count=Count("trees"))
            .filter(tree_count__gt=0)
            .order_by("-tree_count")[:10]
        )
        data = [
            {
                "id": u.id,
                "username": u.username,
                "display_name": u.display_name or u.email,
                "tree_count": u.tree_count,
            }
            for u in top
        ]
        return Response(data)


class PublicStatsView(APIView):
    """Números globales para la landing. Público a propósito."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response(
            {
                "trees": Tree.objects.count(),
                "users": User.objects.count(),
                "likes": Like.objects.count(),
                "species": (
                    Tree.objects.exclude(species__isnull=True)
                    .exclude(species="")
                    .values("species")
                    .distinct()
                    .count()
                ),
            }
        )
