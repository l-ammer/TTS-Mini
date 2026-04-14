#!/usr/bin/env python3
"""
Simple HTTP TTS server for Piper
Compatible with Wyoming protocol but using simple HTTP for easier integration
"""
import os
import subprocess
import tempfile
from flask import Flask, request, jsonify, Response

app = Flask(__name__)

DEFAULT_VOICE = os.environ.get('PIPER_VOICE', 'de-thorsten-medium')
MAX_PROCS = int(os.environ.get('PIPER_MAX_PROCS', '1'))
VOICES_DIR = os.path.expanduser('~/.local/share/piper-tts')

def ensure_voice(voice_name):
    """Download voice if not present"""
    voice_path = f"{VOICES_DIR}/{voice_name}.onnx"
    if os.path.exists(voice_path):
        return voice_path

    # Download using piper's built-in download
    print(f"Downloading voice: {voice_name}")
    try:
        subprocess.run(
            ['python', '-m', 'piper', 'download-voice', voice_name],
            check=True,
            capture_output=True,
            timeout=120
        )
    except Exception as e:
        print(f"Download failed: {e}")
        return None

    return voice_path if os.path.exists(voice_path) else None

def synthesize(text, voice=None, speed=1.0):
    """
    Synthesize text using Piper
    Returns WAV bytes
    """
    if voice is None:
        voice = DEFAULT_VOICE

    # Ensure voice is available
    voice_path = ensure_voice(voice)
    if voice_path is None:
        return None, f"Voice not available: {voice}"

    # Create temp files
    with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
        f.write(text)
        input_file = f.name

    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
        output_file = f.name

    try:
        # Build Piper command using python module
        cmd = [
            'python', '-m', 'piper',
            '--model', voice_path,
            '--input', input_file,
            '--output_file', output_file
        ]

        # Run Piper
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)

        if result.returncode != 0:
            return None, f"Piper error: {result.stderr}"

        # Read output WAV
        with open(output_file, 'rb') as f:
            wav_data = f.read()

        return wav_data, None

    except subprocess.TimeoutExpired:
        return None, "TTS timeout"
    except Exception as e:
        return None, str(e)
    finally:
        # Cleanup
        try:
            os.unlink(input_file)
            os.unlink(output_file)
        except:
            pass

@app.route('/health', methods=['GET'])
def health():
    voice_path = ensure_voice(DEFAULT_VOICE)
    return jsonify({
        'status': 'ok',
        'voice': DEFAULT_VOICE,
        'voice_available': voice_path is not None
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

    # Common German voices
    for v in ['de-thorsten-low', 'de-thorsten-medium', 'de-thorsten-high']:
        voices.append({
            'id': v,
            'name': v.replace('de-thorsten-', 'Thorsten ').title(),
            'default': v == DEFAULT_VOICE
        })

    return jsonify({
        'voices': voices,
        'default': DEFAULT_VOICE
    })

if __name__ == '__main__':
    print(f"Piper TTS Server starting...")
    print(f"Default voice: {DEFAULT_VOICE}")
    print(f"Voices dir: {VOICES_DIR}")
    print(f"Port: 10200")

    # Pre-download default voice on startup
    print(f"Pre-downloading {DEFAULT_VOICE}...")
    ensure_voice(DEFAULT_VOICE)

    print(f"Server ready on port 10200!")
    app.run(host='0.0.0.0', port=10200, threaded=True)
