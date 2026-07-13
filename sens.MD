# FleetCore (AtlasHC Garage) - Dokumentacja Architektury i Logiki

## 1. Wstęp
FleetCore to zaawansowany system do zarządzania flotą pojazdów i warsztatem mechanicznym. Głównym założeniem systemu jest ścisła kontrola zasobów, uprawnień użytkowników i pełna integracja operacji warsztatowych z fakturowaniem oraz chmurowym środowiskiem AWS.

## 2. Stos Technologiczny
- **Frontend**: Next.js 15 (React), Tailwind CSS, shadcn/ui, Lucide Icons, Fetch API Interceptor
- **Backend**: NestJS, Prisma ORM
- **Baza danych**: PostgreSQL
- **Bezpieczeństwo**: JWT (JSON Web Tokens), bcrypt
- **Integracje Zewnętrzne**: AWS Cognito SSO, InFakt (Faktury)

## 3. Struktura Aplikacji
- **Klienci (`/customers`)**: Zarządzanie bazą podmiotów i klientów warsztatu.
- **Pojazdy (`/vehicles` & `/fleet`)**: Zarządzanie flotą pojazdów, przypisywanie do klientów, bezpieczne wgrywanie załączników (autoryzowane requesty fetch zamiast linków bezpośrednich).
- **Zlecenia napraw (`/orders`)**: Tworzenie i śledzenie zleceń warsztatowych, wyceny, przypisywanie mechaników.
- **Faktury (`/invoices`)**: Bezpośrednie wystawianie faktur (InFakt API) oraz ich pobieranie jako autoryzowane pliki Blob.
- **Ustawienia (`/settings`)**: Dynamiczna konfiguracja usług zewnętrznych (API, AWS) z poziomu interfejsu. Wartości przechowywane są w tabeli `Setting` w bazie bez konieczności ciągłej modyfikacji pliku `.env`.

## 4. System Ról i Uprawnień (RBAC)
Role w systemie są precyzyjnie przypisane do odpowiednich procesów w warsztacie:
- `OWNER` / `ADMIN`: Pełny dostęp do całego systemu (wystawianie faktur, ustawienia, pracownicy, floty).
- `RECEPTIONIST` (Sekretariat/Recepcja): 
  - Dozwolone: Dodawanie zleceń naprawy, wystawianie i pobieranie faktur. 
  - Zabronione: Modyfikacja bazy samych pojazdów we flocie oraz brak dostępu do magazynu.
- `MECHANIC` (Mechanik):
  - Dozwolone: Aktualizacja statusów zleceń napraw w przypisanych zadaniach.
  - Zabronione: Wystawianie faktur, przeglądanie panelu ustawień, dostęp do zarządzania pracownikami.

Uprawnienia są egzekwowane na poziomie frontendu (globalny stan `AuthContext` filtrujący renderowanie bloków bocznego paska nawigacyjnego i stron) oraz autoryzowane na backendzie (walidacja JWT w żądaniach punktów końcowych).

## 5. Logowanie przez AWS Cognito (IAM Identity Center / SSO)

System używa hybrydowego logowania: standardowe (email + hasło zapisane w `bcrypt`) oraz bezhasłowe korporacyjne logowanie oparte o chmurę AWS (OAuth2 *Authorization Code Grant*).

### A. Dynamiczna Konfiguracja AWS
Parametry z AWS (Domain, Client ID, Client Secret, Redirect URI) aplikacja pobiera przez globalny punkt `GET /auth/aws/config`. Parametry te można wygodnie zmieniać w zakładce **Ustawienia Systemu** w samej aplikacji. Odświeżane są w czasie rzeczywistym.

### B. Przebieg autoryzacji AWS:
1. **Inicjacja (Frontend)**: Użytkownik w `/login` klika guzik "AWS IAM (SSO)". Skrypt dynamicznie skleja URL przekierowujący na adres AWS Cognito Endpoint. Skonfigurowane są specjalne `scope: email + openid`, tak by zgadzało się to idealnie z ustawieniami "App Client" w środowisku Cloud.
2. **Przekierowanie**: Użytkownik loguje się po stronie serwera Amazona (`Managed Login Page`).
3. **Powrót (Callback)**: AWS przekierowuje sesję z powrotem do naszego Frontendu pod adres publiczny `http://127.0.0.1:3000/auth/aws/callback?code=[KOD]`. 
4. **Wymiana Kodu (Backend)**: 
   - Frontend wysyła kod jednorazowy `POST`-em na nasz własny backend (`/auth/aws/callback`).
   - NestJS bezpiecznie wykonuje zapytanie serwer-serwer do AWS (`oauth2/token`), przesyłając sekret. 
   - AWS wystawia poświadczony certyfikatem plik `id_token` typu JWT zawierający maila użytkownika.
5. **Polityka Bezpieczeństwa w Backendzie (Weryfikacja Konta)**:
   - Backend dekoduje token i z wyciągniętym adresem e-mail przeszukuje własną tabelę PostgreSQL `User`.
   - **Gdy brak użytkownika w bazie**: Zapytanie od razu odrzucane jest poprzez jawnie rzucony błąd `UnauthorizedException('Brak dostępu...')`. Blokowana jest rejestracja osób z zewnątrz, których wcześniej właściciel/administrator nie wpisał do rejestru kadrowego FleetCore.
   - **Gdy użytkownik istnieje**: Backend wystawia wewnętrzny aplikacyjny token FleetCore dla pracownika, pozwalając mu na obsługę zadań.
6. **Agresywna Blokada na Froncie**:
   - Ścieżka callback w `AuthContext` jest zwolniona z wymogu logowania. 
   - Jeśli backend zablokował logowanie, rzucony Exception jest przechwytywany i zamiast powiadomienia w rogu, użytkownik ląduje na zaporowej, agresywno-czerwonej warstwie pełnoekranowej informującej wprost o absolutnym braku uprawnień (brak e-maila w bazie firmowej). Użytkownik może wyłącznie cofnąć się na stronę logowania podstawowego.
