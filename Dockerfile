FROM node:20-bookworm-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        ffmpeg \
        git \
        ca-certificates \
        curl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./

# The postinstall hook patches a file under scripts/, which is not present
# until the application source is copied into the image.
RUN npm install --omit=dev --ignore-scripts

COPY . .

RUN npm run postinstall

EXPOSE 8080

CMD ["npm", "start"]
