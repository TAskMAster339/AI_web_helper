import json
import logging
import re

from decouple import config
from ollama import Client
from openai import OpenAI as _OpenAI

from .circuit_breaker import CircuitBreaker

logger = logging.getLogger(__name__)

OLLAMA_BASE_URL = config("OLLAMA_BASE_URL", default="http://localhost:11434")
DEFAULT_MODEL = config("LLM_MODEL", default="alibayram/smollm3")

# Системный промпт для ассистента (только на backend)
SYSTEM_PROMPT = """Вы - полезный и дружелюбный ассистент.
Отвечайте на русском языке.
Предоставляйте четкие и информативные ответы.
Если вы не знаете ответа, честно скажите об этом."""

# Словарь действий: код -> описание (синхронизирован с App.tsx)
# Только маршруты, доступные авторизованному пользователю.
# Код 000 — специальный: означает «свободный чат», не навигация.
ACTIONS_MAP = {
    # Свободный чат (fallback — не навигационный запрос)
    "000": "Свободный чат",
    # Навигация
    "001": "Главная страница",
    "002": "Личный кабинет / Дашборд",
    "003": "Страница «О нас» / О сайте",
    "004": "Каталог товаров / Список продуктов",
    "005": "Создать новый товар / Добавить объявление",
    "006": "Панель администратора",
    "007": "Показать погоду в городе / Прогноз погоды",
    # Тема оформления
    "100": "Включить тёмную тему / тёмный режим",
    "101": "Включить светлую тему / светлый режим",
    # Управление чатом
    "200": "Закрыть / свернуть чат",
    "201": "Очистить историю чата / сбросить чат",
}

# Код, который LLM возвращает для свободного чата
CHAT_FALLBACK_CODE = "000"

ollama_circuit_breaker = CircuitBreaker(
    failure_threshold=5,
    recovery_timeout=60,
    expected_exception=Exception,
)


def build_system_prompt() -> str:
    """Построить системный промпт на основе актуального ACTIONS_MAP"""
    nav_actions = "\n".join(
        [f"  {code} — {desc}" for code, desc in ACTIONS_MAP.items() if code != "000"],
    )

    return f"""Ты — навигационный ассистент веб-приложения. По запросу пользователя определи ОДНО наиболее подходящее действие и вернуть ТОЛЬКО его трёхзначный код.

Доступные действия:
{nav_actions}

ПРАВИЛА (строго соблюдай):
1. Ответь ТОЛЬКО трёхзначным числовым кодом (например: 004).
2. Никакого текста, объяснений, знаков препинания — только код.
3. Выбирай действие, которое максимально точно соответствует намерению пользователя.
4. Если пользователь хочет перейти в личный кабинет, дашборд, свой аккаунт — код 002.
5. Если пользователь хочет посмотреть товары, каталог, продукты, объявления — код 004.
6. Если пользователь хочет создать товар, добавить объявление, продать что-то — код 005.
7. Если пользователь хочет тёмную тему, ночной режим — код 100.
8. Если пользователь хочет светлую тему — код 101.
9. Если пользователь хочет открыть панель администратора, админку — код 006.
10. Если пользователь спрашивает о погоде в каком-либо городе — код 007.
11. Если пользователь хочет закрыть, свернуть или скрыть чат/ассистента — код 200.
12. Если пользователь хочет очистить, сбросить историю чата или удалить сообщения — код 201.
13. Если запрос НЕ является навигационным (вопрос, просьба, разговор) — код 000.
"""


NAVIGATION_SYSTEM_PROMPT = build_system_prompt()

