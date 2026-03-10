# Makefile для управления Docker dev окружением

.PHONY: help dev dev-build dev-down dev-logs dev-restart dev-clean frontend-shell backend-shell db-shell install-frontend install-backend

# По умолчанию показываем help
help:
  @echo "🐳 Docker Development Commands:"
  @echo ""
  @echo "  make dev              - Запустить все сервисы (Frontend + Backend + DB)"
  @echo "  make dev-build        - Пересобрать и запустить"
  @echo "  make dev-down         - Остановить все сервисы"
  @echo "  make dev-logs         - Показать логи всех сервисов"
  @echo "  make dev-restart      - Перезапустить сервисы"
  @echo "  make dev-clean        - Полная очистка (контейнеры + volumes)"
  @echo ""
  @echo "  make frontend-shell   - Открыть shell в frontend контейнере"
  @echo "  make backend-shell    - Открыть shell в backend контейнере"
  @echo "  make db-shell         - Открыть psql в DB"
  @echo ""
  @echo "  make install-frontend - Установить npm пакет в frontend"
  @echo "  make install-backend  - Установить pip пакет в backend"

# Запустить dev окружение
dev:
  docker-compose -f docker-compose.dev.yml up

# Запустить в фоне
dev-bg:
  docker-compose -f docker-compose.dev.yml up -d

# Пересобрать и запустить
dev-build:
  docker-compose -f docker-compose.dev.yml up --build

# Остановить
dev-down:
  docker-compose -f docker-compose.dev.yml down

# Показать логи
dev-logs:
  docker-compose -f docker-compose.dev.yml logs -f

# Логи только frontend
frontend-logs:
  docker-compose -f docker-compose.dev.yml logs -f frontend-dev

# Логи только backend
backend-logs:
  docker-compose -f docker-compose.dev.yml logs -f backend

# Перезапустить
dev-restart:
  docker-compose -f docker-compose.dev.yml restart

# Полная очистка
dev-clean:
  docker-compose -f docker-compose.dev.yml down -v
  docker system prune -f

# Shell в frontend контейнере
frontend-shell:
  docker exec -it frontend sh

# Shell в backend контейнере
backend-shell:
  docker exec -it backend sh

# PostgreSQL shell
db-shell:
  docker exec -it postgres_db psql -U workuser -d workdb

# Установить npm пакет в frontend
install-frontend:
  @read -p "Введите имя пакета: " package; \
  docker exec frontend npm install $$package

# Установить pip пакет в backend
install-backend:
  @read -p "Введите имя пакета: " package; \
  docker exec backend pip install $$package

# Запустить линтер frontend
lint-frontend:
  docker exec frontend npm run lint

# Запустить type-check frontend
typecheck-frontend:
  docker exec frontend npm run type-check

# Форматирование frontend
format-frontend:
  docker exec frontend npm run format

# Миграции Django
migrate:
  docker exec backend python manage.py migrate

# Создать суперпользователя Django
createsuperuser:
  docker exec -it backend python manage.py createsuperuser

# Показать статус контейнеров
status:
  docker-compose -f docker-compose.dev.yml ps
