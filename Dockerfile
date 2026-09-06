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

# The postinstall hook patches a file under scripts/, which is not present
# until the application source is copied into the image.
RUN npm install --omit=dev --ignore-scripts

COPY . .

# Build native SQLite bindings inside this image. The dependency install above
# skips lifecycle scripts because the project postinstall needs source files
# copied only in this layer.
RUN npm rebuild better-sqlite3 sqlite3 --build-from-source
RUN npm run postinstall

EXPOSE 8080

CMD ["npm", "start"]