# Базовый промпт для извлечения фильтров — категории подставляются динамически в get_product_filters()
FILTERS_SYSTEM_PROMPT_TEMPLATE = """Ты — ассистент для фильтрации каталога товаров.
Извлеки из запроса пользователя параметры фильтрации и верни их ТОЛЬКО в виде JSON.

Доступные параметры:
- search: строка поиска по названию/описанию товара
- min_price: минимальная цена (число)
- max_price: максимальная цена (число)
- in_stock: true если пользователь хочет только товары в наличии, false если только отсутствующие
- category_name: ТОЧНОЕ название категории из списка ниже (или отсутствует, если не указана)
- status: статус товара — одно из: "published", "draft", "archived"

{categories_block}

ПРАВИЛА:
1. Верни ТОЛЬКО валидный JSON без пояснений. Пример: {{"max_price": 1000, "in_stock": true}}
2. Включай только те параметры, которые явно указаны или однозначно подразумеваются.
3. Если параметр не указан — не включай его в JSON.
4. Если ничего не удалось извлечь — верни {{}}
5. Цены указывай числами без единиц измерения.
6. Для in_stock: "в наличии", "есть", "доступны" → true; "нет в наличии", "отсутствуют" → false.
7. Для status: "опубликованные" → "published"; "черновики" → "draft"; "архив" → "archived".
8. Для category_name: выбери НАИБОЛЕЕ подходящую категорию из списка выше. Верни её название ТОЧНО как в списке.
"""


WEATHER_CITY_PROMPT = """Ты — ассистент для извлечения названия города из запроса о погоде.
Извлеки название города и верни его ТОЛЬКО в виде JSON.

Формат ответа: {"city": "<название города>"}

ПРАВИЛА:
1. Верни ТОЛЬКО валидный JSON, без пояснений.
2. Сохраняй название города в том виде, в каком оно указано в запросе (русский или английский).
3. Если город не указан — верни {"city": "Москва"}.
4. Пиши название города с заглавной буквы.
"""


def build_filters_prompt(categories: list[str] | None = None) -> str:
    """Построить промпт фильтрации, подставив список реальных категорий."""
    if categories:
        cats = "\n".join(f"  - {c}" for c in categories)
        block = f"Доступные категории (используй ТОЛЬКО эти названия):\n{cats}"
    else:
        block = "Категории: не заданы (используй category_name как строку поиска)."
    return FILTERS_SYSTEM_PROMPT_TEMPLATE.format(categories_block=block)


