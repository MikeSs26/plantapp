"""Rutas del panel de administración, montadas en /api/admin/."""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import AdminStatsView, AdminUserViewSet

router = DefaultRouter()
router.register(r"users", AdminUserViewSet, basename="admin-users")

urlpatterns = [
    path("stats/", AdminStatsView.as_view(), name="admin-stats"),
    path("", include(router.urls)),
]
