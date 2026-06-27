FROM node:20-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg ca-certificates curl \
  && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
     -o /usr/local/bin/yt-dlp \
  && chmod a+rx /usr/local/bin/yt-dlp \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY lib/ ./lib/
COPY server/ ./server/
COPY electron/ ./electron/
COPY src/ ./src/
COPY scripts/ ./scripts/

ENV PORT=8080
EXPOSE 8080

CMD ["node", "server/web.js"]
