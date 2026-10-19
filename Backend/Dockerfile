FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

COPY requirements.lock .
RUN python -m pip install --no-cache-dir --upgrade pip==26.2.1 \
    && python -m pip install --no-cache-dir --only-binary=:all: -r requirements.lock

COPY . .

RUN groupadd --system app && useradd --system --gid app --home-dir /app app \
    && mkdir -p /app/uploads && chown app:app /app/uploads

USER app

EXPOSE 8000

CMD ["python", "-m", "app.entrypoint"]
