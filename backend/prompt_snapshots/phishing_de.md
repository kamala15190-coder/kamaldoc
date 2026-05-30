# PHISHING_PROMPT — Fake-Bank (de)

## Eingabe (Auszug)

```
Von: Service <security@spar-kasse-konto.com>
Betreff: Dringend: Ihr Konto wurde gesperrt!

Sehr geehrter Kunde,

wir haben ungewöhnliche Aktivitäten auf Ihrem Konto festgestellt. Aus
Sicherheitsgründen wurde Ihr Online-Banking vorübergehend gesperrt.

Um Ihr Konto innerhalb von 24 Stunden wieder freizuschalten, bestätigen Sie
bitte umgehend Ihre Daten über den folgenden Link:

http://spar-kasse-konto.com/verifizierung?id=8842

Andernfalls wird Ihr Konto dauerhaft deaktiviert.

Mit freundlichen Grüßen
Ihr Sicherheitsteam

```

## Ausgabe

{
  "risk_score": 95,
  "verdict": "phishing",
  "reasoning": [
    {
      "type": "red",
      "title": "Falsche Absender-Domain",
      "text": "Die Domain 'spar-kasse-konto.com' weicht von der offiziellen Domain einer Sparkasse ab (typisch: sparkasse.de oder regionale Domains wie sparkasse-muenchen.de)."
    },
    {
      "type": "red",
      "title": "Dringlichkeit und Drohung",
      "text": "Die Nachricht setzt den Empfänger unter Zeitdruck ('innerhalb von 24 Stunden') und droht mit dauerhafter Deaktivierung des Kontos – klassisches Phishing-Muster."
    },
    {
      "type": "red",
      "title": "Verdächtiger Link",
      "text": "Der Link 'http://spar-kasse-konto.com/verifizierung?id=8842' führt auf eine externe, nicht zur Sparkasse gehörende Domain. Die Subdomain 'spar-kasse-konto.com' ist kein offizieller Bestandteil der Sparkassen-Infrastruktur."
    },
    {
      "type": "red",
      "title": "Aufforderung zur Datenpreisgabe",
      "text": "Die Bitte, 'umgehend Ihre Daten' über einen Link zu bestätigen, ist ein klares Indiz für Phishing. Banken fordern niemals per E-Mail zur Eingabe von Zugangsdaten auf."
    },
    {
      "type": "red",
      "title": "Unpersönliche Anrede",
      "text": "Die Anrede 'Sehr geehrter Kunde' ist generisch und enthält keinen Namen oder Kontonummer – typisch für Massen-Phishing."
    },
    {
      "type": "green",
      "title": "Keine offensichtlichen Grammatikfehler",
      "text": "Der Text enthält keine groben Rechtschreib- oder Grammatikfehler, was jedoch nicht gegen Phishing spricht, da moderne Phishing-Mails oft korrekt formuliert sind."
    }
  ]
}
