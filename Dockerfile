FROM node:20-bookworm-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        ffmpeg \
        git \
        ca-certificates \
        curl \
        python3 \
        make \
        g++ && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./

RUN npm install --omit=dev --ignore-scripts

COPY . .

# Build native SQLite bindings inside this image after the source and native
# module dependencies are available.
RUN npm rebuild better-sqlite3 sqlite3 --build-from-source

EXPOSE 8080

CMD ["npm", "start"]
