FROM python:3.11-slim

WORKDIR /app

# Install dependencies including git
RUN apt-get update && apt-get install -y \
    curl \
    git \
    git-lfs \
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

# Clone piper-voices repository (contains all voice models)
RUN git lfs install \
    && git clone --depth 1 --filter=blob:none --sparse \
       "https://github.com/rhasspy/piper-voices.git" /tmp/piper-voices \
    && cd /tmp/piper-voices \
    && git sparse-checkout set de/de_THORSTEN \
    && git checkout

# Copy German voices to target directory
RUN mkdir -p /usr/share/piper-voices \
    && cp /tmp/piper-voices/de/de_THORSTEN/*.onnx /usr/share/piper-voices/ 2>/dev/null || true \
    && cp /tmp/piper-voices/de/de_THORSTEN/*.json /usr/share/piper-voices/ 2>/dev/null || true \
    && rm -rf /tmp/piper-voices \
    && ls -la /usr/share/piper-voices/

# Create simple HTTP server script for TTS
RUN pip install flask --no-cache-dir

COPY server.py /app/server.py

# Ensure piper is executable
RUN if [ -f /app/piper/piper ]; then chmod +x /app/piper/piper; fi \
    && if [ -f /app/piper ]; then chmod +x /app/piper; fi

EXPOSE 10200

CMD ["python", "/app/server.py"]
