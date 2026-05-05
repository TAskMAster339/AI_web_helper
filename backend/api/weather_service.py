"""
OpenWeatherMap API integration service.

Docs: https://openweathermap.org/current
Free tier: 1 000 calls/day, 60 calls/minute.

Usage:
    from api.weather_service import WeatherService
    data = WeatherService.get_weather("Moscow")
"""

import logging
import time
from functools import lru_cache
from http import HTTPStatus

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

# Simple in-process rate-limiter state
_last_call_time: float = 0.0
_MIN_INTERVAL: float = 1.0  # seconds between calls (60 rpm limit)


def _rate_limit() -> None:
    global _last_call_time  # noqa: PLW0603
    elapsed = time.monotonic() - _last_call_time
    if elapsed < _MIN_INTERVAL:
        time.sleep(_MIN_INTERVAL - elapsed)
    _last_call_time = time.monotonic()


class WeatherServiceError(Exception):
    """Raised when WeatherService cannot return data."""


class WeatherService:
    BASE_URL = "https://api.openweathermap.org/data/2.5/weather"
    TIMEOUT = 5  # seconds
    MAX_RETRIES = 2

    @staticmethod
    def _normalize(raw: dict) -> dict:
        """Normalize OpenWeatherMap response to app format."""
        return {
            "city": raw.get("name", ""),
            "country": raw.get("sys", {}).get("country", ""),
            "temperature": round(raw["main"]["temp"]),
            "feels_like": round(raw["main"]["feels_like"]),
            "humidity": raw["main"]["humidity"],
            "description": (
                raw["weather"][0]["description"].capitalize()
                if raw.get("weather")
                else ""
            ),
            "icon": raw["weather"][0]["icon"] if raw.get("weather") else "",
            "wind_speed": raw.get("wind", {}).get("speed", 0),
            "source": "openweathermap",
        }

    @staticmethod
    def get_weather(city: str) -> dict:
        """
        Fetch current weather for *city*.

        Raises WeatherServiceError on any failure so callers can degrade
        gracefully without crashing.
        """
        api_key = getattr(settings, "OPENWEATHER_API_KEY", None)
        if not api_key:
            raise WeatherServiceError("OPENWEATHER_API_KEY is not configured")

        params = {
            "q": city,
            "appid": api_key,
            "units": "metric",
            "lang": "ru",
        }

        last_exc: Exception | None = None
        for attempt in range(1, WeatherService.MAX_RETRIES + 1):
            try:
                _rate_limit()
                resp = requests.get(
                    WeatherService.BASE_URL,
                    params=params,
                    timeout=WeatherService.TIMEOUT,
                )
                if resp.status_code == HTTPStatus.NOT_FOUND:
                    raise WeatherServiceError(f"City not found: {city}")
                if resp.status_code == HTTPStatus.UNAUTHORIZED:
                    raise WeatherServiceError("Invalid OpenWeatherMap API key")
                resp.raise_for_status()
                return WeatherService._normalize(resp.json())
            except WeatherServiceError:
                raise
            except requests.Timeout as exc:
                last_exc = exc
                logger.warning(
                    "Weather API timeout (attempt %d/%d)",
                    attempt,
                    WeatherService.MAX_RETRIES,
                )
                time.sleep(attempt)  # exponential back-off
            except requests.RequestException as exc:
                last_exc = exc
                logger.warning(
                    "Weather API error (attempt %d/%d): %s",
                    attempt,
                    WeatherService.MAX_RETRIES,
                    exc,
                )
                time.sleep(attempt)

        raise WeatherServiceError(
            f"Weather API unavailable after {WeatherService.MAX_RETRIES} retries",
        ) from last_exc

    @staticmethod
    @lru_cache(maxsize=32)
    def get_weather_cached(city: str, _cache_key: int = 0) -> dict:
        """Cached wrapper; cache key rotates every 10 min to bust stale data."""
        return WeatherService.get_weather(city)

    @staticmethod
    def get_weather_with_cache(city: str) -> dict:
        """Return cached weather; cache key bucket rotates every 10 minutes."""
        cache_key = int(time.time()) // 600  # 10-minute buckets
        return WeatherService.get_weather_cached(city, cache_key)
