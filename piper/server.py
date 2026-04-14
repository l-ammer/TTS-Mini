#!/usr/bin/env python3
"""
Simple HTTP TTS server for Piper
"""
import os
import sys
import subprocess
import tempfile
import urllib.request
from flask import Flask, request, jsonify, Response

app = Flask(__name__)

DEFAULT_VOICE = os.environ.get('PIPER_VOICE', 'de-thorsten-medium')
VOICES_DIR = "/usr/share/piper-voices"

# Ensure voices directory exists
os.makedirs(VOICES_DIR, exist_ok=True)

# Voice download URLs (HuggingFace - piper-voices repo)
VOICE_URLS = {
    'de-thorsten-medium': {
        'model': 'https://huggingface.co/rhasspy/piper-voices/resolve/main/de/de_DE/thorsten/medium/de_DE-thorsten-medium.onnx',
        'config': 'https://huggingface.co/rhasspy/piper-voices/resolve/main/de/de_DE/thorsten/medium/de_DE-thorsten-medium.onnx.json'
    },
    'de-thorsten-low': {
        'model': 'https://huggingface.co/rhasspy/piper-voices/resolve/main/de/de_DE/thorsten/low/de_DE-thorsten-low.onnx',
        'config': 'https://huggingface.co/rhasspy/piper-voices/resolve/main/de/de_DE/thorsten/low/de_DE-thorsten-low.onnx.json'
    },
    'de-thorsten-high': {
        'model': 'https://huggingface.co/rhasspy/piper-voices/resolve/main/de/de_DE/thorsten/high/de_DE-thorsten-high.onnx',
        'config': 'https://huggingface.co/rhasspy/piper-voices/resolve/main/de/de_DE/thorsten/high/de_DE-thorsten-high.onnx.json'
    }
}

def download_file(url, dest):
    """Download a file with progress"""
    try:
        print(f"Downloading {url}...")
        urllib.request.urlretrieve(url, dest)
        print(f"Downloaded to {dest}")
        return True
    except Exception as e:
        print(f"Download failed: {e}")
        return False

def ensure_voice(voice_name):
    """Ensure voice files are present"""
    if voice_name not in VOICE_URLS:
        return None

    model_path = f"{VOICES_DIR}/{voice_name}.onnx"
    config_path = f"{model_path}.json"

    # Download model if needed
    if not os.path.exists(model_path) or os.path.getsize(model_path) < 1000:
        if not download_file(VOICE_URLS[voice_name]['model'], model_path):
            return None

    # Download config if needed
    if not os.path.exists(config_path) or os.path.getsize(config_path) < 100:
        if not download_file(VOICE_URLS[voice_name]['config'], config_path):
            return None

    return model_path if os.path.exists(model_path) else None

def get_piper_path():
    """Find piper executable"""
    paths = [
        '/app/piper/piper',
        'piper',
        '/usr/local/bin/piper'
    ]
    for p in paths:
        if os.path.exists(p) and os.access(p, os.X_OK):
            return p
    # Try which
    try:
        result = subprocess.run(['which', 'piper'], capture_output=True, text=True)
        if result.returncode == 0:
            return result.stdout.strip()
    except:
        pass
    return None

