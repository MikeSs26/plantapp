"""Functional tests written in idiomatic pytest style (plain functions +
fixtures), as opposed to the unittest-style APITestCase suites in tests.py.

Run with: pytest plantapp/test_pytest_functional.py -v
"""

import pytest
from rest_framework.test import APIClient

from plantapp.models import Comment, Like, Tree

pytestmark = pytest.mark.django_db


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user(django_user_model):
    return django_user_model.objects.create_user(
        email="pytest_user@test.com",
        password="Reforestar2026!",
        username="pytest_user",
    )


@pytest.fixture
def other_user(django_user_model):
    return django_user_model.objects.create_user(
        email="pytest_other@test.com",
        password="Reforestar2026!",
        username="pytest_other",
    )


@pytest.fixture
def authed_client(api_client, user):
    api_client.force_authenticate(user)
    return api_client


@pytest.fixture
def tree(user):
    return Tree.objects.create(
        user=user,
        species="Roble",
        photo_url="https://example.com/tree.jpg",
        latitude="4.60000000",
        longitude="-74.08000000",
    )


# --- RF: like toggle -------------------------------------------------------


def test_like_toggle_adds_and_removes_like(authed_client, tree):
    """A user can like a tree once, and un-like it with a second call."""
    url = f"/api/trees/{tree.id}/like/"

    first = authed_client.post(url)
    assert first.status_code == 200
    assert first.data["liked"] is True
    assert Like.objects.filter(user=tree.user, tree=tree).count() == 1

    second = authed_client.post(url)
    assert second.status_code == 200
    assert second.data["liked"] is False
    assert Like.objects.filter(user=tree.user, tree=tree).count() == 0


# --- RF: comments ------------------------------------------------------


def test_user_can_only_delete_their_own_comment(
    authed_client, api_client, other_user, tree
):
    """Deleting someone else's comment must be rejected (ownership check)."""
    comment = Comment.objects.create(user=other_user, tree=tree, text="Hola")

    res = authed_client.delete(f"/api/comments/{comment.id}/")

    assert res.status_code in (403, 404)
    assert Comment.objects.filter(id=comment.id).exists()


# --- RF: public profile lookup -----------------------------------------


def test_public_profile_is_case_insensitive_and_hides_email(authed_client, user):
    """GET /api/users/<username>/ resolves regardless of case and never
    exposes the target user's email (privacy requirement)."""
    res = authed_client.get(f"/api/users/{user.username.upper()}/")

    assert res.status_code == 200
    assert res.data["username"] == user.username
    assert "email" not in res.data


# --- RF: leaderboard ordering -------------------------------------------


def test_leaderboard_orders_by_tree_count_descending(authed_client, user, other_user):
    """Whoever planted more trees ranks first."""
    Tree.objects.create(user=other_user, latitude="4.6", longitude="-74.0")
    for i in range(3):
        Tree.objects.create(user=user, latitude=f"{4.6 + i * 0.01}", longitude="-74.0")

    res = authed_client.get("/api/leaderboard/")

    assert res.status_code == 200
    ranked_ids = [entry["id"] for entry in res.data]
    assert ranked_ids.index(user.id) < ranked_ids.index(other_user.id)
