# Security Policy

## Supported Versions

Na ten moment aplikacja jest utrzymywana dla najnowszej aktywnej wersji (v1.x.x) wdrażanej do głównego nurtu (main). Błędy bezpieczeństwa i łatki wydawane będą jako tzw. hotfixy z numerem `patch` lub uwzględnione w mniejszych poprawkach typu `minor`.

## Zgłaszanie Problemów Bezpieczeństwa (Reporting a Vulnerability)

Jeśli wykryjesz lub uważasz, że odnalazłeś problem w obrębie autoryzacji systemu, potencjalnego wycieku i niebezpiecznej weryfikacji tokenów prosimy o zgłaszanie tego **prywatnym kanałem** w celu uniknięcia potencjalnego eksploatowania. Zgłoszenia możesz dokonać bez zbędnej zwłoki na odpowiedni firmowy e-mail zarządczy w organizacji. 

### Kategoryczny zakaz upubliczniania sekretów

Ze względu na bezpieczeństwo całego sytemu **KATEGORYCZNIE ZAKAZUJE SIĘ**:
- Publikowania kluczy dostępowych, tokenów sesyjnych, loginów lub jakichkolwiek konfiguracji ze zmiennymi .env w sekcji publicznych Issues.
- Załączania screenshotów wykazujących logi i sekrety serwera.

## Zarządzanie zmiennymi i konfiguracją (ENV)

Plik `.env` jest centrum autoryzacyjnym środowiska i chroni projekt przed niepowołanym wglądem zewnątrz:
- Nigdy go nie kopiuj (commit) do rewizji (plik pozostaje umieszczony w ignorowanych elementach `.gitignore`).
- Klucze bezpieczeństwa `SETTINGS_ENCRYPTION_KEY` oraz `JWT_SECRET` **MUSZĄ** stanowić wygenerowane losowo sekrety kryptograficzne dla każdej maszyny wdrażającej instalacje w internecie publicznym.
- Dostęp na zaplecze produkcyjne serwerów (deploy) pozostaje pod nadzorem wytyczonego uprawnionego devopsa, za pomocą szyfrowanych ścieżek sieciowych.

Zarządzaj polityką wdrożenia tak, aby połączenie z maszyną i interfejsem webowym przebiegało wyłącznie po zabezpieczonym i oflagowanym certyfikacie TLS (HTTPS). 
