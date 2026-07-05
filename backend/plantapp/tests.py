"""Tests for the anti-fraud validations on tree creation.

Coordinate cheat-sheet used below (at Bogotá's latitude): one degree of
latitude ~= 111.32 km, so 0.00002 deg ~= 2.2 m, 0.0001 deg ~= 11 m, and
0.05 deg ~= 5.6 km.
"""

from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from .models import Tree
from .validators import DAILY_TREE_LIMIT, USER_RADIUS_KM

User = get_user_model()


class TreeAntiFraudTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="planter@test.com", password="Reforestar2026!", username="planter"
        )
        self.client.force_authenticate(self.user)

    def post_tree(
        self,
        lat,
        lng,
        species="Roble",
        photo_url="https://example.com/tree.jpg",
        reporter_lat=None,
        reporter_lng=None,
    ):
        # By default the reporter is standing right where the tree is planted
        # (distance 0), so tests that don't care about the radius check
        # aren't accidentally tripped by it.
        return self.client.post(
            "/api/trees/",
            {
                "species": species,
                "photo_url": photo_url,
                "latitude": lat,
                "longitude": lng,
                "reporter_latitude": reporter_lat if reporter_lat is not None else lat,
                "reporter_longitude": reporter_lng if reporter_lng is not None else lng,
            },
        )

    # --- Geo-temporal proximity (duplicate trees) ---

    def test_rejects_tree_too_close_to_own_recent_tree(self):
        self.assertEqual(self.post_tree("4.60000000", "-74.08000000").status_code, 201)
        res = self.post_tree("4.60002000", "-74.08000000")  # ~2.2 m away
        self.assertEqual(res.status_code, 400)
        self.assertIn("recientemente", str(res.data))

    def test_allows_tree_beyond_min_distance(self):
        self.assertEqual(self.post_tree("4.60000000", "-74.08000000").status_code, 201)
        res = self.post_tree("4.60010000", "-74.08000000")  # ~11 m away
        self.assertEqual(res.status_code, 201)

    def test_proximity_only_applies_to_own_trees(self):
        other = User.objects.create_user(
            email="other@test.com", password="Reforestar2026!", username="other"
        )
        Tree.objects.create(
            user=other, latitude="4.60000000", longitude="-74.08000000"
        )
        # Same spot as someone ELSE's tree: legitimate, must pass.
        res = self.post_tree("4.60000000", "-74.08000000")
        self.assertEqual(res.status_code, 201)

    # --- Daily limit ---

    def _fill_daily_quota(self, user):
        # ORM bulk-create bypasses the API/validators entirely (we're only
        # testing the count check here), with coordinates far apart so the
        # proximity rule never interferes.
        Tree.objects.bulk_create(
            Tree(
                user=user,
                latitude=f"{5 + i * 0.01:.8f}",
                longitude="-74.00000000",
            )
            for i in range(DAILY_TREE_LIMIT)
        )

    def test_rejects_tree_over_daily_limit(self):
        self._fill_daily_quota(self.user)
        res = self.post_tree("6.50000000", "-74.50000000")
        self.assertEqual(res.status_code, 400)
        self.assertIn("límite diario", str(res.data))

    def test_admin_is_exempt_from_daily_limit(self):
        admin = User.objects.create_user(
            email="admin@test.com",
            password="Reforestar2026!",
            username="admin_t",
            role="admin",
        )
        self._fill_daily_quota(admin)
        self.client.force_authenticate(admin)
        res = self.post_tree("6.50000000", "-74.50000000")
        self.assertEqual(res.status_code, 201)

    # --- Mandatory photo ---

    def test_rejects_tree_without_photo(self):
        res = self.post_tree("4.60000000", "-74.08000000", photo_url="")
        self.assertEqual(res.status_code, 400)
        self.assertIn("obligatoria", str(res.data))

    # --- Mandatory live location + radius check ---

    def test_rejects_tree_missing_reporter_location(self):
        res = self.client.post(
            "/api/trees/",
            {
                "species": "Roble",
                "photo_url": "https://example.com/tree.jpg",
                "latitude": "4.60000000",
                "longitude": "-74.08000000",
                # reporter_latitude/longitude intentionally omitted
            },
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("ubicación actual", str(res.data))

    def test_rejects_tree_far_from_reporter_location(self):
        # Reporter in Bogotá, tree pin in Tokyo: ~14,000 km apart.
        res = self.post_tree(
            "35.6762", "139.6503", reporter_lat="4.60000000", reporter_lng="-74.08000000"
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn(f"{USER_RADIUS_KM} km", str(res.data))

    def test_allows_tree_within_user_radius(self):
        # ~5.6 km from the reporter's live position: inside the 50 km radius,
        # and far enough from any prior tree not to trip the proximity rule.
        res = self.post_tree(
            "4.65000000", "-74.08000000", reporter_lat="4.60000000", reporter_lng="-74.08000000"
        )
        self.assertEqual(res.status_code, 201)
