from rest_framework import serializers
from .models import Comment, Tree


class TreeSerializer(serializers.ModelSerializer):
    # El dueño lo asigna el backend desde el token, nunca el cliente.
    user = serializers.PrimaryKeyRelatedField(read_only=True)
    planted_by = serializers.CharField(source="user.display_name", read_only=True)
    # Author handle, used to link cards to the author's public profile.
    author_username = serializers.CharField(source="user.username", read_only=True)
    # Mandatory: a fake/spam tree can't provide visual proof of planting.
    # The model field stays blank=True so historical rows without a photo
    # remain valid; this is enforced only at the API layer for new creates.
    photo_url = serializers.URLField(
        max_length=500,
        required=True,
        allow_blank=False,
        error_messages={
            "blank": "La foto es obligatoria para registrar un árbol.",
            "required": "La foto es obligatoria para registrar un árbol.",
        },
    )
    # These come annotated from the viewset queryset.
    likes_count = serializers.IntegerField(read_only=True)
    liked_by_me = serializers.BooleanField(read_only=True)
    comments_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Tree
        fields = [
            "id",
            "user",
            "planted_by",
            "author_username",
            "photo_url",
            "latitude",
            "longitude",
            "species",
            "planted_at",
            "likes_count",
            "liked_by_me",
            "comments_count",
        ]
        read_only_fields = [
            "id",
            "user",
            "planted_by",
            "author_username",
            "planted_at",
            "likes_count",
            "liked_by_me",
            "comments_count",
        ]


class CommentSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(read_only=True)
    author_name = serializers.CharField(source="user.display_name", read_only=True)
    author_username = serializers.CharField(source="user.username", read_only=True)
    author_avatar = serializers.CharField(source="user.avatar_url", read_only=True)

    class Meta:
        model = Comment
        fields = [
            "id",
            "tree",
            "user",
            "author_name",
            "author_username",
            "author_avatar",
            "text",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "user",
            "author_name",
            "author_username",
            "author_avatar",
            "created_at",
        ]
