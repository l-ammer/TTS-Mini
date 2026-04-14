# 🎙️ Vibe Voice / TTS-Mini

**PDF zu MP3 - Deutsche Text-to-Speech mit Piper**

Eine kostenlose, datenschutzfreundliche Web-App, die PDF-Dokumente in hochwertige deutsche Sprache umwandelt. Lokal auf deinem Server, keine Cloud-Abhängigkeiten.

![Vue 3](https://img.shields.io/badge/Vue_3-4FC08D?style=flat&logo=vuedotjs&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=nodedotjs&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)
![Piper TTS](https://img.shields.io/badge/Piper_TTS-FF6F61?style=flat)

## Features

- 📄 **PDF Upload** - Drag & Drop PDF-Dateien bis 50MB
- 🎙️ **Deutsche Stimme** - Thorsten, speziell für Deutsch trainiert
- ⚡ **CPU-basiert** - Keine GPU nötig, läuft auf jedem Server
- 🔒 **100% Datenschutz** - Alles lokal, keine Cloud-APIs, keine Datenweitergabe
- 💾 **MP3 Export** - 192kbps, streaming-fähig
- 🔄 **Queue-System** - Mehrere Aufträge automatisch verarbeiten
- 📱 **Responsive UI** - Modernes Vue 3 Interface mit Dark Mode

## Screenshot

*(Placeholder: Upload-Form links, Job-Liste rechts, Audio-Player)*

## Technologie-Stack

| Komponente | Technologie | Zweck |
|------------|-------------|-------|
| **Frontend** | Vue 3 + Vite + Tailwind CSS | Moderne SPA mit Drag & Drop |
| **Backend** | Node.js + Express | REST API, Job-Queue, PDF-Parsing |
| **Datenbank** | SQLite (better-sqlite3) | Lokale Job-Persistenz |
| **TTS Engine** | Piper (Wyoming Protocol) | Hochwertige deutsche Sprachsynthese |
| **Container** | Docker + Docker Compose | Einfache Deployment |
| **Audio** | ffmpeg | WAV → MP3 Konvertierung |

## Systemanforderungen

- **CPU:** 1-2 Kerne (Piper ist 10x schneller als Echtzeit)
- **RAM:** 1GB (inkl. Piper Voice Model)
- **Storage:** 500MB für Container + generierte Audio-Dateien
- **OS:** Linux (Ubuntu 22.04+ empfohlen)
- **Docker:** 20.10+ mit Docker Compose

## Schnellstart

### 1. Repository klonen

```bash
git clone https://github.com/l-ammer/TTS-Mini.git
cd TTS-Mini
```

### 2. Environment konfigurieren

```bash
cp .env.example .env
# Optional: .env editieren für Custom-Einstellungen
```

### 3. Docker starten

```bash
docker-compose up -d --build
```

### 4. Zugriff

- **Web Interface:** http://localhost:8080
- **API:** http://localhost:3000
- **Health Check:** http://localhost:3000/health

### 5. Nginx Proxy Manager (optional, für Produktion)

1. Nginx Proxy Manager öffnen
2. Domain hinzufügen (z.B. `tts.dein-domain.de`)
3. Forward zu `vibe-voice` Port 80
4. SSL aktivieren (Let's Encrypt)

## Konfiguration

Die App nutzt folgende Stimmen (automatisch aus dem `de-thorsten` Piper-Repository):

| Stimme | Qualität | Dateigröße | Speed | Empfohlene Nutzung |
|--------|----------|------------|-------|-------------------|
| `de-thorsten-low` | Baseline | ~50 MB | Sehr schnell | Schnelle Tests |
| `de-thorsten-medium` | ⭐ Gut | ~75 MB | Schnell | **Empfohlen** |
| `de-thorsten-high` | Premium | ~150 MB | Moderat | Höchste Qualität |

### Environment Variablen

| Variable | Default | Beschreibung |
|----------|---------|--------------|
| `NODE_ENV` | production | Umgebung |
| `PORT` | 3000 | Backend-Port |
| `CONCURRENT_JOBS` | 1 | Parallele TTS-Aufträge |
| `MAX_FILE_SIZE` | 52428800 | Max. Upload (50MB) |
| `PIPER_HOST` | piper | Piper Container Hostname |

## API Endpoints

| Endpoint | Methode | Beschreibung |
|----------|---------|--------------|
| `POST /api/upload` | Upload | PDF hochladen, Job erstellen |
| `GET /api/jobs` | Liste | Alle Aufträge mit Status |
| `GET /api/jobs/:id` | Status | Einzelner Auftrag |
| `DELETE /api/jobs/:id` | Löschen | Auftrag + Datei entfernen |
| `GET /api/audio/:id` | Stream/DL | MP3 streamen oder downloaden |
| `GET /api/voices` | Liste | Verfügbare Stimmen |
| `GET /health` | Health | Server-Status |

## Architektur

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Browser   │◄────►│  Nginx (Vue) │◄────►│   Express   │
│             │      │   Frontend   │      │   Backend   │
└─────────────┘      └──────────────┘      └──────┬──────┘
                                                  │
                                                  ▼
                                           ┌─────────────┐
                                           │   SQLite    │
                                           │  Job Queue  │
                                           └─────────────┘
                                                  │
                                                  ▼
                                           ┌─────────────┐
                                           │    Piper    │
                                           │  Wyoming    │
                                           │    TTS      │
                                           └─────────────┘
```

## Troubleshooting

### Piper startet nicht

```bash
docker logs vibe-voice-piper
```

Prüfe ob das Voice Model geladen wurde:
- Lädt automatisch `de-thorsten-medium` beim ersten Start
- Alternativ: `docker-compose exec piper ls /usr/share/piper-voices`

### Keine Audio-Wiedergabe

- Browser-Console prüfen (CORS-Header)
- `docker logs vibe-voice-backend` für API-Fehler
- Storage-Permissions: `docker-compose exec vibe-voice-backend ls -la /storage`

### PDF wird nicht verarbeitet

- Nur Text-PDFs werden unterstützt (keine gescannten Bilder)
- Max. 50MB Dateigröße
- Encrypted PDFs werden abgelehnt

## Lizenz

| Komponente | Lizenz | Nutzung |
|------------|--------|---------|
| **Diese Software** | MIT | Frei, kommerziell erlaubt |
| **Piper TTS** | MIT | Frei |
| **Thorsten Stimme** | CC-BY 4.0 | Daniel Ullrich, Attribution nötig |

## Credits

- [Piper TTS](https://github.com/rhasspy/piper) von Michael Hansen
- [Thorsten Voice](https://github.com/thorsten-voice) von Daniel Ullrich
- [Wyoming Protocol](https://github.com/rhasspy/wyoming) für Container-Integration

## Contributing

Pull Requests willkommen! Für größere Änderungen erstelle bitte zuerst ein Issue.

## Roadmap

- [ ] GPU-Support (StyleTTS 2 / FishSpeech) für Premium-Qualität
- [ ] OCR für gescannte PDFs (Tesseract)
- [ ] Mehr Sprachen (EN, FR)
- [ ] Kapitel-Erkennung für Audiobooks
- [ ] Benutzer-Authentifizierung

---

Entwickelt mit 🎙️ für lokale, datenschutzfreundliche TTS.
