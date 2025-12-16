import logging
import re

from decouple import config
from ollama import Client

logger = logging.getLogger(__name__)

OLLAMA_BASE_URL = config("OLLAMA_BASE_URL", default="http://localhost:11434")
DEFAULT_MODEL = config("LLM_MODEL", default="alibayram/smollm3")

# Системный промпт для ассистента (только на backend)
SYSTEM_PROMPT = """Вы - полезный и дружелюбный ассистент.
Отвечайте на русском языке.
Предоставляйте четкие и информативные ответы.
Если вы не знаете ответа, честно скажите об этом."""  # noqa: RUF001

# Словарь действий: код -> описание
ACTIONS_MAP = {
    "001": "Главная страница",
    "002": "Страница входа (логин)",
    "003": "Регистрация нового пользователя",
    "004": "Личный кабинет / Дашборд",
    "005": "Информация о сайте",  # noqa: RUF001
    "006": "Восстановление пароля",
    "007": "Профиль пользователя",
    "100": "Темный режим",
    "101": "Светлый режим",
}


def build_system_prompt() -> str:
    """Построить системный промпт на основе актуального ACTIONS_MAP"""
    actions_list = "\n".join([f"{code} - {desc}" for code, desc in ACTIONS_MAP.items()])

    return f"""Ты помощник для определения нужного действия.
Когда пользователь пишет, что ему нужно, определи нужное действие из списка и ответь ТОЛЬКО КОДОМ (число из 3 цифр).

Доступные действия:
{actions_list}

ПРАВИЛА:
- Ответь ТОЛЬКО числовым кодом (например: 002)
- Никаких других символов, объяснений или пунктуации
- Если не уверен - ответь 001
"""


NAVIGATION_SYSTEM_PROMPT = build_system_prompt()


class OllamaService:
    """Сервис для работы с Ollama LLM"""  # noqa: RUF002

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
        """  # noqa: RUF002
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
                "Не удалось получить ответ от модели",  # noqa: RUF001
            )

            # Очистить ответ от тегов <think>
            return OllamaService.clean_response(raw_answer)

        except ConnectionError:
            logger.error(f"Не удалось подключиться к Ollama на {OLLAMA_BASE_URL}")  # noqa: G004, RUF001
            return "Ошибка: LLM сервис недоступен"
        except TimeoutError:
            logger.error("Таймаут при обращении к Ollama")
            return "Ошибка: Истекло время ожидания ответа"
        except Exception as e:
            logger.error(f"Ошибка при работе с Ollama: {e!s}")  # noqa: G004, RUF001
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
                        "content": f"{question}\n\nОтвет (только код):",  # noqa: RUF001
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

            # Исключить первый найденный трёхзначный код
            match = re.search(r"\d{3}", llm_response)
            action_code = match.group(0) if match else "001"

            # Проверить, что код есть в ACTIONS_MAP
            if action_code not in ACTIONS_MAP:
                logger.warning(
                    f"Action code {action_code} not in ACTIONS_MAP, fallback to 001",  # noqa: G004
                )
                action_code = "001"

            logger.info(f"Extracted action code: {action_code}")  # noqa: G004
            return action_code

        except ConnectionError:
            logger.error(f"Не удалось подключиться к Ollama на {OLLAMA_BASE_URL}")  # noqa: G004, RUF001
            return "001"  # Fallback на главную
        except TimeoutError:
            logger.error("Таймаут при обращении к Ollama")
            return "001"  # Fallback на главную
        except Exception as e:
            logger.error(f"Ошибка при получении кода действия: {e!s}", exc_info=True)  # noqa: G004, G201
            return "001"  # Fallback на главную

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
            logger.error(f"Не удалось подключиться к Ollama: {e!s}")  # noqa: G004, RUF001
            return []
        except Exception as e:
            logger.error(  # noqa: G201
                f"Ошибка при получении списка моделей: {e!s}",  # noqa: G004
                exc_info=True,
            )
            return []
