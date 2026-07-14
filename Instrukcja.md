# Instrukcja wdrożenia produkcyjnego (Server Deployment)

Instrukcja krok po kroku opisuje wdrożenie aplikacji FleetCore na standardowy serwer (np. Ubuntu 22.04 / 24.04 LTS) w oparciu o Node.js i proces menedżera (PM2) lub kontenerów Docker.

## Zależności i przygotowanie maszyny
Wymagane zainstalowane oprogramowanie na serwerze głównym:
1. **Node.js** (LTS 20.x lub nowsza) oraz npm.
2. **PostgreSQL** (wersja 14+ lub zewnętrzna usługa chmurowa).
3. **Nginx** (Jako Reverse Proxy do serwowania aplikacji na portach 80/443).
4. **Git** (Do pobrania źródeł).
5. **PM2** (Zalecane do utrzymania żywotności aplikacji Node): `npm install -g pm2`

## Krok 1: Klonowanie Repozytorium
Zaloguj się na serwer przez SSH. Stwórz optymalną lokalizację dla aplikacji (np. `/var/www/fleetcore`).
```bash
cd /var/www
git clone https://github.com/Awskiszef/FleetCore.git fleetcore
cd fleetcore
```

## Krok 2: Uruchomienie Bazy Danych
Zaloguj się do powłoki PostgreSQL (`sudo -u postgres psql`):
```sql
CREATE DATABASE fleetcore;
CREATE USER fleetuser WITH ENCRYPTED PASSWORD 'TWOJE_SILNE_HASLO';
GRANT ALL PRIVILEGES ON DATABASE fleetcore TO fleetuser;
ALTER DATABASE fleetcore OWNER TO fleetuser;
```

## Krok 3: Konfiguracja Zmiennych Środowiskowych
Klucze produkcyjne NIE MOGĄ pojawić się w kodzie publicznym. Ustaw plik dla backendu:
```bash
cd backend
cp .env.example .env
nano .env
```
Uzupełnij go o kluczowe dane produkcyjne, m.in.:
```env
# Podstawowe hasła dostępowe bazy
DATABASE_URL="postgresql://fleetuser:TWOJE_SILNE_HASLO@localhost:5432/fleetcore?schema=public"

# Wygeneruj 32-znakowe ciągi losowe
JWT_SECRET="<WygenerowanyLosowyKlucz_B>" 
SETTINGS_ENCRYPTION_KEY="<WygenerowanyLosowyKlucz_C>"

PORT="3001"
FRONTEND_URL="https://twojadomena.pl"
CORS_ORIGINS="https://twojadomena.pl"
```
Plik `.env.local` dla frontendu nie jest wymagany o ile zapytania wychodzą ze standardowej ścieżki i odpowiednich ustawień builda Next.js. Opcjonalnie podaj `NEXT_PUBLIC_API_URL="https://api.twojadomena.pl"` w głównym folderze frontendu.

## Krok 4: Instalacja zależności
Zainstaluj moduły na obu frontach.
```bash
# Instalacja modułów Backendu
cd /var/www/fleetcore/backend
npm ci

# Instalacja modułów Frontendu
cd /var/www/fleetcore/frontend
npm ci
```

## Krok 5: Migracje i Przygotowanie Schematów
Przygotuj bazę danych (Uruchom wewnątrz `backend/`):
```bash
# Wygenerowanie plików ORM Prisma
npx prisma generate

# Wdrożenie produkcyjnej struktury migracyjnej
npx prisma migrate deploy

# WAŻNE - Tworzenie administratora pierwszego kontaktu (wymusi zmianę hasła)
npm run bootstrap:admin
```

## Krok 6: Kompilacja Aplikacji
Zbuduj pakiety produkcyjne (builds). Kompilacja przygotuje zoptymalizowane struktury.
```bash
# Kompilacja Backendu
cd /var/www/fleetcore/backend
npm run build

# Kompilacja Frontendu
cd /var/www/fleetcore/frontend
npm run build
```

## Krok 7: Uruchomienie za pomocą PM2
Skorzystaj z narzędzia PM2, aby system mógł monitorować, restartować aplikacje przy usterce lub po restarcie systemu.
```bash
cd /var/www/fleetcore

# Start backendu
cd backend
pm2 start dist/main.js --name "fleetcore-api"

# Start frontendu
cd ../frontend
pm2 start npm --name "fleetcore-web" -- run start

# Zapisanie konfiguracji
pm2 save
pm2 startup
```

## Krok 8: Nginx i Certyfikat SSL (Zalecane)
Skonfiguruj połączenia z portów webowych do lokalnych procesów aplikacji.
Utwórz nowy plik w `/etc/nginx/sites-available/fleetcore`:

```nginx
server {
    listen 80;
    server_name twojadomena.pl;

    # Przekierowanie ruchu dla Frontendu (Next.js)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 80;
    server_name api.twojadomena.pl;

    # Przekierowanie ruchu dla Backendu (NestJS)
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
Zastosuj certyfikaty SSL, wykonując połączenie Let's Encrypt / Certbot:
```bash
sudo ln -s /etc/nginx/sites-available/fleetcore /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
sudo certbot --nginx -d twojadomena.pl -d api.twojadomena.pl
```

System FleetCore jest gotowy i działa produkcyjnie pod wskazanymi portami.
