from rest_framework import permissions


class IsAdminRole(permissions.BasePermission):
    """Solo usuarios autenticados con rol 'admin' pueden acceder."""

    message = "Necesitas permisos de administrador para esta acción."

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and user.role == "admin"
        )
