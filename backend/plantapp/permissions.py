from rest_framework import permissions


class IsOwnerOrReadOnly(permissions.BasePermission):
    """Cualquiera autenticado puede leer; el dueño o un admin puede editar/borrar.

    Los administradores pueden moderar (borrar) contenido de cualquier usuario.
    """

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.user_id == request.user.id or getattr(request.user, "role", None) == "admin"
