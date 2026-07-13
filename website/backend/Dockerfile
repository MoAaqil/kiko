FROM node:20-bullseye-slim

WORKDIR /app

# Copy package config and prisma schema
COPY website/backend/package*.json ./
COPY website/backend/prisma ./prisma/

# Install dependencies
RUN npm install --legacy-peer-deps

# Generate Prisma Client
RUN npx prisma generate

# Copy source code
COPY website/backend/src ./src

# Create uploads folder
RUN mkdir -p uploads

EXPOSE 5000

ENV PORT=5000
ENV NODE_ENV=production

CMD ["node", "src/server.js"]
