# /backend/Dockerfile
FROM node:18-alpine

WORKDIR /app

# Kopiowanie plików konfiguracyjnych i instalacja zależności
COPY package*.json ./
RUN npm install

# Kopiowanie reszty kodu
COPY . .

# Generowanie klienta Prisma
RUN npx prisma generate

# Budowanie aplikacji NestJS
RUN npm run build

EXPOSE 3000

# Start aplikacji w trybie produkcyjnym
CMD ["npm", "run", "start:prod"]