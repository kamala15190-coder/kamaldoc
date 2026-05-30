# ANALYSE_PROMPT — Rechnung

## Eingabe (Auszug)

```
RECHNUNG Nr. 2026-0042
Elektro Huber GmbH, Hauptstraße 5, 4020 Linz
Rechnungsdatum: 18.03.2026

Pos.  Bezeichnung                      Menge   Einzelpreis   Gesamt
1     Installation Sicherungskasten    1       320,00        320,00
2     FI-Schutzschalter 40A            2        45,50         91,00
3     Arbeitsstunden Elektriker        6        65,00        390,00
4     Kleinmaterial pauschal           1        25,00         25,00

Nettobetrag:                                                826,00
USt 20%:                                                    165,20
Rechnungsbetrag:             
```

## Ausgabe

{
  "kategorie": "rechnung",
  "absender": "Elektro Huber GmbH",
  "empfaenger": null,
  "datum": "2026-03-18",
  "betrag": 991.2,
  "faelligkeitsdatum": "2026-04-01",
  "handlung_erforderlich": true,
  "handlung_beschreibung": "Rechnung über 991.20 EUR innerhalb von 14 Tagen bezahlen",
  "zusammenfassung": "Rechnung der Elektro Huber GmbH für Elektroinstallationsarbeiten inklusive Material und Arbeitsstunden. Der Rechnungsbetrag von 991.20 EUR ist innerhalb von 14 Tagen ohne Abzug zu zahlen.",
  "volltext": "RECHNUNG Nr. 2026-0042\nElektro Huber GmbH, Hauptstraße 5, 4020 Linz\nRechnungsdatum: 18.03.2026\n\nPos.  Bezeichnung                      Menge   Einzelpreis   Gesamt\n1     Installation Sicherungskasten    1       320,00        320,00\n2     FI-Schutzschalter 40A            2        45,50         91,00\n3     Arbeitsstunden Elektriker        6        65,00        390,00\n4     Kleinmaterial pauschal           1        25,00         25,00\n\nNettobetrag:                                                826,00\nUSt 20%:                                                    165,20\nRechnungsbetrag:                                            991,20\n\nZahlbar binnen 14 Tagen ohne Abzug.",
  "kontakt_name": null,
  "kontakt_adresse": "Hauptstraße 5, 4020 Linz",
  "kontakt_email": null,
  "kontakt_telefon": null,
  "dokument_sprache": "de",
  "expense_category": "haushalt"
}
