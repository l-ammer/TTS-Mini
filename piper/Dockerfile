FROM python:3.11-slim

WORKDIR /app

# Install dependencies
RUN apt-get update && apt-get install -y \
    curl \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

# Download Piper binary
RUN curl -L -o piper_amd64.tar.gz \
    "https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_linux_x86_64.tar.gz" \
    && tar -xzf piper_amd64.tar.gz \
    && rm piper_amd64.tar.gz \
    && mv piper piper_binary || true

# Set up Piper
ENV PATH="/app/piper:${PATH}"

# Download German voice
RUN mkdir -p /usr/share/piper-voices \
    && curl -L -o /usr/share/piper-voices/de-thorsten-medium.onnx \
    "https://huggingface.co/rhasspy/piper-voices/resolve/main/de/de_THORSTEN/de-thorsten-medium.onnx" \
    && curl -L -o /usr/share/piper-voices/de-thorsten-medium.onnx.json \
    "https://huggingface.co/rhasspy/piper-voices/resolve/main/de/de_THORSTEN/de-thorsten-medium.onnx.json"

# Alternative voices (optional, for choice)
RUN curl -L -o /usr/share/piper-voices/de-thorsten-low.onnx \
    "https://huggingface.co/rhasspy/piper-voices/resolve/main/de/de_THORSTEN/de-thorsten-low.onnx" \
    && curl -L -o /usr/share/piper-voices/de-thorsten-low.onnx.json \
    "https://huggingface.co/rhasspy/piper-voices/resolve/main/de/de_THORSTEN/de-thorsten-low.onnx.json" \
    && curl -L -o /usr/share/piper-voices/de-thorsten-high.onnx \
    "https://huggingface.co/rhasspy/piper-voices/resolve/main/de/de_THORSTEN/de-thorsten-high.onnx" \
    && curl -L -o /usr/share/piper-voices/de-thorsten-high.onnx.json \
    "https://huggingface.co/rhasspy/piper-voices/resolve/main/de/de_THORSTEN/de-thorsten-high.onnx.json" \
    || true

# Create simple HTTP server script for TTS
RUN pip install flask

COPY server.py /app/server.py

EXPOSE 10200

CMD ["python", "/app/server.py"]
