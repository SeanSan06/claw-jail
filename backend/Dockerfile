FROM python:3.12-slim
WORKDIR /app
COPY . .
RUN pip install --no-cache-dir -r requirements.txt
ENV PYTHONAPP=/app
EXPOSE 8000
CMD ["fastapi", "run", "main.py"]