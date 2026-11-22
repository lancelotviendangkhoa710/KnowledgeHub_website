FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY requirements.txt .
# CV-RAG is CPU-only; install the pinned CPU wheel before sentence-transformers
# so pip does not pull CUDA runtimes into the service image.
RUN pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu torch==2.6.0+cpu \
    && pip install --no-cache-dir -r requirements.txt
COPY app ./app
COPY tests ./tests
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
