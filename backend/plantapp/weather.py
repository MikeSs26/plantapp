"""Live weather for tree locations, fetched concurrently.

This is the app's asynchronous feature: instead of requesting the weather for
each tree one after another (N sequential HTTP round-trips), we fire all the
requests at once with ``asyncio.gather`` and await them together. Fetching the
weather for 15 trees then takes about as long as fetching it for one.

Data source: Open-Meteo (https://open-meteo.com) — free, no API key, no signup.
"""

import asyncio

import httpx

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"

# WMO weather codes → human-readable Spanish label + emoji.
WEATHER_CODES = {
    0: ("Despejado", "☀️"),
    1: ("Mayormente despejado", "🌤️"),
    2: ("Parcialmente nublado", "⛅"),
    3: ("Nublado", "☁️"),
    45: ("Niebla", "🌫️"),
    48: ("Niebla con escarcha", "🌫️"),
    51: ("Llovizna ligera", "🌦️"),
    53: ("Llovizna", "🌦️"),
    55: ("Llovizna intensa", "🌧️"),
    61: ("Lluvia ligera", "🌦️"),
    63: ("Lluvia", "🌧️"),
    65: ("Lluvia intensa", "🌧️"),
    71: ("Nieve ligera", "🌨️"),
    73: ("Nieve", "🌨️"),
    75: ("Nieve intensa", "❄️"),
    80: ("Chubascos", "🌦️"),
    81: ("Chubascos fuertes", "🌧️"),
    82: ("Chubascos violentos", "⛈️"),
    95: ("Tormenta", "⛈️"),
    96: ("Tormenta con granizo", "⛈️"),
    99: ("Tormenta fuerte con granizo", "⛈️"),
}


async def _fetch_one(client, tree):
    """Fetch current weather for a single tree. Never raises: a failed lookup
    just comes back with ok=False so one bad request can't sink the batch."""
    params = {
        "latitude": float(tree["latitude"]),
        "longitude": float(tree["longitude"]),
        "current": "temperature_2m,relative_humidity_2m,precipitation,weather_code",
    }
    base = {"tree_id": tree["id"], "species": tree["species"] or "—"}
    try:
        response = await client.get(OPEN_METEO_URL, params=params, timeout=10)
        response.raise_for_status()
        current = response.json().get("current", {})
        code = current.get("weather_code")
        label, emoji = WEATHER_CODES.get(code, ("—", "🌡️"))
        return {
            **base,
            "ok": True,
            "temperature": current.get("temperature_2m"),
            "humidity": current.get("relative_humidity_2m"),
            "precipitation": current.get("precipitation"),
            "condition": label,
            "emoji": emoji,
        }
    except Exception:  # noqa: BLE001
        return {**base, "ok": False}


async def _gather_weather(trees):
    # One shared HTTP client; all requests launched together and awaited as a group.
    async with httpx.AsyncClient() as client:
        tasks = [_fetch_one(client, tree) for tree in trees]
        return await asyncio.gather(*tasks)


def fetch_weather_for_trees(trees):
    """Sync entry point: returns weather for every tree, fetched concurrently.

    ``asyncio.run`` spins up an event loop for this request, runs all the
    lookups in parallel, and returns once they've all resolved.
    """
    if not trees:
        return []
    return asyncio.run(_gather_weather(trees))
