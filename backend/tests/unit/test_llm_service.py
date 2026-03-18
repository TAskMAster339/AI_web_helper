import pytest
from api.llm_service import OllamaService

pytestmark = pytest.mark.unit


def test_clean_response_strips_think_block():
    text = "Hello <think>secret</think> world"
    assert OllamaService.clean_response(text) == "Hello  world".strip()


def test_get_action_code_extracts_first_3_digits(monkeypatch):
    class DummyClient:
        def chat(self, **_kwargs):
            return {"message": {"content": "Some text 004 and more"}}

    monkeypatch.setattr(
        OllamaService,
        "get_client",
        staticmethod(lambda: DummyClient()),
    )

    assert OllamaService.get_action_code("show products") == "004"


def test_get_action_code_falls_back_on_unknown_code(monkeypatch):
    class DummyClient:
        def chat(self, **_kwargs):
            return {"message": {"content": "999"}}

    monkeypatch.setattr(
        OllamaService,
        "get_client",
        staticmethod(lambda: DummyClient()),
    )

    assert OllamaService.get_action_code("do something") == "000"


def test_get_product_filters_parses_json_from_response(monkeypatch):
    class DummyClient:
        def chat(self, **_kwargs):
            return {
                "message": {
                    "content": "<think>..</think>"
                    ' {"max_price": 1000, "in_stock": true}',
                },
            }

    monkeypatch.setattr(
        OllamaService,
        "get_client",
        staticmethod(lambda: DummyClient()),
    )

    assert OllamaService.get_product_filters("до 1000 в наличии") == {
        "max_price": 1000,
        "in_stock": True,
    }


def test_get_product_filters_returns_empty_on_invalid_json(monkeypatch):
    class DummyClient:
        def chat(self, **_kwargs):
            return {"message": {"content": "{invalid json"}}

    monkeypatch.setattr(
        OllamaService,
        "get_client",
        staticmethod(lambda: DummyClient()),
    )

    assert OllamaService.get_product_filters("bad") == {}


def test_get_weather_city_defaults_to_moscow_when_no_json(monkeypatch):
    class DummyClient:
        def chat(self, **_kwargs):
            return {"message": {"content": "город не указан"}}

    monkeypatch.setattr(
        OllamaService,
        "get_client",
        staticmethod(lambda: DummyClient()),
    )

    assert OllamaService.get_weather_city("погода") == "Москва"


def test_get_weather_city_parses_city_from_json(monkeypatch):
    class DummyClient:
        def chat(self, **_kwargs):
            return {"message": {"content": '{"city": "Казань"}'}}

    monkeypatch.setattr(
        OllamaService,
        "get_client",
        staticmethod(lambda: DummyClient()),
    )

    assert OllamaService.get_weather_city("погода в казани") == "Казань"
