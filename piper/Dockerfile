FROM python:3.11-slim

WORKDIR /app

# Install dependencies
RUN apt-get update && apt-get install -y \
    libsndfile1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install piper-tts via pip (includes voice download support)
RUN pip install piper-tts --no-cache-dir

# Install Flask for HTTP server
RUN pip install flask --no-cache-dir

# Pre-download default voice (de-thorsten-medium) for faster startup
# Cache in image so it doesn't download on every container start
# Voices hosted on HuggingFace (rhasspy/piper-voices)
RUN mkdir -p /usr/share/piper-voices && \
    curl -L -o /usr/share/piper-voices/de-thorsten-medium.onnx \
        "https://huggingface.co/rhasspy/piper-voices/resolve/main/de/de_DE/thorsten/medium/de_DE-thorsten-medium.onnx" && \
    curl -L -o /usr/share/piper-voices/de-thorsten-medium.onnx.json \
        "https://huggingface.co/rhasspy/piper-voices/resolve/main/de/de_DE/thorsten/medium/de_DE-thorsten-medium.onnx.json"

# Copy server
COPY server.py /app/server.py

EXPOSE 10200

CMD ["python", "/app/server.py"]
