FROM node:20-alpine

WORKDIR /app

# Copy package config and prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies (ignoring dev deps)
RUN npm install --omit=dev

# Generate Prisma Client
RUN npx prisma generate

# Copy source code
COPY src ./src

# Create uploads folder
RUN mkdir -p uploads

EXPOSE 5000

ENV PORT=5000
ENV NODE_ENV=production

CMD ["node", "src/server.js"]
