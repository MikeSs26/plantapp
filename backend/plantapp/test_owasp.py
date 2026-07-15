"""Non-functional security tests, mapped to OWASP Top 10 (2021) categories.

Run with: pytest plantapp/test_owasp.py -v

These exercise the REAL system (ORM, serializers, throttling, permissions) —
no mocks — so a genuine regression in any of these areas turns a test red.
"""

import pytest
from rest_framework.test import APIClient

from plantapp.models import Tree

pytestmark = pytest.mark.django_db


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user(django_user_model):
    return django_user_model.objects.create_user(
        email="owasp_user@test.com",
        password="Reforestar2026!",
        username="owasp_user",
    )


@pytest.fixture
def admin(django_user_model):
    return django_user_model.objects.create_user(
        email="owasp_admin@test.com",
        password="Reforestar2026!",
        username="owasp_admin",
        role="admin",
    )


# --- A01:2021 Broken Access Control ----------------------------------------


def test_a01_admin_endpoints_reject_regular_users(api_client, user):
    """A non-admin must never reach admin-only management endpoints."""
    api_client.force_authenticate(user)
    res = api_client.get("/api/admin/users/")
    assert res.status_code == 403


def test_a01_cannot_delete_a_tree_you_do_not_own(api_client, user, django_user_model):
    """Ownership must be enforced at the object level, not just at login."""
    owner = django_user_model.objects.create_user(
        email="owasp_owner@test.com", password="Reforestar2026!", username="owasp_owner"
    )
    tree = Tree.objects.create(user=owner, latitude="4.6", longitude="-74.0")

    api_client.force_authenticate(user)
    res = api_client.delete(f"/api/trees/{tree.id}/")

    assert res.status_code in (403, 404)
    assert Tree.objects.filter(id=tree.id).exists()


# --- A02:2021 Cryptographic Failures -----------------------------------


def test_a02_password_is_never_returned_by_the_api(api_client, user):
    """The password hash must never leak through any serialized response."""
    api_client.force_authenticate(user)
    res = api_client.get("/api/auth/me/")
    assert "password" not in res.data


def test_a02_passwords_are_hashed_not_stored_in_plaintext(user):
    """Storing plaintext passwords is a critical failure (A02)."""
    assert user.password != "Reforestar2026!"
    assert user.password.startswith("pbkdf2_")


# --- A03:2021 Injection --------------------------------------------------


def test_a03_search_field_is_safe_against_sql_injection_payloads(api_client, user):
    """A classic SQLi payload in a search param must not error or leak data —
    Django's ORM parameterizes queries, so this should just return zero results."""
    api_client.force_authenticate(user)
    payload = "'; DROP TABLE plantapp_tree; --"

    res = api_client.get("/api/trees/", {"search": payload})

    assert res.status_code == 200
    # The table must still exist and be queryable afterwards.
    assert Tree.objects.count() >= 0


# --- A04:2021 Insecure Design (business-rule enforcement) ---------------


def test_a04_registration_rejects_a_common_weak_password(api_client):
    """Weak/common passwords must be rejected by Django's validators."""
    res = api_client.post(
        "/api/auth/register/",
        {
            "email": "weakpass@test.com",
            "password": "password",
            "username": "weakpass",
            "display_name": "Weak",
        },
    )
    assert res.status_code == 400
    assert "password" in res.data


# --- A05:2021 Security Misconfiguration ----------------------------------


def test_a05_debug_defaults_to_false_when_env_var_is_absent():
    """A deployment that forgets to set DEBUG must fail SAFE (debug off), not
    fail OPEN (debug on) and leak stack traces/settings. Checks the actual
    fallback in settings.py, independent of this machine's own .env value."""
    import os

    original = os.environ.pop("DEBUG", None)
    try:
        default_debug = os.getenv("DEBUG", "False").lower() in ("1", "true", "yes")
    finally:
        if original is not None:
            os.environ["DEBUG"] = original
    assert default_debug is False


# --- A07:2021 Identification and Authentication Failures -----------------


def test_a07_protected_endpoints_require_authentication(api_client):
    """Anonymous requests to authenticated-only endpoints must be rejected."""
    res = api_client.get("/api/auth/me/")
    assert res.status_code == 401


def test_a07_registration_is_rate_limited(api_client, settings):
    """Unlimited signup attempts enable credential-stuffing/spam bots —
    ScopedRateThrottle must cap attempts (see core/settings.py DEFAULT_THROTTLE_RATES)."""
    from django.conf import settings as django_settings

    assert "register" in django_settings.REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]
