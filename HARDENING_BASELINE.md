# Audyt Bazowy przed Produkcją (HARDENING_BASELINE.md)

| Metryka | Stan Przed "FleetCore 9/10 Hardening" |
|---|---|
| **Liczba Testów Backend** | 24 |
| **Backend Lint** | 344 problemów (323 errors, 21 warnings) |
| **Frontend Lint** | 141 problemów (44 errors, 97 warnings) |
| **Build Backend** | Zaliczone pomyślnie (`Exit Code 0`) |
| **Build Frontend** | Zaliczone pomyślnie (`Exit Code 0`) |

### Lista krytycznych problemów:
- Brak środowiska ciągłej integracji i sprawdzania jakości CI/CD (brak wdrożenia `.github/workflows`).
- System logowania oparty jest wyłącznie na długoterminowym przechowywaniu pojedynczego tokenu bez mechanizmu rygorystycznego resetu (brak krótkoterminowych access_token + ciasteczek HttpOnly z refresh tokenem).
- Bardzo niskie testy operacyjne dla rdzennej logiki, tj. maszyny stanów zlecenia, zwrotów stanów po części z magazynu oraz miękkiego usuwania.

### Lista problemów historycznych:
- Głębokie i ignorowane stosowanie typu `any` na poziomie parametrów REST API (`@typescript-eslint/no-unsafe-assignment`) w komponentach takich jak obsługa pojazdów, interfejs pobrań frontendu, ustawienia serwisu.
- Pozbawione walidacji zapytania HTTP i brak wzorców DTO oraz brak bezpiecznego powrotu przy obiekcie błędów 500 wywołującym naruszenie integralności warstwy wewnętrznej.
- Wywoływanie stanu w trybie reaktywnym `useEffect` bezpośrednio asynchronicznie poza procedurą zapobiegającą pętli (`react-hooks/exhaustive-deps`, `react-hooks/set-state-in-effect`).
