# FleetCore

System zarządzania warsztatem samochodowym i flotą. Aplikacja ułatwia zarządzanie pojazdami, tworzenie zleceń napraw, zarządzenie magazynem, generowanie kosztorysów oraz integrację z systemami fakturowymi. Pozwala na optymalizację procesu przyjmowania i wydawania pojazdów.

## Najważniejsze funkcje
- Użytkownicy i role (RBAC)
- Klienci indywidualni i firmowi
- Pojazdy
- Zlecenia napraw
- Mechanicy
- Magazyn części
- Dostawcy
- Kosztorysy
- Generowanie PDF
- Historia napraw
- Przyjęcia pojazdów
- Załączniki
- Ustawienia integracji
- Audyt operacji
- Wymuszona zmiana hasła dla nowo utworzonych kont
- Opcjonalne logowanie AWS Cognito

## Stos technologiczny
**Frontend**:
- Next.js (16.2.9)
- React (19.2.4)
- TypeScript (5.x)
- Tailwind CSS (4.x)
- Komponenty UI (m.in. shadcn)

**Backend**:
- NestJS (11.0.1)
- Prisma (5.22.0)
- PostgreSQL
- JWT & bcrypt
- pdfmake
- Jest

## Architektura
Projekt oparty jest na podziale klient-serwer.
- **Frontend** zrealizowany w Next.js komunikuje się z serwerem poprzez silnie otypowane zapytania API REST.
- **Backend REST API** zbudowany z użyciem NestJS odpowiada za całą logikę biznesową i zabezpieczenia.
- **PostgreSQL** stanowi główną relacyjną bazę danych, a **Prisma ORM** pośredniczy i zabezpiecza transakcje bazy.
- **System JWT** kontroluje chronione endpointy autoryzując zapytania i zamykając sesje bez wymiany wrażliwych danych.
- **Integracje zewnętrzne** pozwalają obsługiwać płatności, faktury oraz dekodowanie VIN i usługi powiadomień.

**Struktura katalogów:**
```
frontend/                 # Kod źródłowy klienta (Next.js)
backend/                  # Kod źródłowy serwera (NestJS)
backend/prisma/           # Definicje schematów bazy danych (schema.prisma)
backend/src/              # Kontrolery i serwisy
README.md                 # Dokumentacja projektu
```

## Wymagania
- **Node.js** (v20 lub v24 dla zaplecza deweloperskiego)
- **npm** (menedżer pakietów Node)
- **PostgreSQL** (uruchomiony na localhost lub w chmurze)
- **Git**

## Instalacja

```bash
# 1. Pobierz repozytorium
git clone https://github.com/Awskiszef/FleetCore.git
cd FleetCore

# 2. Zainstaluj pakiety
cd backend && npm install
cd ../frontend && npm install
```

3. Skonfiguruj bazę **PostgreSQL** i stwórz plik `backend/.env` wg szablonu w `.env.example`.

```bash
# 4. Wygeneruj klienta Prisma
cd backend
npx prisma generate

# 5. Synchronizacja schematu z bazą 
# (UWAGA: prisma db push nadaje się tylko dla środowisk deweloperskich. Przed użyciem na produkcji należy stosować kontrolowane migracje)
npx prisma db push

# 6. Utworzenie pierwszego administratora
npm run bootstrap:admin

# 7. Uruchomienie aplikacji
# W jednym oknie terminala:
cd backend && npm run start:dev

# W drugim oknie terminala:
cd frontend && npm run dev
```

## Konfiguracja środowiska
Zmienne środowiskowe należy zdefiniować w pliku `backend/.env` (lub ewentualnie na froncie w `frontend/.env.local`). Poniżej kluczowe przykłady:

| Zmienna | Wymagana | Przeznaczenie | Przykładowa Wartość (Placeholder) |
| --- | --- | --- | --- |
| `DATABASE_URL` | Tak | Połączenie z bazą PostgreSQL | `postgresql://user:pass@localhost:5432/fleetcore` |
| `JWT_SECRET` | Tak | Szyfrowanie tokenów JWT | `losowy-dlugi-ciag-znakow-jwt` |
| `SETTINGS_ENCRYPTION_KEY` | Tak | Bezpieczne ustawienia systemowe | `32-bajtowy-wygenerowany-klucz-base64` |
| `PORT` | Nie | Port uruchomienia serwera | `3001` |
| `FRONTEND_URL` | Nie | URL aplikacji frontendowej | `http://localhost:3000` |
| `CORS_ORIGINS` | Nie | Zezwolenie domenowe na zapytania API | `http://localhost:3000` |
| `INFAKT_API_KEY` | Nie | Integracja z systemem faktur inFakt | `klucz-z-ustawien-konta-infakt` |
| `VIN_API_KEY` | Nie | Klucz dla bramki dekodowania VIN | `klucz-z-bramki-vin` |
| `VIN_API_SECRET` | Nie | Sekret dla bramki dekodowania VIN | `sekret-bramki-vin` |
| `RESEND_API_KEY` | Nie | Klucz dostępu dla mailingów Resend | `klucz-resend` |
| `TWILIO_ACCOUNT_SID` | Nie | Identyfikator konta Twilio (SMS) | `klucz-twilio-sid` |
| `TWILIO_AUTH_TOKEN` | Nie | Token uwierzytelnienia Twilio | `token-twilio` |
| `TWILIO_PHONE_NUMBER` | Nie | Telefon nadawcy dla usług SMS Twilio | `+48123456789` |

