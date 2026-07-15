"""In-app QA diagnostics for the admin testing panel.

Runs a small suite of live checks against the running system and returns
structured, human-readable results (expected vs. actual, pass/fail, timing).
Mirrors software-engineering test categories:

  * functional      -> does a feature/requirement behave correctly?
  * non_functional  -> quality attributes: performance, security, scalability.

All checks are read-only / side-effect free (they exercise validators and
serializers without saving), so the panel is safe to run in production.
"""

import time

from django.db.models import Count
from django.utils import timezone
from rest_framework import serializers as drf_serializers

from .models import Tree
from .serializers import TreeSerializer
from .validators import (
    DAILY_TREE_LIMIT,
    USER_RADIUS_KM,
    validate_within_user_radius,
)


def _timed(fn, *args):
    """Run a check function, attaching its wall-clock duration in ms."""
    start = time.perf_counter()
    result = fn(*args)
    result["duration_ms"] = round((time.perf_counter() - start) * 1000, 1)
    return result


# --------------------------- Functional checks ---------------------------

def check_radius_rule():
    """A tree pinned far from the reporter's live location must be rejected,
    while a nearby one is accepted."""
    passed = False
    try:
        # Reporter in Bogotá, tree in Tokyo (~14,000 km): must be rejected.
        validate_within_user_radius("4.60", "-74.08", "35.68", "139.65")
        actual = "El árbol lejano fue ACEPTADO (falla)"
    except drf_serializers.ValidationError:
        try:
            # ~1 km away: must be accepted.
            validate_within_user_radius("4.60", "-74.08", "4.61", "-74.08")
            actual = "Lejano rechazado y cercano aceptado ✓"
            passed = True
        except drf_serializers.ValidationError:
            actual = "El árbol cercano también fue rechazado (falla)"
    return {
        "name": "Rechazo de árbol fuera del radio permitido",
        "category": "functional",
        "subtype": "Regla de negocio",
        "expected": f"Rechaza árboles a más de {USER_RADIUS_KM} km; acepta los cercanos",
        "actual": actual,
        "passed": passed,
    }


def check_duplicate_email(existing_email):
    """Registration must reject an email that already exists."""
    from users.serializers import RegisterSerializer

    serializer = RegisterSerializer(
        data={
            "email": existing_email,
            "password": "Zx9!kLmn2026",  # nosec B105: throwaway probe value, not a real credential
            "username": "qa_probe_zz",
            "display_name": "QA Probe",
        }
    )
    is_valid = serializer.is_valid()
    passed = (not is_valid) and ("email" in serializer.errors)
    return {
        "name": "Registro rechaza correo duplicado",
        "category": "functional",
        "subtype": "Validación de entrada",
        "expected": "Un correo ya registrado es rechazado",
        "actual": "Rechazado ✓" if passed else "Fue aceptado (falla)",
        "passed": passed,
    }


def check_photo_required():
    """Creating a tree without a photo must be rejected."""
    serializer = TreeSerializer(
        data={
            "species": "QA",
            "photo_url": "",
            "latitude": "4.60",
            "longitude": "-74.08",
        }
    )
    is_valid = serializer.is_valid()
    passed = (not is_valid) and ("photo_url" in serializer.errors)
    return {
        "name": "Foto obligatoria al registrar un árbol",
        "category": "functional",
        "subtype": "Validación de entrada",
        "expected": "Se rechaza un árbol sin foto",
        "actual": "Rechazado ✓" if passed else "Fue aceptado (falla)",
        "passed": passed,
    }


# ------------------------- Non-functional checks -------------------------

def check_feed_performance():
    """The feed query (with its annotations) must respond under a threshold."""
    threshold_ms = 1500
    start = time.perf_counter()
    # Exercise a realistic feed query: annotate counts + evaluate one page.
    list(
        Tree.objects.select_related("user").annotate(
            likes_count=Count("likes", distinct=True),
            comments_count=Count("comments", distinct=True),
        )[:12]
    )
    elapsed_ms = (time.perf_counter() - start) * 1000
    return {
        "name": "Tiempo de respuesta de la consulta del feed",
        "category": "non_functional",
        "subtype": "Rendimiento",
        "expected": f"Menos de {threshold_ms} ms",
        "actual": f"{elapsed_ms:.0f} ms",
        "passed": elapsed_ms < threshold_ms,
    }


def check_password_hashing(user):
    """Stored passwords must use a strong one-way hash, never plaintext."""
    hashed = user.password or ""
    algorithm = hashed.split("$", 1)[0] if "$" in hashed else "desconocido"
    strong = hashed.startswith(("pbkdf2_", "argon2", "bcrypt"))
    return {
        "name": "Contraseñas almacenadas con hash fuerte",
        "category": "non_functional",
        "subtype": "Seguridad",
        "expected": "Hash fuerte (pbkdf2 / argon2 / bcrypt), nunca texto plano",
        "actual": f"Algoritmo: {algorithm}",
        "passed": strong,
    }


def check_pagination_enabled():
    """The feed must paginate so large datasets don't dump everything at once."""
    from .views import TreePagination

    size = TreePagination.page_size
    passed = bool(size) and size <= 50
    return {
        "name": "Paginación activa en el feed",
        "category": "non_functional",
        "subtype": "Escalabilidad",
        "expected": "El feed entrega páginas acotadas (no todo de golpe)",
        "actual": f"page_size = {size}",
        "passed": passed,
    }


def run_all_checks(user):
    """Run the whole suite and return a structured report."""
    results = [
        _timed(check_radius_rule),
        _timed(check_duplicate_email, user.email),
        _timed(check_photo_required),
        _timed(check_feed_performance),
        _timed(check_password_hashing, user),
        _timed(check_pagination_enabled),
    ]
    passed = sum(1 for r in results if r["passed"])
    return {
        "ran_at": timezone.now().isoformat(),
        "summary": {
            "total": len(results),
            "passed": passed,
            "failed": len(results) - passed,
        },
        "results": results,
        # Surfaced so the panel can show the current business-rule values.
        "config": {
            "user_radius_km": USER_RADIUS_KM,
            "daily_tree_limit": DAILY_TREE_LIMIT,
        },
    }
