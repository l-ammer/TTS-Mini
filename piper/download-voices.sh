#!/bin/bash
set -e

VOICES_DIR="/usr/share/piper-voices"
mkdir -p "$VOICES_DIR"

echo "Downloading Piper voices..."

# Download de-thorsten-medium (primary voice)
if [ ! -f "$VOICES_DIR/de-thorsten-medium.onnx" ]; then
    echo "Downloading de-thorsten-medium..."
    curl -L -o "$VOICES_DIR/de-thorsten-medium.onnx" \
        "https://huggingface.co/rhasspy/piper-voices/resolve/main/de/de_THORSTEN/de-thorsten-medium.onnx?download=true" \
        || echo "Failed to download medium voice"
fi

if [ ! -f "$VOICES_DIR/de-thorsten-medium.onnx.json" ]; then
    curl -L -o "$VOICES_DIR/de-thorsten-medium.onnx.json" \
        "https://huggingface.co/rhasspy/piper-voices/resolve/main/de/de_THORSTEN/de-thorsten-medium.onnx.json?download=true" \
        || echo "Failed to download medium config"
fi

# Download de-thorsten-low (optional)
if [ ! -f "$VOICES_DIR/de-thorsten-low.onnx" ]; then
    echo "Downloading de-thorsten-low..."
    curl -L -o "$VOICES_DIR/de-thorsten-low.onnx" \
        "https://huggingface.co/rhasspy/piper-voices/resolve/main/de/de_THORSTEN/de-thorsten-low.onnx?download=true" \
        || echo "Failed to download low voice"
fi

if [ ! -f "$VOICES_DIR/de-thorsten-low.onnx.json" ]; then
    curl -L -o "$VOICES_DIR/de-thorsten-low.onnx.json" \
        "https://huggingface.co/rhasspy/piper-voices/resolve/main/de/de_THORSTEN/de-thorsten-low.onnx.json?download=true" \
        || echo "Failed to download low config"
fi

# Download de-thorsten-high (optional)
if [ ! -f "$VOICES_DIR/de-thorsten-high.onnx" ]; then
    echo "Downloading de-thorsten-high..."
    curl -L -o "$VOICES_DIR/de-thorsten-high.onnx" \
        "https://huggingface.co/rhasspy/piper-voices/resolve/main/de/de_THORSTEN/de-thorsten-high.onnx?download=true" \
        || echo "Failed to download high voice"
fi

if [ ! -f "$VOICES_DIR/de-thorsten-high.onnx.json" ]; then
    curl -L -o "$VOICES_DIR/de-thorsten-high.onnx.json" \
        "https://huggingface.co/rhasspy/piper-voices/resolve/main/de/de_THORSTEN/de-thorsten-high.onnx.json?download=true" \
        || echo "Failed to download high config"
fi

echo "Voice download complete!"
ls -la "$VOICES_DIR/"
