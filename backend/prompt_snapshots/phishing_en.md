# PHISHING_PROMPT — Fake-Bank (en output)

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
      "title": "Suspicious sender domain",
      "text": "The sender domain 'spar-kasse-konto.com' is not the official domain of a legitimate bank (e.g., 'spar-kasse.de'). It contains a hyphen and a generic term ('konto'), which is atypical for official banking communications."
    },
    {
      "type": "red",
      "title": "Urgency and threat",
      "text": "The message creates artificial urgency by stating the account will be permanently deactivated within 24 hours if no action is taken, which is a common phishing tactic to pressure victims."
    },
    {
      "type": "red",
      "title": "Suspicious link",
      "text": "The link 'http://spar-kasse-konto.com/verifizierung?id=8842' uses a non-official domain and does not match the expected HTTPS protocol or the bank's official website structure."
    },
    {
      "type": "red",
      "title": "Request for sensitive data",
      "text": "The message explicitly asks the recipient to confirm their data via a link, which is a hallmark of phishing attempts to harvest login credentials or personal information."
    },
    {
      "type": "red",
      "title": "Generic greeting",
      "text": "The greeting 'Sehr geehrter Kunde' is impersonal and does not include the recipient's name, which is unusual for legitimate banking communications that typically address customers by name."
    },
    {
      "type": "green",
      "title": "No spelling errors",
      "text": "The message is grammatically correct and free of obvious spelling errors, which is less common in low-effort phishing attempts."
    }
  ]
}
