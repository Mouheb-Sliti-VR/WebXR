FROM node:18-slim

# Install ffmpeg system package so conversion works in the container
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# Copy package files and install production deps
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Copy source
COPY . .

ENV PORT=8080
EXPOSE 8080

CMD ["node", "src/app.js"]