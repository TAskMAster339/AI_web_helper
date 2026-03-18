import pytest
import requests
from api.weather_service import WeatherService, WeatherServiceError

pytestmark = pytest.mark.unit


def test_normalize_maps_fields():
    raw = {
        "name": "Moscow",
        "sys": {"country": "RU"},
        "main": {"temp": 20.4, "feels_like": 19.6, "humidity": 50},
        "weather": [{"description": "clear sky", "icon": "01d"}],
        "wind": {"speed": 3.2},
    }
    norm = WeatherService._normalize(raw)  # noqa: SLF001
    assert norm["city"] == "Moscow"
    assert norm["country"] == "RU"
    assert norm["temperature"] == 20  # noqa: PLR2004
    assert norm["feels_like"] == 20  # noqa: PLR2004
    assert norm["humidity"] == 50  # noqa: PLR2004
    assert norm["description"] == "Clear sky"
    assert norm["icon"] == "01d"
    assert norm["wind_speed"] == 3.2  # noqa: PLR2004
    assert norm["source"] == "openweathermap"


def test_get_weather_raises_if_api_key_missing(settings):
    settings.OPENWEATHER_API_KEY = ""
    with pytest.raises(WeatherServiceError):
        WeatherService.get_weather("Moscow")


def test_get_weather_not_found_raises(monkeypatch, settings):
    settings.OPENWEATHER_API_KEY = "x"

    class Resp:
        status_code = 404

        def raise_for_status(self):
            raise AssertionError("should not be called")

    monkeypatch.setattr(requests, "get", lambda *a, **k: Resp())

    with pytest.raises(WeatherServiceError, match="City not found"):
        WeatherService.get_weather("NoSuchCity")


def test_get_weather_retries_on_timeout(monkeypatch, settings):
    settings.OPENWEATHER_API_KEY = "x"

    calls = {"n": 0}

    def fake_get(*_a, **_k):
        calls["n"] += 1
        raise requests.Timeout

    monkeypatch.setattr(requests, "get", fake_get)

    # avoid real sleeping
    monkeypatch.setattr("api.weather_service.time.sleep", lambda *_a, **_k: None)
    monkeypatch.setattr("api.weather_service._rate_limit", lambda: None)

    with pytest.raises(WeatherServiceError, match="unavailable"):
        WeatherService.get_weather("Moscow")

    assert calls["n"] == WeatherService.MAX_RETRIES
