from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CommentViewSet,
    LeaderboardView,
    PublicStatsView,
    TreeViewSet,
    UploadView,
)

router = DefaultRouter()
router.register(r'trees', TreeViewSet, basename='tree')
router.register(r'comments', CommentViewSet, basename='comment')

urlpatterns = [
    path('upload/', UploadView.as_view(), name='upload'),
    path('leaderboard/', LeaderboardView.as_view(), name='leaderboard'),
    path('stats/', PublicStatsView.as_view(), name='stats'),
    path('', include(router.urls)),
]
