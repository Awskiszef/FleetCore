# FleetCore - SENS Aplikacji

## 1. Cel i przeznaczenie aplikacji
FleetCore (AtlasHC Garage) to zaawansowana aplikacja webowa do kompleksowego zarządzania warsztatem samochodowym i flotą pojazdów. 

### Kluczowe moduły:
- **Flota i Pojazdy:** Zarządzanie przypisaniami pojazdów do klientów, historia napraw, dekodowanie VIN.
- **Klienci:** Baza klientów, powiązane z nimi pojazdy i zlecenia.
- **Zlecenia Naprawy (Repair Orders):** Cykl życia zlecenia od przyjęcia do wydania, kosztorysy, marże, części, koszty robocizny.
- **Magazyn Części:** Stany magazynowe, progi alertów.
- **Faktury i Rozliczenia:** Integracja z Infakt, generowanie i pobieranie faktur PDF.
- **Role i Uprawnienia (RBAC):** `OWNER`, `ADMIN`, `MECHANIC`, `RECEPTIONIST`. Różne poziomy dostępu do funkcji.

## 2. Architektura Systemu
- **Frontend:** Next.js 14, React, TailwindCSS, Lucide Icons, Shadcn UI. Aplikacja w pełni responsywna, z trybem Dark Mode ("cyber-punkowym" designem).
- **Backend:** NestJS, TypeScript, Prisma ORM, PostgreSQL. Architektura modułowa, Rest API.
- **Infrastruktura / Bezpieczeństwo:** 
  - Hashowanie haseł (bcrypt), JWT.
  - Walidacja danych (class-validator, DTO).
  - Throttling (Rate Limit), CORS, maskowanie sekretów, logi audytowe dla ustawień.
  - Szyfrowane załączniki (lokalne bezpieczne pobieranie).

## 3. Implementacja logowania z AWS SSO (Cognito)

### Cel integracji:
Umożliwienie administratorom oraz pracownikom posiadającym konta w AWS IAM Identity Center bezhasłowego, bezpiecznego dostępu do panelu warsztatu.

### Jak to działa (Flow OAuth 2.0 PKCE):

1. **Konfiguracja na Backendzie:**
   - W sekcji Ustawienia (dostępnej tylko dla `OWNER`) zapisywane są (w formie zaszyfrowanej) parametry:
     - `awsCognitoDomain`
     - `awsCognitoClientId`
     - `awsCognitoClientSecret`
     - `awsCognitoRedirectUri`
2. **Logowanie na Frontendzie (`/login`):**
   - Po kliknięciu "Zaloguj przez AWS IAM (SSO)", frontend wykonuje `GET /auth/aws/config` by pobrać jawną część konfiguracji (domenę, clientId).
   - Frontend generuje bezpieczny losowy ciąg znaków (PKCE `code_verifier`) i jego hash (`code_challenge`), oraz `state` w celu zapobiegania atakom CSRF.
   - Użytkownik jest przekierowywany na stronę logowania AWS Cognito z dołączonym `code_challenge` i `state`.
3. **Powrót do aplikacji (`/auth/aws/callback`):**
   - AWS przekierowuje użytkownika pod adres callbacku z parametrem `code` oraz `state`.
   - Frontend weryfikuje czy `state` się zgadza z zapisanym w `sessionStorage`.
   - Frontend wysyła `code` oraz swój `code_verifier` (PKCE) do serwera: `POST /auth/aws/callback`.
4. **Weryfikacja i Autoryzacja po stronie Backendu:**
   - Backend wysyła zapytanie do `https://<DOMENA_COGNITO>/oauth2/token`, przekazując `code`, `client_secret` oraz `code_verifier` (PKCE).
   - W zamian otrzymuje m.in. `id_token`.
   - Backend **bezpiecznie weryfikuje** kryptograficzny podpis `id_token` (algorytm RS256) przy użyciu publicznych kluczy AWS z endpointu `/.well-known/jwks.json` wykorzystując bibliotekę `jwks-rsa`. Weryfikuje także `issuer` oraz `audience`.
   - Po udanej weryfikacji tokenu, z tokena wyciągany jest adres e-mail pracownika.
5. **Logowanie do systemu:**
   - Backend sprawdza, czy e-mail istnieje w bazie lokalnych użytkowników.
   - **Brak użytkownika w bazie:** Rzucany jest wyjątek `UnauthorizedException`. Frontend wyświetla dedykowany, agresywny komunikat blokady na cały ekran ("Sorry cwelu wypierdalaj").
   - **Użytkownik istnieje:** Backend generuje lokalny token JWT podpisany własnym sekretem (`JWT_SECRET`) i zwraca go do frontendu, tak jakby to było standardowe logowanie.

### Zabezpieczenia AWS Login:
- Używamy PKCE, by chronić proces wymiany kodu na token przed przechwyceniem.
- Token jest weryfikowany w oparciu o klucze JWKS (żadne fałszywe lub modyfikowane tokeny nie przejdą weryfikacji).
- Zastosowano stan weryfikacji (CSRF protection).
- Dane dostępowe (Client Secret) są szyfrowane na poziomie bazy danych i nigdy nie wyciekają do frontendu.
