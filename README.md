# AtlasHC Garage (FleetCore) - Pełna Dokumentacja

**AtlasHC Garage** (wewnętrzna nazwa kodowa: FleetCore) to kompleksowa, w pełni autorska aplikacja webowa przeznaczona do zaawansowanego zarządzania nowoczesnym warsztatem samochodowym oraz flotą pojazdów. Została stworzona od zera z naciskiem na automatyzację przepływu pracy (workflow), minimalizację "papierologii" i zapewnienie niesamowitych, angażujących doświadczeń wizualnych (Glassmorphism, płynne animacje).

---

## 🚀 1. Główne Moduły i Cykl Życia Zlecenia

Cała filozofia aplikacji opiera się na prostym i logicznym łańcuchu powiązań: **Klient ➔ Pojazd ➔ Zlecenie Naprawy**.

### Klienci (CRM)
Moduł stanowiący serce bazy kontaktów warsztatu. 
- Możliwość rejestracji klientów indywidualnych oraz firmowych, w tym zagranicznych (z zagranicznymi prefiksami).
- **Integracja z Ministerstwem Finansów (API MF):** Wpisanie samego numeru NIP pozwala zaciągnąć pełne dane polskiej firmy z oficjalnych rejestrów (Biała Lista), co skraca czas obsługi klienta.
- Historia wizyt: Do klienta automatycznie przypinane są powiązane z nim pojazdy oraz pełna historia zleceń.

### Pojazdy (Flota)
Wirtualny park maszynowy klientów.
- Rejestracja z podziałem na kod kraju (np. PL, DE, CZ) i numer tablicy.
- Posiada zaawansowany **dekoder VIN**. Warsztat wpisuje jedynie numer nadwozia samochodu, a aplikacja łącząc się z zewnętrzną komercyjną bazą (Vincario) z automatu uzupełnia markę, model, rok produkcji, rodzaj i pojemność silnika, a także rodzaj napędu.
- Pojazd na stałe "przyklejany" jest do swojego właściciela.

### Zlecenia Naprawy (Serce Systemu)
Kompleksowy moduł operacyjny warsztatu. Gdy klient przyjeżdża z autem, tworzony jest bilet naprawczy (Zlecenie). Cykl wygląda następująco:

1. **Utworzenie zlecenia (Status: NOWE)**
   - Mechanik przyjmuje auto, przypisuje usterkę zgłoszoną przez klienta i szacowany koszt na start.
2. **Diagnoza i Kosztorysowanie (Status: DIAGNOZA)**
   - Mechanik weryfikuje usterkę. Może dodać notatki warsztatowe i ostateczną diagnozę.
   - W tym momencie warsztat wyszukuje części w **Magazynie** i dodaje je wirtualnie do Zlecenia.
3. **Naprawa (Status: W NAPRAWIE)**
   - Auto wjeżdża na podnośnik. System zdejmuje dodane części ze stanów magazynowych na poczet tego zlecenia.
   - Aplikacja **automatycznie przelicza koszt:** dolicza cenę zakupu wybranych części pomnożoną przez ustaloną stawkę "Marży" (%) oraz dolicza ustalony "Koszt Robocizny". Front-end pokazuje kalkulację klientowi i warsztatowi na żywo.
4. **Rozliczenie i Odbiór (Status: ZAKOŃCZONE)**
   - Status ten kończy naprawę, zatwierdza kalkulację do bazy danych i zamraża bilet. 

### Załączniki i Media (Zdjęcia z naprawy)
Do każdego zlecenia naprawy (lub do profilu klienta) można wgrywać nielimitowaną ilość zdjęć i plików PDF (np. zdjęcie rozrządu po demontażu jako dowód dla klienta, lub skan dowodu rejestracyjnego).
Aplikacja samodzielnie sortuje wszystkie wgrywane na serwer pliki i układa je w bezpiecznych, ukrytych folderach nazwanych identyfikatorem (ID) konkretnego klienta. Zapobiega to bałaganowi w głównym folderze serwera.

### Magazyn Części (Inventory)
Wbudowany system ewidencji części warsztatowych.
- Śledzenie numerów OEM, producentów i ilości sztuk leżących na półkach.
- Przejrzysty interfejs ostrzegający o niskim stanie magazynowym.
- Usunięcie części ze Zlecenia Naprawy u klienta automatycznie i bezpowrotnie „zwraca” ją na wirtualną półkę magazynową.

---

## 🤖 2. Automatyzacje, Integracje Zewnętrzne i Konfiguracja

System potrafi działać bezobsługowo w tle, zwalniając mechaników z konieczności chwytania za telefon. Całością można wygodnie sterować z zakładki **Ustawienia** w aplikacji.

### Dynamiczne Ustawienia (Baza Danych)
Aplikacja posiada elastyczny moduł ustawień (Klucz-Wartość) w bazie PostgreSQL. Z poziomu interfejsu przeglądarki użytkownik może samodzielnie wpisać wszystkie dane firmy i klucze API. System inteligentnie z nich korzysta (jeśli ich nie znajdzie, użyje wartości z `.env`).
Zarządzane integracje z interfejsu to m.in.: inFakt, Vincario, Twilio oraz Resend.

### Powiadomienia E-mail i SMS
Dzięki modułowi `NotificationsService`, każda zmiana statusu w Zleceniu Naprawy powoduje wystrzelenie alertu.
- Jeśli auto wchodzi na warsztat, system wysyła np. "Witaj Jan! Twoje zlecenie zmieniło status na: DIAGNOZA".
- Integracje: **Twilio** (dla SMS) oraz **Resend** (dla E-maili).

