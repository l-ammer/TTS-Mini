# TTS-Mini

Einfaches webbasiertes Text-to-Speech System für deutsche Sprache. PDF-Dateien werden in gesprochene Audio-Dateien (MP3) umgewandelt.

## Funktionen

- PDF-Upload und automatische Text-Extraktion
- Deutsche Stimme (Thorsten)
- Variable Sprechgeschwindigkeit
- Web-Interface zum Verwalten von Aufträgen
- Automatische Umwandlung zu MP3

## Schnellstart

```bash
git clone https://github.com/l-ammer/TTS-Mini.git
cd TTS-Mini
cp .env.example .env
docker-compose up -d --build
```

Der Dienst ist dann unter Port 80 (Frontend) und Port 4001 (Backend-API direkt) erreichbar.

## Architektur

- **Frontend**: Vue.js 3 + Tailwind CSS (läuft auf Port 80 im Container)
- **Backend**: Node.js + Express + SQLite (läuft auf Port 4001)
- **TTS**: Piper (German Thorsten voice) via Flask-Wrapper

## Docker-Services

| Service | Container-Name | Port | Funktion |
|---------|---------------|------|----------|
| Frontend | tts | 80 | Vue.js Web-Interface |
| Backend | tts-backend | 4001 | API + Queue-Processing |
| TTS-Engine | tts-piper | 10200 | Piper TTS Server |

## Umgebungsvariablen

Siehe `.env.example`:

- `NODE_ENV`: production
- `PORT`: 4001 (Backend-Port)
- `CONCURRENT_JOBS`: Anzahl gleichzeitiger TTS-Aufträge (default: 1)
- `PIPER_HOST`: tts-piper (Container-Name)
- `PIPER_PORT`: 10200

## Stimmen

Derzeit verfügbar:
- `de-thorsten-low` - Schnell, geringere Qualität
- `de-thorsten-medium` - Standardqualität (empfohlen)
- `de-thorsten-high` - Beste Qualität, langsamer

## Lizenz

MIT License

## Technologien

- [Piper TTS](https://github.com/rhasspy/piper)
- [Vue.js 3](https://vuejs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Express.js](https://expressjs.com/)
- [SQLite](https://www.sqlite.org/)
