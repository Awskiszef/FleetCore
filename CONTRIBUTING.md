# Wytyczne kontrybucji (Contributing)

Dziękujemy za chęć rozbudowy projektu FleetCore! Aby utrzymać jakość i transparentność kodu upewnij się, że spełniasz następujące reguły przy każdym zgłoszeniu rewizji.

## Podstawowe zasady
- **Brak bezpośrednich zmian na `main`**: Środowisko `main` jest chronioną gałęzią główną na etapie utrzymania (Maintenance/Stable). Prace dokonuje się wyłącznie w wyznaczonej i przydzielonej gałęzi (Branch).
- **Praca na osobnej gałęzi**: Pamiętaj by operować gałęziami opisowo (np. `fix/auth-module` lub `feat/notifications`).
- **Pull Request do `main`**: Wszystkie integracje odbywają się oficjalnie poprzez zgłoszenie recenzji Pull Request po zakończeniu etapu testowania. Scalenie wykonuje się za zgodą w systemie platformy GitHub. 

## Pisanie Commitów
Aplikacja oparta jest o standard [Conventional Commits](https://www.conventionalcommits.org/). Należy kategoryzować prefiksy dla zachowania estetyki logów z systemem, np.:
- `feat:` (Nowa funkcja dołożona do serwisu)
- `fix:` (Naprawa błędu lub patch systemu)
- `docs:` (Modyfikacje na łamach dokumentacji .md)
- `chore:` (Ulepszenia formatowania/konfiguracji niezmieniające funkcjonalności)

Przykładowy commit: `fix: repair forced password change flow and remove hash payload`

## Jakość Kodowania
- **Zabezpieczenie konfiguracji (.env)**: Bezwzględny zakaz włączania kluczy i certyfikatów z poziomu testowania / deweloperki w kod zatwierdzany w systemie! Ignorowanie Git `.gitignore` ma pozostać niezmienione dla plików ENV.
- **Obowiązkowy Build i Testy**: Zanim wystawisz prośbę na Pull Request wykonaj budowanie (`npm run build`) oraz zapytania w obu węzłach (Backend/Frontend). Jeżeli moduły testujące (`npm run test`) zgłoszą błąd asercji lub wywali się silnik, Pull Request nie może zostać w pełni skategoryzowany jako ukończony.
- **Raport**: Przed złożeniem PR dobrze jest udowodnić sprawność interakcji z aplikacją dodając w opisie testowania krótki raport uwiarygadniający (Walkthrough), co i jak sprawdzono (czy endpoint odpowiada, co z autoryzacją API).