### Logowanie przez AWS Cognito (IAM SSO)
System wykorzystuje bezpieczne środowisko chmurowe **AWS IAM Identity Center** z protokołem OAuth2 (Authorization Code Grant).
- Zarządzanie uwierzytelnianiem i poświadczeniami jest oddelegowane do globalnego profilu pracownika w AWS.
- System dynamicznie ładuje konfigurację i klucze logowania z bazy danych (do edycji w panelu *Ustawienia*).
- Zastosowano agresywny firewall na froncie: logowanie użytkowników, których e-mail nie istnieje w wewnętrznej bazie kadr FleetCore skutkuje rzuceniem natychmiastowego pełnoekranowego wyjątku w postaci zaporowego czerwonego ekranu z brakiem możliwości ominięcia.

### Fakturowanie (inFakt)
Rozliczenia finansowe są w pełni powiązane z popularnym w Polsce systemem księgowym **inFakt**. 
Z poziomu podglądu zakończonego zlecenia wystarczy kliknąć "Wystaw Fakturę". 
- System dba o właściwy typ sprzedaży. Dla firm zagranicznych ustawiana jest odwrotna stawka podatkowa ("np") i typ "service".
- Aplikacja **automatycznie tłumaczy** przedrostki usługi na fakturze na język kraju klienta (np. "Usługa naprawy pojazdu" dla PL, "Vehicle repair service" dla reszty, "Reparaturdienstleistung" dla DE, itd.).
- Z automatu na fakturę wrzucana jest marka, model i numer rejestracyjny naprawianego pojazdu.

---

## 🛠️ 3. Stos Technologiczny (Tech Stack)

Aplikacja jest pełnoprawnym projektem typu Full-Stack. Wykorzystano tu topowe narzędzia Enterprise:

* **Frontend:** 
  - Zbudowany na platformie `Next.js 15` (TypeScript / React).
  - Wykorzystano `TailwindCSS` oraz `Lucide-React` (ikony) wraz z komponentami "shadcn/ui" do wykreowania profesjonalnego stylu (glassmorphism).
* **Backend:** 
  - Restowe API oparte na mocarnym frameworku `NestJS`, pracujące pod kontrolą serwera NodeJS. 
  - Silnie zmodularyzowana struktura oparta o Controller/Service, walidacja JWT, bcrypt.
* **Baza Danych i Autoryzacja:** 
  - Relacyjna baza `PostgreSQL`, zintegrowana przez ORM `Prisma`.
  - Architektura oparta na Role-Based Access Control (RBAC): `ADMIN`, `OWNER`, `RECEPTIONIST`, `MECHANIC`.
  - Zintegrowane przepływy uwierzytelniania przez **AWS Cognito / IAM** z wymianą kluczy z użyciem PKCE oraz weryfikacją JWKS (RS256).

## 🔒 4. Bezpieczeństwo i Hardening
Aplikacja wdrożyła ścisłe wytyczne `PHASE_1_SECURITY`:
- **Autoryzacja:** Pełne uwierzytelnianie tokenów (JWT_SECRET z env), weryfikacja JWKS dla tokenów chmurowych AWS.
- **RBAC:** Ścisła kontrola uprawnień za pomocą `@Roles()`, zabezpieczenie newralgicznych endpointów (np. fakturowanie, usuwanie danych, ustawienia).
- **Bezpieczeństwo Załączników:** Pobieranie plików uwarunkowane tokenem JWT, brak dostępu z zewnątrz (usunięto ServeStaticModule), white-listing formatów, limity wagowe.
- **Bezpieczeństwo Ustawień:** Szyfrowanie wrażliwych kluczy w bazie danych za pomocą AES-256-CBC. Automatyczne maskowanie w endpointach. Rejestracja zmian w systemie `AuditLog`.
- **Ruch Sieciowy:** Wbudowany Rate Limiting (`@nestjs/throttler`), ograniczony `CORS` i restrykcyjna `ValidationPipe`.

---

## ⚙️ 5. Instalacja i Konfiguracja Środowiska

Aby uruchomić projekt, upewnij się, że posiadasz środowisko NodeJS oraz bazę PostgreSQL.

### Zmienne Środowiskowe (Awaryjne klucze API)
Klucze do API docelowo uzupełnia się w graficznym panelu **Ustawienia**, jednak plik ukryty `.env` w katalogu `/backend` definiuje dostęp do bazy oraz pełni funkcję awaryjną (tzw. fallback).

```env
# ==== BAZA DANYCH ====
DATABASE_URL="postgresql://uzytkownik:haslo@localhost:5432/atlashc_garage?schema=public"
JWT_SECRET="super-secret-jwt-key"

# Wskazówka: Cała reszta kluczy (inFakt, Twilio, Vincario, Resend, AWS Cognito SSO) zapisywana 
# jest w nowym elastycznym module ustawień bezpośrednio z interfejsu (zakładka Ustawienia). 
# Możesz wpisać je także tutaj jako fallback, zgodnie z nazwami używanymi w serwisach.
```

### Uruchomienie Serwisu (Tryb Deweloperski)

W pierwszym oknie terminala startujemy "sercem":
```bash
cd backend
npm install
npx prisma db push
PORT=3001 npm run start:dev
```

W drugim oknie terminala startujemy panelem:
```bash
cd frontend
npm install
npm run dev
```

Gotowe! Wejdź na `http://localhost:3000` i zarządzaj nowoczesnym warsztatem!

---
*Dokumentacja utworzona dla FleetCore / AtlasHC Garage. Pełne prawa architektoniczne zastrzeżone.*
