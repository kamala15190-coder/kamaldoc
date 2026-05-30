# EXPENSE_ITEMS_PROMPT — Rechnung

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

[
  {
    "name": "Installation Sicherungskasten",
    "category": "Haushalt",
    "subcategory": "Elektroinstallation",
    "price": 320.0
  },
  {
    "name": "FI-Schutzschalter 40A",
    "category": "Haushalt",
    "subcategory": "Elektroinstallation",
    "price": 91.0
  },
  {
    "name": "Arbeitsstunden Elektriker",
    "category": "Haushalt",
    "subcategory": "Elektroinstallation",
    "price": 390.0
  },
  {
    "name": "Kleinmaterial pauschal",
    "category": "Haushalt",
    "subcategory": "Elektroinstallation",
    "price": 25.0
  }
]
