# /backend/Dockerfile
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV production

COPY --from=builder --chown=node:node /app/package*.json ./
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/prisma ./prisma
COPY --chown=node:node docker-entrypoint.sh .

RUN chmod +x docker-entrypoint.sh

# Ensure prisma has access to write cache if needed, though mostly it runs migrations
USER node

EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]