class OllamaService:
    """Сервис для работы с Ollama LLM"""

    @staticmethod
    def clean_response(text: str) -> str:
        """Удалить теги <think> из ответа"""
        cleaned = re.sub(r"<think>[\s\S]*?</think>", "", text)
        return cleaned.strip()

    @staticmethod
    def get_client() -> Client:
        """Получить Ollama клиент"""
        return Client(host=OLLAMA_BASE_URL)

    @staticmethod
    def generate_response(question: str, model: str = DEFAULT_MODEL) -> str:
        """
        Отправляет вопрос в Ollama с системным промптом и получает ответ

        Args:
            question: текст вопроса
            model: имя модели (по умолчанию alibayram/smollm3)

        Returns:
            str: ответ от модели
        """
        try:
            return ollama_circuit_breaker.call(
                OllamaService._generate_response_impl,
                question,
                model,
            )
        except Exception as e:
            logger.error("Circuit breaker error: %s", e)
            return "Ошибка: LLM сервис временно недоступен. Попробуйте позже."

    @staticmethod
    def _generate_response_impl(question: str, model: str = DEFAULT_MODEL) -> str:
        """Внутренняя реализация generate_response без circuit breaker."""
        try:
            client = OllamaService.get_client()

            response = client.chat(
                model=model,
                messages=[
                    {
                        "role": "system",
                        "content": SYSTEM_PROMPT,
                    },
                    {
                        "role": "user",
                        "content": question,
                    },
                ],
                stream=False,
            )

            raw_answer = response.get("message", {}).get(
                "content",
                "Не удалось получить ответ от модели",
            )

            # Очистить ответ от тегов <think>
            return OllamaService.clean_response(raw_answer)

        except ConnectionError:
            logger.error(f"Не удалось подключиться к Ollama на {OLLAMA_BASE_URL}")  # noqa: G004
            return "Ошибка: LLM сервис недоступен"
        except TimeoutError:
            logger.error("Таймаут при обращении к Ollama")
            return "Ошибка: Истекло время ожидания ответа"
        except Exception as e:
            logger.error(f"Ошибка при работе с Ollama: {e!s}")  # noqa: G004
            return f"Ошибка: {e!s}"

    @staticmethod
    def get_action_code(question: str, model: str = DEFAULT_MODEL) -> str:
        """
        Получить код действия на основе вопроса пользователя.
        LLM должна вернуть трехзначный код из ACTIONS_MAP.

        Args:
            question: текст вопроса пользователя
            model: имя модели (по умолчанию alibayram/smollm3)

        Returns:
            str: код действия из ACTIONS_MAP или 001 если ошибка
        """
        try:
            client = OllamaService.get_client()

            response = client.chat(
                model=model,
                messages=[
                    {
                        "role": "system",
                        "content": NAVIGATION_SYSTEM_PROMPT,
                    },
                    {
                        "role": "user",
                        "content": f"{question}\n\nОтвет (только код):",
                    },
                ],
                stream=False,
                options={
                    "temperature": 0.1,  # Низкая температура для консистентности
                    "top_p": 0.9,
                },
            )

            llm_response = response.get("message", {}).get("content", "").strip()
            logger.info(f"LLM action response: {llm_response}")  # noqa: G004

            # Извлечь первый трёхзначный код из ответа
            match = re.search(r"\d{3}", llm_response)
            action_code = match.group(0) if match else CHAT_FALLBACK_CODE

            # Неизвестный код → свободный чат
            if action_code not in ACTIONS_MAP:
                logger.warning(
                    f"Action code {action_code} not in ACTIONS_MAP, fallback to {CHAT_FALLBACK_CODE}",  # noqa: G004
                )
                action_code = CHAT_FALLBACK_CODE

            logger.info(f"Extracted action code: {action_code}")  # noqa: G004
            return action_code

        except ConnectionError:
            logger.error(f"Не удалось подключиться к Ollama на {OLLAMA_BASE_URL}")  # noqa: G004
            return CHAT_FALLBACK_CODE
        except TimeoutError:
            logger.error("Таймаут при обращении к Ollama")
            return CHAT_FALLBACK_CODE
        except Exception as e:
            logger.error(f"Ошибка при получении кода действия: {e!s}", exc_info=True)  # noqa: G004, G201
            return CHAT_FALLBACK_CODE

    @staticmethod
    def list_available_models() -> list:
        """Получить список доступных моделей в Ollama"""
        try:
            client = OllamaService.get_client()
            logger.info("Получение списка моделей...")

            response = client.list()
            logger.info(f"Ответ от Ollama: {response}")  # noqa: G004

            models = response.get("models", [])
            logger.info(f"Найдено моделей: {len(models)}")  # noqa: G004

            # Возвращаем список названий моделей
            model_names = []
            for model in models:
                # Пробуем как атрибут объекта
                model_name = getattr(model, "model", None)

                # Если атрибута нет, пробуем как словарь
                if model_name is None and isinstance(model, dict):
                    model_name = model.get("name") or model.get("model")

                if model_name:
                    model_names.append(model_name)

            logger.info(f"Итоговый список моделей: {model_names}")  # noqa: G004
            return model_names

        except ConnectionError as e:
            logger.error(f"Не удалось подключиться к Ollama: {e!s}")  # noqa: G004
            return []
        except Exception as e:
            logger.error(  # noqa: G201
                f"Ошибка при получении списка моделей: {e!s}",  # noqa: G004
                exc_info=True,
            )
            return []

    @staticmethod
    def get_product_filters(
        question: str,
        model: str = DEFAULT_MODEL,
        categories: list[str] | None = None,
    ) -> dict:
        """Extract product catalogue filters from a free-text query via LLM."""
        try:
            client = OllamaService.get_client()
            prompt = build_filters_prompt(categories)
            response = client.chat(
                model=model,
                messages=[
                    {"role": "system", "content": prompt},
                    {"role": "user", "content": question},
                ],
                stream=False,
                options={"temperature": 0.1, "top_p": 0.9},
            )
            raw = response.get("message", {}).get("content", "").strip()
            raw = OllamaService.clean_response(raw)
            logger.info("OllamaService filters raw: %s", raw)
            match = re.search(r"\{[^{}]*\}", raw, re.DOTALL)
            if not match:
                return {}
            return json.loads(match.group(0))
        except Exception as e:
            logger.error("OllamaService.get_product_filters error: %s", e)
            return {}

    @staticmethod
    def get_weather_city(question: str, model: str = DEFAULT_MODEL) -> str:
        """Extract city name (in English) from a weather query via LLM."""
        try:
            client = OllamaService.get_client()
            response = client.chat(
                model=model,
                messages=[
                    {"role": "system", "content": WEATHER_CITY_PROMPT},
                    {"role": "user", "content": question},
                ],
                stream=False,
                options={"temperature": 0.1, "top_p": 0.9},
            )
            raw = response.get("message", {}).get("content", "").strip()
            raw = OllamaService.clean_response(raw)
            logger.info("OllamaService weather_city raw: %s", raw)
            match = re.search(r"\{[^{}]*\}", raw, re.DOTALL)
            if not match:
                return "Москва"
            data = json.loads(match.group(0))
            return data.get("city", "Москва") or "Москва"
        except Exception as e:
            logger.error("OllamaService.get_weather_city error: %s", e)
            return "Москва"


