# MatheMeister

MatheMeister ist eine Trainings-App für Addition und Subtraktion. Das Hauptziel ist:

- Aufgaben bis 20 zu erkennen, die dem Kind am meisten Schwierigkeiten machen,
- diese schwierigen Aufgaben intensiv zu trainieren,
- Wiederholungen bei bereits leichten Aufgaben schrittweise zu reduzieren.

## Adaptives Kernziel

Die schwierigsten Aufgaben werden anhand der Statistik (`aufgabenstatistik` / `problemStats`) erkannt:

- **hohe Fehlerzahl** (`wrong`),
- **langsame Bearbeitung** (`averageResponseTimeMs`),
- zusammengeführt im Schwierigkeitswert (`difficultyScore`).

Die Aufgabenauswahl nutzt diese Statistik für gewichtete Zufallsauswahl. Dadurch erscheinen schwierigere Aufgaben häufiger.

## Jak działa wybór zadań (krótko i po ludzku)

Algorytm działa jak nauczyciel: nie losuje pytań „w ciemno”, tylko patrzy, co dziecku idzie trudniej.

Kolejność doboru kolejnego zadania:

1. **Najpierw wracają błędy** – jeśli w zadaniu była pomyłka, dostaje ono `errorDebt` (dług błędu) i wraca, aż zostanie poprawnie „odrobione”.
2. **Potem nowe zadania** – gdy brak błędów do poprawy, aplikacja poszerza materiał o działania jeszcze niećwiczone.
3. **Na końcu zadania wolne** – jeśli odpowiedź była poprawna, ale długo trwała, takie zadanie też wraca częściej.

Dodatkowe zasady:

- pula zadań jest budowana z ustawień sesji (zakres, działania, liczba składników),
- odrzucane są działania niedozwolone (np. ujemny wynik lub ujemny wynik pośredni),
- wybór jest **ważonym losowaniem** (trudniejsze zadania mają większą szansę, ale nie „lecą” zawsze w tej samej kolejności),
- aplikacja unika pokazywania tego samego działania dwa razy pod rząd, jeśli są inne opcje,
- bardzo długie pauzy są przycinane do limitu czasu w statystykach, żeby nie psuć średniej.

Monety są motywacją i są liczone osobno: poprawnie i szybciej = więcej monet, błędna odpowiedź = 0 monet. Błąd nie zabiera monet, ale zwiększa szansę powrotu zadania.

## `benutzerdefinierte aufgaben`

Benutzerdefinierte Aufgaben werden bevorzugt berücksichtigt, aber gezielt gesteuert:

- benutzerdefinierte Aufgaben erhalten ein zusätzliches Gewicht,
- wenn eine benutzerdefinierte Aufgabe bereits leicht ist (wenige Fehler, schnelle Antwortzeit), wird ihr Gewicht reduziert,
- dadurch wird unnötige Wiederholung über mehrere Sitzungen vermieden.

## Architektur (wichtigste Dateien)

- `src/lib/math.ts` – Generierung des Aufgabenpools und Parsing benutzerdefinierter Aufgaben,
- `src/lib/adaptive.ts` – adaptive Logik (Gewichtung, Schwierigkeit, Statistik-Update),
- `src/App.tsx` – Sitzungsablauf und Auswahl der nächsten Aufgabe,
- `src/lib/storage.ts` – Speichern/Laden von Profil und Statistik.

## Starten

```bash
npm install
npm run dev
```

## Tests

```bash
npm test
```

## Benutzerdaten

Profil und Statistiken werden lokal im Browser (LocalStorage) gespeichert, inklusive:

- Sitzungseinstellungen,
- Ergebnisverlauf,
- `problemStats` (`aufgabenstatistik`) als Grundlage der adaptiven Auswahl.