## Pierwsze logowanie
Podczas inicjalizacji wywołaj skrypt z poziomu katalogu backend:
```bash
npm run bootstrap:admin
```
Skrypt tworzy domyślnego użytkownika z rolą `OWNER` oraz ustaloną w bazie flagą `mustChangePassword=true`.
Dzięki temu, podczas pierwszego logowania użytkownik zostanie natychmiast zmuszony do podania swojego własnego, stałego hasła, zanim system przepuści go do jakichkolwiek widoków w aplikacji. 

## Dostępne skrypty

**Backend (`package.json`)**
| Skrypt | Działanie |
| --- | --- |
| `npm run start:dev` | Uruchamia serwer z odświeżaniem w tle |
| `npm run build` | Kompiluje projekt produkcyjny (NestJS) |
| `npm run test` | Uruchamia testy jednostkowe w (Jest) |
| `npm run test:e2e` | Uruchamia testy automatyczne ścieżki e2e |
| `npm run lint` | Uruchamia narzędzie diagnostyczne (Eslint) |
| `npm run bootstrap:admin` | Tworzy główne konto właściciela projektu |

**Frontend (`package.json`)**
| Skrypt | Działanie |
| --- | --- |
| `npm run dev` | Uruchamia środowisko deweloperskie Next.js |
| `npm run build` | Buduje produkcyjne pliki aplikacji |
| `npm run start` | Serwuje zoptymalizowane strony |
| `npm run lint` | Analiza poprawności składni i ostrzeżeń React |

## Testy
- **Testy jednostkowe backendu**: Modułowe testy (serwisy, kontrolery) realizowane z frameworkiem Jest w obrębie plików `.spec.ts` (np. pokrycie przepływów zmiany haseł dla modułu `auth`). (Obecne wydanie stabilne notuje zaliczenie na poziomie 24/24).
- **Testy E2E**: Automatyczne przepływy akcji na żywym interfejsie realizowane z zewnątrz lub przy pomocy wbudowanych komend testowych e2e środowiska backendowego.
- **Build frontendu**: Silna i ostra kompilacja w Typescript gwarantuje weryfikację błędów na wczesnym etapie podczas budowania paczki poleceniem build.
- **Testy autoryzacji**: Kod pokrywa i gwarantuje poprawną wymianę wygasających sesji oraz zachowanie stabilności podczas zmiany haseł na koncie.

## Bezpieczeństwo
- Wszystkie zmienne dostępowe, klucze i hasła konfiguracyjne instalacji (tzw. sekrety) muszą znajdować się wyłącznie w pliku powiązanym dla zmiennych, np. `backend/.env`.
- Żaden z plików z rozszerzeniem `.env` nie może zostać opublikowany z kodem. System `.gitignore` dba o ich omijanie.
- Hasła logowania do bazy szyfrowane są biblioteką bcrypt i `passwordHash` nigdy nie wycieka oraz nie jest zawarty w odpowiedzi API.
- Wymagany `SETTINGS_ENCRYPTION_KEY` musi stanowić wygenerowany losowo zbiór uchodzący 32 bitowym wektorom IV by skutecznie kodować logikę serwisu wewnętrznego. 
- Aplikacja w środowisku produkcyjnym wymaga uruchomienia na serwerze i protokołu certyfikowanego za pośrednictwem HTTPS.
- Konta integracyjne opierają się na unikalnych kluczach dostarczonych od zweryfikowanych operatorów płatności oraz usług, dając tym samym autoryzację.
- Dostęp do bazy danych powinien zostać zredukowany przez zapory sieciowe. 

## Znane ograniczenia
- System i repozytorium charakteryzuje dług historyczny na poziomie ostrzeżeń lint zarówno u strony frontendu, jak i backendu. Wymagają one dedykowanego wdrożenia naprawczego w kolejnym sprincie optymalizacyjnym.
- Funkcjonowanie bramek dekodujących VIN lub pobieranie danych do systemu fakturowania nie ma zaszytego serwera mock w samej aplikacji - wymaga połączeń do odpowiednich kont dostawców.
- Integracje oraz poprawne wdrożenie całości serwerowych narzędzi wiąże się ze stworzeniem środowiska wejściowego Nginx lub środowiska hostingu (platform as a service) oraz nie uwzględnia standardowych konfiguracji z pudełka - wszystko zależy od devopsów.

## Status projektu
**Project status: Stable / Maintenance**
Baza, szkielet, a także główne moduły projektu zostały w pełni zaprojektowane i wdrożone. Krytyczny przepływ autoryzacji w tym bezpieczeństwo uwierzytelniania i autoryzacji na podstawie `mustChangePassword` zostało kompleksowo zlikwidowane na obustronnym węźle. Projekt uważa się za gotowy na produkcję. Od tego momentu repozytorium znajduje się na etapie wczesnego utrzymania - ewentualne mniejsze lub poboczne usterki oraz dodawanie nieujętych funkcjonalności musi zostać wdrażane jako proces śledzony w oparciu o rewizje z zamykanych zgłoszeń jako ustrukturyzowane ulepszenia (Pull Request).