# ─────────────────────────────────────────────────────────────────────────────
# External LLM service — Сбер GigaChat через Cloud.ru Foundation Models API
# OpenAI-совместимый эндпоинт: https://foundation-models.api.cloud.ru/v1
# Документация: https://developers.sber.ru/portal/products/gigachat
# ─────────────────────────────────────────────────────────────────────────────

SBER_API_KEY = config("SBER_API_KEY", default="")
SBER_API_URL = config(
    "SBER_API_URL",
    default="https://foundation-models.api.cloud.ru/v1",
)
SBER_DEFAULT_MODEL = config("SBER_DEFAULT_MODEL", default="ai-sage/GigaChat3-10B-A1.8B")

EXTERNAL_LLM_MODELS: list[str] = [
    m.strip()
    for m in config(
        "EXTERNAL_LLM_MODELS",
        default="ai-sage/GigaChat3-10B-A1.8B,zai-org/GLM-4.7-Flash,zai-org/GLM-4.7,Qwen/Qwen3-Coder-Next,t-tech/T-pro-it-2.1",
    ).split(",")
    if m.strip()
]


def _get_sber_client() -> _OpenAI:
    """Вернуть OpenAI-клиент, настроенный на Cloud.ru Foundation Models."""
    if not SBER_API_KEY:
        raise ExternalLLMServiceError(
            "SBER_API_KEY не задан. Укажите его в .env",
        )
    return _OpenAI(api_key=SBER_API_KEY, base_url=SBER_API_URL)


class ExternalLLMServiceError(Exception):
    """Ошибка при обращении к внешнему LLM (Сбер GigaChat)."""


