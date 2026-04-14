FROM python:3.11-slim

WORKDIR /app

# Install dependencies
RUN apt-get update && apt-get install -y \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

# Install piper-tts via pip (includes voice download support)
RUN pip install piper-tts --no-cache-dir

# Install Flask for HTTP server
RUN pip install flask --no-cache-dir

# Copy server
COPY server.py /app/server.py

EXPOSE 10200

CMD ["python", "/app/server.py"]
