# AI Workflow Rules

Te reguły opisują sposób pracy agenta AI w tym repozytorium.

## Obowiązkowy przebieg pracy

1. **Najpierw parafraza zadania**  
   Zanim agent wygeneruje kod, musi własnymi słowami opisać, co zrozumiał i co zamierza zrobić.

2. **Najpierw lektura reguł z `DOCS/`**  
   Każde zadanie rozpoczynamy od sprawdzenia aktualnych reguł w folderze `DOCS`.

3. **Praca zgodna z TDD**  
   Zmiany implementacyjne prowadzić w cyklu: test -> implementacja -> refaktoryzacja.

4. **Automatyzacja i uruchamianie developerki**  
   `npm run dev` uruchamiamy dopiero po zielonych testach.

## Minimalna checklista przed zakończeniem zadania

- [ ] Agent zrobił parafrazę zadania przed kodowaniem.
- [ ] Reguły z `DOCS/` zostały odczytane.
- [ ] Testy przeszły.
- [ ] Dopiero po testach uruchomiono `npm run dev` (jeśli było potrzebne).
