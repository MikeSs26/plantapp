from rest_framework import permissions


class IsOwnerOrReadOnly(permissions.BasePermission):
    """Cualquiera autenticado puede leer; solo el dueño puede editar/borrar."""

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.user_id == request.user.id
