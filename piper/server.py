#!/usr/bin/env python3
"""
Simple HTTP TTS server for Piper
Compatible with Wyoming protocol but using simple HTTP for easier integration
"""
import os
import json
import subprocess
import tempfile
from flask import Flask, request, jsonify, Response

app = Flask(__name__)

DEFAULT_VOICE = os.environ.get('PIPER_VOICE', 'de-thorsten-medium')
MAX_PROCS = int(os.environ.get('PIPER_MAX_PROCS', '1'))
VOICES_DIR = '/usr/share/piper-voices'


def get_voice_path(voice_name):
    """Get path to voice model"""
    voice_file = f"{voice_name}.onnx"
    return os.path.join(VOICES_DIR, voice_file)


def synthesize(text, voice=None, speed=1.0):
    """
    Synthesize text using Piper
    Returns WAV bytes
    """
    if voice is None:
        voice = DEFAULT_VOICE

    voice_path = get_voice_path(voice)
    voice_config = f"{voice_path}.json"

    if not os.path.exists(voice_path):
        return None, f"Voice not found: {voice}"

    # Create temp files
    with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
        f.write(text)
        input_file = f.name

    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
        output_file = f.name

    try:
        # Build Piper command
        cmd = [
            '/app/piper/piper',
            '--model', voice_path,
            '--config', voice_config,
            '--input', input_file,
            '--output_file', output_file
        ]

        # Run Piper
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)

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
    return jsonify({'status': 'ok', 'voice': DEFAULT_VOICE})


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

    try:
        for f in os.listdir(VOICES_DIR):
            if f.endswith('.onnx'):
                voice_id = f.replace('.onnx', '')
                voices.append({
                    'id': voice_id,
                    'name': voice_id.replace('de-thorsten-', 'Thorsten ').title(),
                    'default': voice_id == DEFAULT_VOICE
                })
    except:
        pass

    return jsonify({'voices': voices, 'default': DEFAULT_VOICE})


if __name__ == '__main__':
    print(f"Piper TTS Server starting...")
    print(f"Default voice: {DEFAULT_VOICE}")
    print(f"Voices dir: {VOICES_DIR}")
    print(f"Port: 10200")

    # Check if Piper exists
    piper_path = '/app/piper/piper'
    if not os.path.exists(piper_path):
        print(f"ERROR: Piper not found at {piper_path}")
        exit(1)

    # Check default voice
    voice_path = get_voice_path(DEFAULT_VOICE)
    if not os.path.exists(voice_path):
        print(f"ERROR: Default voice not found at {voice_path}")
        exit(1)

    print(f"✓ Piper binary: {piper_path}")
    print(f"✓ Default voice: {voice_path}")
    print(f"Server ready!")

    app.run(host='0.0.0.0', port=10200, threaded=True)
