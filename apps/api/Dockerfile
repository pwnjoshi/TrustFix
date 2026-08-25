FROM python:3.12-slim AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PORT=8080
WORKDIR /app
COPY apps/api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY apps/api/app ./app
COPY agents ./agents
RUN useradd --create-home --uid 10001 trustfix && chown -R trustfix:trustfix /app
USER trustfix
CMD ["sh", "-c", "uvicorn ${TRUSTFIX_APP_MODULE:-app.main:app} --host 0.0.0.0 --port ${PORT}"]
