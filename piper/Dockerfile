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

# Install Flask
RUN pip install flask --no-cache-dir

# Copy server and download script
COPY server.py /app/server.py
COPY download-voices.sh /app/download-voices.sh
RUN chmod +x /app/download-voices.sh

EXPOSE 10200

# Download voices on startup, then run server
CMD ["/bin/bash", "-c", "/app/download-voices.sh && python /app/server.py"]
