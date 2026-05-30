# CONTESTABLE_ELEMENTS_PROMPT — Bescheid

## Eingabe (Auszug)

```
MAGISTRAT DER STADT WIEN
Magistratisches Bezirksamt für den 3. Bezirk
Geschäftszahl: MBA 3 - S 45678/2026

STRAFVERFÜGUNG

Sehr geehrter Herr Mustermann,
Sie haben am 14.03.2026 um 10:42 Uhr in 1030 Wien, Landstraßer Hauptstraße 99,
mit dem Fahrzeug mit dem Kennzeichen W-12345X im Bereich eines Halte- und
Parkverbots gehalten. Sie haben dadurch eine Verwaltungsübertretung gemäß
§ 24 Abs. 1 lit. a StVO begangen.

Über Sie wird daher eine Geldstrafe von EUR 78,00 (im Nichteinbringungsfall
18 Stunden Ersatzfreiheitsstrafe) verhängt.

Gegen diese Strafverfügung können Sie binnen zwei Wochen ab Zus
```

## Ausgabe

[
  {
    "id": 1,
    "element": "Geschäftszahl",
    "description": "MBA 3 - S 45678/2026",
    "reason": "Unklarheit über die korrekte Zuordnung oder mögliche Verwechslung mit anderen Verfahren"
  },
  {
    "id": 2,
    "element": "Tatzeitpunkt",
    "description": "14.03.2026 um 10:42 Uhr",
    "reason": "Mögliche Ungenauigkeit oder falsche Datumsangabe, die die Tatzeit in Frage stellt"
  },
  {
    "id": 3,
    "element": "Ort der Tat",
    "description": "1030 Wien, Landstraßer Hauptstraße 99",
    "reason": "Unklarheit über die genaue Lage des Halte- und Parkverbots oder falsche Adressangabe"
  },
  {
    "id": 4,
    "element": "Fahrzeugkennzeichen",
    "description": "W-12345X",
    "reason": "Mögliche Verwechslung mit einem anderen Fahrzeug oder falsche Kennzeicheneintragung"
  },
  {
    "id": 5,
    "element": "Rechtsgrundlage",
    "description": "§ 24 Abs. 1 lit. a StVO",
    "reason": "Unklarheit über die korrekte Anwendung der Rechtsnorm oder mögliche Fehlinterpretation des Sachverhalts"
  },
  {
    "id": 6,
    "element": "Verwaltungsübertretung",
    "description": "Halten im Halte- und Parkverbot",
    "reason": "Mögliche Zweifel an der Tatbestandsmäßigkeit oder Beweislage"
  },
  {
    "id": 7,
    "element": "Geldstrafe",
    "description": "EUR 78,00",
    "reason": "Unangemessenheit der Höhe der Strafe im Verhältnis zur Tat oder fehlende Berücksichtigung von Milderungsgründen"
  },
  {
    "id": 8,
    "element": "Ersatzfreiheitsstrafe",
    "description": "18 Stunden Ersatzfreiheitsstrafe im Nichteinbringungsfall",
    "reason": "Unverhältnismäßigkeit der Ersatzstrafe oder fehlende Berücksichtigung der wirtschaftlichen Verhältnisse"
  },
  {
    "id": 9,
    "element": "Einspruchsfrist",
    "description": "binnen zwei Wochen ab Zustellung",
    "reason": "Frist könnte zu kurz bemessen sein oder Zustellungszeitpunkt unklar"
  },
  {
    "id": 10,
    "element": "Einspruchsweg",
    "description": "schriftlich beim Magistratischen Bezirksamt",
    "reason": "Mögliche Formfehler oder Unsicherheit über die korrekte Einreichung"
  },
  {
    "id": 11,
    "element": "Zahlungsfrist",
    "description": "binnen zwei Wochen",
    "reason": "Frist könnte zu kurz sein oder Zahlungsmodalitäten unklar"
  },
  {
    "id": 12,
    "element": "Zahlungskonto",
    "description": "IBAN AT00 1234 5678 9012 3456",
    "reason": "Mögliche Fehler in der Kontonummer oder Bankverbindung"
  }
]