def synthesize(text, voice=None, speed=1.0):
    """Synthesize text using Piper"""
    if voice is None:
        voice = DEFAULT_VOICE

    voice_path = ensure_voice(voice)
    if voice_path is None:
        print(f"ERROR: Voice not available: {voice}")
        return None, f"Voice not available: {voice}"

    config_path = f"{voice_path}.json"

    # Validate text length
    text_len = len(text)
    if text_len == 0:
        return None, "Empty text"
    if text_len > 5000:
        print(f"WARNING: Text too long ({text_len} chars), truncating to 5000")
        text = text[:5000]

    input_file = None
    output_file = None

    try:
        # Create temp files
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False, encoding='utf-8') as f:
            f.write(text)
            input_file = f.name

        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
            output_file = f.name

        piper_path = get_piper_path()
        if piper_path is None:
            return None, "Piper executable not found"

        cmd = [
            piper_path,
            '--model', voice_path,
            '--config', config_path,
            '--input_file', input_file,
            '--output_file', output_file
        ]

        print(f"Synthesizing {text_len} chars...")
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)

        if result.returncode != 0:
            error_msg = result.stderr if result.stderr else "Unknown piper error"
            print(f"Piper error (code {result.returncode}): {error_msg[:200]}")
            return None, f"Piper error: {error_msg[:200]}"

        # Verify output file exists and has content
        if not os.path.exists(output_file):
            return None, "Output file not created"

        file_size = os.path.getsize(output_file)
        if file_size < 100:
            return None, f"Output file too small ({file_size} bytes)"

        with open(output_file, 'rb') as f:
            wav_data = f.read()

        print(f"Synthesized OK: {len(wav_data)} bytes")
        return wav_data, None

    except subprocess.TimeoutExpired:
        print(f"ERROR: TTS timeout after 60s for {text_len} chars")
        return None, "TTS timeout - text too long or piper stuck"
    except UnicodeEncodeError as e:
        print(f"ERROR: Unicode encoding error: {e}")
        return None, f"Text encoding error: {e}"
    except Exception as e:
        print(f"ERROR: Synthesis failed: {type(e).__name__}: {e}")
        return None, f"Synthesis error: {type(e).__name__}: {e}"
    finally:
        # Cleanup temp files
        for f in [input_file, output_file]:
            if f and os.path.exists(f):
                try:
                    os.unlink(f)
                except:
                    pass

@app.route('/health', methods=['GET'])
def health():
    voice_path = ensure_voice(DEFAULT_VOICE)
    return jsonify({
        'status': 'ok',
        'voice': DEFAULT_VOICE,
        'voice_available': voice_path is not None,
        'voices_dir': VOICES_DIR
    })

@app.route('/api/tts', methods=['POST'])
def tts():
    """Main TTS endpoint"""
    data = request.json

    if not data or 'text' not in data:
        return jsonify({'error': 'Missing text parameter'}), 400

    text = data.get('text', '')
    voice = data.get('voice', DEFAULT_VOICE)
    speed = data.get('speed', 1.0)

    if not text:
        return jsonify({'error': 'Empty text'}), 400

    wav_data, error = synthesize(text, voice, speed)

    if error:
        return jsonify({'error': error}), 500

    return Response(wav_data, mimetype='audio/wav')

@app.route('/api/voices', methods=['GET'])
def list_voices():
    """List available voices"""
    voices = []
    for v in VOICE_URLS.keys():
        voices.append({
            'id': v,
            'name': v.replace('de-thorsten-', 'Thorsten ').title(),
            'default': v == DEFAULT_VOICE
        })
    return jsonify({'voices': voices, 'default': DEFAULT_VOICE})

if __name__ == '__main__':
    print(f"Piper TTS Server starting...")
    print(f"Default voice: {DEFAULT_VOICE}")
    print(f"Voices dir: {VOICES_DIR}")
    print(f"Port: 10200")

    # Download default voice - CRITICAL, exit if fails
    print(f"Ensuring voice {DEFAULT_VOICE} is available...")
    voice_path = ensure_voice(DEFAULT_VOICE)
    if voice_path is None:
        print(f"FATAL: Could not download voice {DEFAULT_VOICE}")
        sys.exit(1)
    print(f"Voice ready: {voice_path}")

    # List available voices
    if os.path.exists(VOICES_DIR):
        files = os.listdir(VOICES_DIR)
        print(f"Voice files in {VOICES_DIR}: {[f for f in files if f.endswith('.onnx')]}")
    else:
        print(f"WARNING: Voices directory does not exist: {VOICES_DIR}")

    print(f"Server ready on port 10200!")
    app.run(host='0.0.0.0', port=10200, threaded=True)
