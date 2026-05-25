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

## Wie die Aufgabenauswahl funktioniert (kurz und einfach)

Der Algorithmus arbeitet wie eine Lehrkraft: Er stellt nicht zufällig Aufgaben, sondern schaut, wo das Kind noch Übung braucht.

Reihenfolge bei der Auswahl der nächsten Aufgabe:

1. **Zuerst Fehler-Aufgaben** – bei einem Fehler bekommt die Aufgabe `errorDebt` (Fehler-Schuld) und kommt wieder, bis sie korrekt „abgebaut“ wurde.
2. **Dann neue Aufgaben** – wenn keine Fehler-Schuld offen ist, erweitert die App den Stoff mit noch nicht geübten Aufgaben.
3. **Dann langsame Aufgaben** – richtige, aber langsame Antworten gelten als noch nicht automatisiert und werden öfter wiederholt.

Zusätzliche Regeln:

- Der Aufgabenpool wird aus den Sitzungseinstellungen gebildet (Bereich, Rechenarten, Anzahl der Terme).
- Nicht erlaubte Aufgaben werden entfernt (z. B. negatives Ergebnis oder negativer Zwischenstand).
- Die Auswahl ist **gewichtet zufällig** (schwierige Aufgaben haben höhere Chance, aber nicht starre Reihenfolge).
- Wenn möglich, wird dieselbe Aufgabe nicht zweimal direkt hintereinander gezeigt.
- Sehr lange Pausen werden für die Statistik gedeckelt, damit der Durchschnitt nicht verfälscht wird.

Münzen sind ein eigenes Motivationssystem: richtig und schnell = mehr Münzen, falsch = 0 Münzen. Fehler nehmen keine Münzen weg, erhöhen aber die Chance auf Wiederholung der Aufgabe.


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
