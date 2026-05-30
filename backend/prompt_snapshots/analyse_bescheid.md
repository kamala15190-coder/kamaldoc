# ANALYSE_PROMPT — Behörden-Bescheid

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

{
  "kategorie": "behoerde",
  "absender": "MAGISTRAT DER STADT WIEN, Magistratisches Bezirksamt für den 3. Bezirk",
  "empfaenger": "Herr Mustermann",
  "datum": "2026-03-14",
  "betrag": 78.0,
  "faelligkeitsdatum": null,
  "handlung_erforderlich": true,
  "handlung_beschreibung": "Einspruch binnen zwei Wochen einlegen oder Betrag binnen zwei Wochen einzahlen",
  "zusammenfassung": "Das Magistratische Bezirksamt Wien verhängt eine Geldstrafe von 78 Euro wegen Halteverbotsverstoßes. Der Betrag ist binnen zwei Wochen zu zahlen oder Einspruch einzulegen.",
  "volltext": "MAGISTRAT DER STADT WIEN\nMagistratisches Bezirksamt für den 3. Bezirk\nGeschäftszahl: MBA 3 - S 45678/2026\n\nSTRAFVERFÜGUNG\n\nSehr geehrter Herr Mustermann,\nSie haben am 14.03.2026 um 10:42 Uhr in 1030 Wien, Landstraßer Hauptstraße 99,\nmit dem Fahrzeug mit dem Kennzeichen W-12345X im Bereich eines Halte- und\nParkverbots gehalten. Sie haben dadurch eine Verwaltungsübertretung gemäß\n§ 24 Abs. 1 lit. a StVO begangen.\n\nÜber Sie wird daher eine Geldstrafe von EUR 78,00 (im Nichteinbringungsfall\n18 Stunden Ersatzfreiheitsstrafe) verhängt.\n\nGegen diese Strafverfügung können Sie binnen zwei Wochen ab Zustellung\nEinspruch erheben. Der Einspruch ist schriftlich beim Magistratischen\nBezirksamt einzubringen.\n\nDer Betrag ist binnen zwei Wochen auf das Konto IBAN AT00 1234 5678 9012 3456\neinzuzahlen.",
  "kontakt_name": null,
  "kontakt_adresse": "1030 Wien, Landstraßer Hauptstraße 99",
  "kontakt_email": null,
  "kontakt_telefon": null,
  "dokument_sprache": "de",
  "expense_category": null
}
