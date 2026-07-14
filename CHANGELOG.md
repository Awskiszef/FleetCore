# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-07-14

### Added
- Nowa chroniona strona i formularz `/change-password` wymuszający nałożoną aktualizację haseł pierwszego logowania.
- Scentralizowany plik i globalne współdzielone modele we frontendzie w ścieżce `frontend/src/types/models.ts`.
- Atrybuty formularzy `autocomplete` do poprawniejszego wykrywania typów i pól w menedżerach haseł.
- Odtwarzanie testów autoryzacji używając rzeczywistego modułu `JwtModule` do poprawnej dekodacji haseł.

### Changed
- Silne typowanie logiki `apiClient` na frontendzie – dodano uogólnione klasy obsługujące interfejs `PaginatedResponse<T>`.
- Przepływ starego sesyjnego tokena wywołuje na frontendzie podmienienie zapisanego klucza wewnątrz repozytorium `localStorage`.

### Fixed
- Zlikwidowano nieskończoną pętlę ładowania `mustChangePassword`, kiedy aplikacja próbowała odrzucać zmiany wprowadzane na wygasającym w czasie zablokowania kluczu bez powrotu z wymianą. 
- Zaktualizowano parametry `JwtAuthGuard`, wymuszając przepuszczanie na wymuszonym profilu wyłącznie bezpośrednio dopasowanych (match) zapytań (GET `/auth/me` oraz POST `/auth/change-password`).

### Security
- Zdezynfekowano wyciek zaszyfrowanej warstwy konta w `AuthService.login` – usunięto globalnie widoczną flagę `passwordHash` z serwera w autoryzacji oraz API.
- Generowanie całkowicie nowego, unikalnego JWT dla profilu pozbawionego blokady zaraz po poprawnej procedurze nadpisania starego hasła, blokując lukę i stare dane autoryzacyjne w obrocie.

### Known issues
- Historyczne ostrzeżenia o brakujących zależnościach (`useEffect` deps, `any`) pochodzące z wbudowanych zaleceń środowiska Lint.
- Konfiguracja zewnętrznych modułów i zewnętrznych bramek podlega dedykowanemu zarządzaniu przy wdrażaniu.
