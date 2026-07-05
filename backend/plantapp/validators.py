"""Anti-fraud validations for tree registration (POST /api/trees/).

Deliberately implemented without PostGIS: thanks to the daily cap, the
candidate set for the proximity check is tiny (at most DAILY_TREE_LIMIT
rows per user per day), so a bounding-box prefilter in SQL plus an exact
haversine check in Python is solid and adds zero infrastructure
requirements (runs fine on Render free tier + Neon).

User-facing error messages are in Spanish by design (app UI language).
"""

import math
from datetime import timedelta

from django.utils import timezone
from rest_framework import serializers

from .models import Tree

# --- Tunable business rules (adjust here only) ---
# Temporarily lowered from 20 while the app is in early testing.
DAILY_TREE_LIMIT = 5
MIN_TREE_DISTANCE_METERS = 5
PROXIMITY_WINDOW_HOURS = 24
# Max distance between the user's live browser geolocation (captured fresh
# on every submission) and the tree pin they placed on the map.
USER_RADIUS_KM = 50

# One degree of latitude is ~111.32 km everywhere on Earth.
METERS_PER_DEGREE_LAT = 111_320.0


def haversine_meters(lat1, lng1, lat2, lng2):
    """Great-circle distance in meters between two lat/lng points."""
    earth_radius_m = 6_371_000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lng2 - lng1)
    a = (
        math.sin(d_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    )
    return 2 * earth_radius_m * math.asin(math.sqrt(a))


def validate_daily_limit(user):
    """Standard users may register at most DAILY_TREE_LIMIT trees per calendar day.

    Admins are exempt (trusted moderators, bulk registrations for events).
    """
    if getattr(user, "role", None) == "admin":
        return
    planted_today = Tree.objects.filter(
        user=user, planted_at__date=timezone.localdate()
    ).count()
    if planted_today >= DAILY_TREE_LIMIT:
        raise serializers.ValidationError(
            f"Has alcanzado tu límite diario de plantación ({DAILY_TREE_LIMIT} árboles). "
            "¡Gran trabajo! Vuelve mañana para registrar los siguientes. 🌱"
        )


def validate_proximity(user, latitude, longitude):
    """Reject a tree closer than MIN_TREE_DISTANCE_METERS to another tree the
    same user registered within the last PROXIMITY_WINDOW_HOURS.

    Only compares against the user's own trees: planting near someone else's
    tree is legitimate. Two-phase check: a cheap SQL bounding box narrows the
    candidates, then exact haversine confirms the distance.
    """
    lat, lng = float(latitude), float(longitude)
    since = timezone.now() - timedelta(hours=PROXIMITY_WINDOW_HOURS)

    delta_lat = MIN_TREE_DISTANCE_METERS / METERS_PER_DEGREE_LAT
    # Longitude degrees shrink with latitude; clamp cos() to avoid division
    # blow-up near the poles.
    meters_per_degree_lng = METERS_PER_DEGREE_LAT * max(
        math.cos(math.radians(lat)), 1e-6
    )
    delta_lng = MIN_TREE_DISTANCE_METERS / meters_per_degree_lng

    candidates = Tree.objects.filter(
        user=user,
        planted_at__gte=since,
        latitude__gte=lat - delta_lat,
        latitude__lte=lat + delta_lat,
        longitude__gte=lng - delta_lng,
        longitude__lte=lng + delta_lng,
    ).values_list("latitude", "longitude")

    for other_lat, other_lng in candidates:
        distance = haversine_meters(lat, lng, float(other_lat), float(other_lng))
        if distance < MIN_TREE_DISTANCE_METERS:
            raise serializers.ValidationError(
                "Ya has registrado un árbol en esta ubicación recientemente. "
                "Si es un árbol distinto, acércate a él y marca su posición en el mapa."
            )


def validate_within_user_radius(reporter_lat, reporter_lng, tree_lat, tree_lng):
    """The tree pin must be within USER_RADIUS_KM of the user's live
    geolocation, captured fresh on every submission (never cached or stored
    as a "home" location). This is the core anti-fraud check: it proves the
    user is physically near where they claim to be planting, instead of
    just dropping a pin anywhere in the world.
    """
    try:
        reporter_lat, reporter_lng = float(reporter_lat), float(reporter_lng)
    except (TypeError, ValueError):
        raise serializers.ValidationError(
            {
                "reporter_latitude": (
                    "No pudimos leer tu ubicación actual. Intenta de nuevo."
                )
            }
        )

    distance_km = (
        haversine_meters(reporter_lat, reporter_lng, float(tree_lat), float(tree_lng))
        / 1000
    )
    if distance_km > USER_RADIUS_KM:
        raise serializers.ValidationError(
            f"El árbol debe estar a menos de {USER_RADIUS_KM} km de tu ubicación actual. "
            "Parece que estás plantando muy lejos de donde te encuentras ahora mismo."
        )
