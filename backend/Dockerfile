FROM python:3.13-slim

WORKDIR /app

COPY ../requirements.txt ./requirements.txt

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

COPY ../.env .env

RUN python backend/manage.py collectstatic --noinput

EXPOSE 8000

CMD ["python", "backend/manage.py", "runserver", "0.0.0.0:8000"]
