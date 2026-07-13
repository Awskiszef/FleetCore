# Uruchomienie FleetCore (SETUP)

Ten plik zawiera szczegółowe instrukcje, jak krok po kroku zainstalować i uruchomić środowisko warsztatowe FleetCore na Twojej maszynie lub na serwerze produkcyjnym (VPS). 

Aplikacja składa się z następujących elementów:
- **Bazy danych PostgreSQL**
- **Backendu (API w NestJS)**
- **Frontendu (Interfejs w Next.js)**
- **Nginx Proxy Managera** (Zarządzanie domenami)

---

## 1. Wymagania Wstępne

Przed przystąpieniem do instalacji, upewnij się, że masz zainstalowane w systemie operacyjnym:
- **Docker** oraz **Docker Compose**
- Ewentualnie **Node.js** w wersji 22 (jeśli chcesz uruchamiać kod lokalnie poza Dockerem).

## 2. Przygotowanie Plików Konfiguracyjnych

Hasła i sekrety przechowujemy w pliku środowiskowym. Projekt zawiera szablon `.env.example`.

1. Skopiuj szablon i utwórz plik `.env` w głównym katalogu projektu:
   ```bash
   cp .env.example .env
   ```
2. Otwórz plik `.env` i ustaw bezpieczne hasło do bazy danych:
   ```env
   # .env
   POSTGRES_USER=admin
   POSTGRES_PASSWORD=TwojeSuperTajneHaslo123
   POSTGRES_DB=fleetcore
   DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}?schema=public
   
   # Konfiguracja Backend
   PORT=3000
   
   # Konfiguracja Frontend
   # (Na produkcji będzie to np. https://api.twojadomena.pl)
   NEXT_PUBLIC_API_URL=http://localhost:3000
   ```

## 3. Uruchomienie Środowiska (Docker Compose)

Najprostszym i rekomendowanym sposobem uruchomienia całego systemu na produkcji jest użycie kontenerów Dockera, które same zainstalują wszystkie zależności.

Z poziomu terminala w głównym katalogu (tam, gdzie znajduje się `docker-compose.yml`) wpisz:

```bash
docker-compose up -d --build
```

**Co się stanie?**
1. Docker zbuduje zoptymalizowane obrazy używając `node:22-alpine` (dzięki multi-stage builds są one bardzo lekkie).
2. Wstanie baza `fleetcore_db` (bezpiecznie zamknięta na świat).
3. Backend zaczeka aż baza będzie gotowa (Healthcheck), następnie uruchomi skrypt startowy `docker-entrypoint.sh`, który:
   - Zsynchronizuje modele bazy danych (`npx prisma db push`).
   - Podniesie API na wirtualnym porcie 3000.
4. Na końcu wstanie serwis Next.js (Frontend na porcie 3001) oraz Nginx Proxy Manager (GUI na porcie 81).

## 4. Weryfikacja działania

Po kilku minutach od wydania komendy `docker-compose up`, możesz zweryfikować czy wszystko działa, wpisując w przeglądarkę:

- **Panel Zarządzania (Frontend):** `http://localhost:3001`
- **Nginx Proxy Manager:** `http://localhost:81`
  - Domyślne logowanie do NPM:
  - E-mail: `admin@example.com`
  - Hasło: `changeme`

## 5. Praca z Domenami (Produkcja)

Aby uruchomić aplikację w sieci Internet (pod docelową domeną), zaloguj się do **Nginx Proxy Managera** pod adresem IP swojego serwera (port `81`) i dodaj następujące hosty:

1. Przekierowanie API:
   - Dodaj *Proxy Host*: `api.twojadomena.pl` -> Przekierowuje na IP wirtualnej maszyny lub z adresem docelowym `backend` (jeśli w docker bridge) na port `3000`.
   - Zmień `NEXT_PUBLIC_API_URL=https://api.twojadomena.pl` w pliku `.env` i przebuduj (`docker-compose up -d --build`).

2. Przekierowanie Frontendu:
   - Dodaj *Proxy Host*: `twojadomena.pl` -> Przekierowuje na `frontend` port `3001`.

W ustawieniach Nginx Proxy Managera za pomocą jednego kliknięcia możesz także nałożyć zabezpieczenia SSL/HTTPS (wykorzystując darmowe certyfikaty Let's Encrypt).

## 6. Utrzymanie i Kopie Zapasowe

Wdrożyłem specjalne skrypty zapasowe. Będąc na serwerze, możesz wejść do katalogu `scripts/` i uruchomić zrzut lub przywracanie:
```bash
./scripts/backup.sh
```
Powyższe polecenie wyciągnie plik `.sql.gz` i umieści go w folderze `backups/`.
Aby przywrócić zepsutą bazę danych z kopii zapasowej, uruchom:
```bash
./scripts/restore.sh ścieżka/do/pliku.sql.gz
```
