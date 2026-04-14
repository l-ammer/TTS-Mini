FROM python:3.11-slim

WORKDIR /app

# Install dependencies
RUN apt-get update && apt-get install -y \
    curl \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

# Download and extract Piper binary
RUN curl -L -o piper_linux_x86_64.tar.gz \
    "https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_linux_x86_64.tar.gz" \
    && tar -xzf piper_linux_x86_64.tar.gz \
    && rm piper_linux_x86_64.tar.gz \
    && ls -la /app/

# Set PATH to include piper directory
ENV PATH="/app/piper:${PATH}"

# Download German voices
RUN mkdir -p /usr/share/piper-voices \
    && curl -L -o /usr/share/piper-voices/de-thorsten-medium.onnx \
    "https://huggingface.co/rhasspy/piper-voices/resolve/main/de/de_THORSTEN/de-thorsten-medium.onnx" \
    && curl -L -o /usr/share/piper-voices/de-thorsten-medium.onnx.json \
    "https://huggingface.co/rhasspy/piper-voices/resolve/main/de/de_THORSTEN/de-thorsten-medium.onnx.json" \
    && ls -la /usr/share/piper-voices/

# Create simple HTTP server script for TTS
RUN pip install flask --no-cache-dir

COPY server.py /app/server.py

# Ensure piper is executable
RUN if [ -f /app/piper/piper ]; then chmod +x /app/piper/piper; fi \
    && if [ -f /app/piper ]; then chmod +x /app/piper; fi

EXPOSE 10200

CMD ["python", "/app/server.py"]
