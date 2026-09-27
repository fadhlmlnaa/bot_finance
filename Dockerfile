FROM node:20-slim

WORKDIR /app

# Install OpenSSL for Prisma engine compatibility
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy dependency definitions
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm install

# Copy application source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Expose default port
EXPOSE 3000

# Start WhatsApp Bot
CMD ["npm", "run", "bot"]
