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
