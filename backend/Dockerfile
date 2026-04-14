FROM node:20-alpine

# Install ffmpeg for audio conversion (WAV to MP3)
RUN apk add --no-cache ffmpeg

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

# Create storage directory for audio output
RUN mkdir -p /storage/tts-output

EXPOSE 3000

CMD ["node", "server.js"]
