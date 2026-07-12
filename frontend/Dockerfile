# /frontend/Dockerfile
FROM node:18-alpine

WORKDIR /app

# Kopiowanie plików konfiguracyjnych i instalacja zależności
COPY package*.json ./
RUN npm install

# Kopiowanie reszty kodu
COPY . .

# Budowanie aplikacji Next.js
RUN npm run build

EXPOSE 3001

# Start aplikacji
CMD ["npm", "run", "start"]