class ExternalLLMService:
    """
    Вызывает Сбер GigaChat через OpenAI-совместимый API Cloud.ru.

    Все публичные методы имеют те же сигнатуры, что и OllamaService,
    поэтому views могут переключаться между провайдерами без изменений.
    """

    @staticmethod
    def _chat(
        model: str,
        messages: list,
        options: dict | None = None,
    ) -> str:
        """Отправить messages в Сбер API, вернуть текст ответа."""
        try:
            client = _get_sber_client()
            kwargs: dict = {
                "model": model,
                "messages": messages,
                "max_tokens": 2500,
                "temperature": 0.5,
                "top_p": 0.95,
                "presence_penalty": 0,
            }
            # Перекрыть параметры из options (например temperature=0.1 для navigate)
            if options:
                for key in ("temperature", "top_p", "max_tokens", "presence_penalty"):
                    if key in options:
                        kwargs[key] = options[key]

            resp = client.chat.completions.create(**kwargs)
            return resp.choices[0].message.content or ""
        except ExternalLLMServiceError:
            raise
        except Exception as exc:
            raise ExternalLLMServiceError(f"Сбер API error: {exc}") from exc

    @staticmethod
    def clean_response(text: str) -> str:
        """Удалить теги <think> из ответа."""
        return re.sub(r"<think>[\s\S]*?</think>", "", text).strip()

    @staticmethod
    def generate_response(question: str, model: str = SBER_DEFAULT_MODEL) -> str:
        """Отправить вопрос в GigaChat, вернуть очищенный ответ."""
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": question},
        ]
        try:
            raw = ExternalLLMService._chat(model, messages)
            return (
                ExternalLLMService.clean_response(raw)
                or "Не удалось получить ответ от модели"
            )
        except ExternalLLMServiceError as exc:
            logger.error("ExternalLLMService.generate_response error: %s", exc)
            return f"Ошибка GigaChat: {exc}"

    @staticmethod
    def get_action_code(question: str, model: str = SBER_DEFAULT_MODEL) -> str:
        """Получить трёхзначный код навигационного действия от GigaChat."""
        messages = [
            {"role": "system", "content": NAVIGATION_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": f"{question}\n\nОтвет (только код):",
            },
        ]
        try:
            raw = ExternalLLMService._chat(
                model,
                messages,
                options={"temperature": 0.1, "top_p": 0.9},
            )
            llm_response = ExternalLLMService.clean_response(raw)
            logger.info("External LLM action response: %s", llm_response)

            match = re.search(r"\d{3}", llm_response)
            action_code = match.group(0) if match else CHAT_FALLBACK_CODE
            if action_code not in ACTIONS_MAP:
                logger.warning(
                    "External action code %s not in ACTIONS_MAP, fallback to %s",
                    action_code,
                    CHAT_FALLBACK_CODE,
                )
                action_code = CHAT_FALLBACK_CODE
            logger.info("External extracted action code: %s", action_code)
            return action_code
        except ExternalLLMServiceError as exc:
            logger.error("ExternalLLMService.get_action_code error: %s", exc)
            return CHAT_FALLBACK_CODE

    @staticmethod
    def get_product_filters(
        question: str,
        model: str = SBER_DEFAULT_MODEL,
        categories: list[str] | None = None,
    ) -> dict:
        """Extract product catalogue filters from a free-text query via GigaChat."""
        prompt = build_filters_prompt(categories)
        messages = [
            {"role": "system", "content": prompt},
            {"role": "user", "content": question},
        ]
        try:
            raw = ExternalLLMService._chat(
                model,
                messages,
                options={"temperature": 0.1, "top_p": 0.9},
            )
            raw = ExternalLLMService.clean_response(raw)
            logger.info("ExternalLLMService filters raw: %s", raw)
            match = re.search(r"\{[^{}]*\}", raw, re.DOTALL)
            if not match:
                return {}
            return json.loads(match.group(0))
        except Exception as e:
            logger.error("ExternalLLMService.get_product_filters error: %s", e)
            return {}

    @staticmethod
    def get_weather_city(question: str, model: str = SBER_DEFAULT_MODEL) -> str:
        """Extract city name (in English) from a weather query via GigaChat."""
        messages = [
            {"role": "system", "content": WEATHER_CITY_PROMPT},
            {"role": "user", "content": question},
        ]
        try:
            raw = ExternalLLMService._chat(
                model,
                messages,
                options={"temperature": 0.1, "top_p": 0.9},
            )
            raw = ExternalLLMService.clean_response(raw)
            logger.info("ExternalLLMService weather_city raw: %s", raw)
            match = re.search(r"\{[^{}]*\}", raw, re.DOTALL)
            if not match:
                return "Москва"
            data = json.loads(match.group(0))
            return data.get("city", "Москва") or "Москва"
        except Exception as e:
            logger.error("ExternalLLMService.get_weather_city error: %s", e)
            return "Москва"

    @staticmethod
    def list_available_models() -> list:
        """
        Вернуть фиксированный список разрешённых моделей из .env (EXTERNAL_LLM_MODELS).
        Не обращаемся к API — платформа отдаёт все модели без фильтрации.
        """
        return EXTERNAL_LLM_MODELS
