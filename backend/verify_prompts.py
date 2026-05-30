"""Phase J — agent-prompt verification harness.

Runs each fixed agent prompt against 2-3 realistic sample documents through the
live Mistral backend and writes the outputs to prompt_snapshots/ for review
(language / format / correctness). Run on the server inside the venv with the
backend .env loaded:

    cd /opt/kamaldoc/app/backend && set -a && . ./.env && set +a \
        && /opt/kamaldoc/venv/bin/python verify_prompts.py
"""

import asyncio
import json
import os

import llm_service as L

OUT = os.path.join(os.path.dirname(__file__), "prompt_snapshots")
os.makedirs(OUT, exist_ok=True)

# --- Realistic German sample documents --------------------------------------

BESCHEID = """MAGISTRAT DER STADT WIEN
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

Gegen diese Strafverfügung können Sie binnen zwei Wochen ab Zustellung
Einspruch erheben. Der Einspruch ist schriftlich beim Magistratischen
Bezirksamt einzubringen.

Der Betrag ist binnen zwei Wochen auf das Konto IBAN AT00 1234 5678 9012 3456
einzuzahlen.
"""

BEFUND = """RADIOLOGISCHER BEFUND
Patient: Mustermann Max, geb. 01.01.1980
Untersuchung: MRT der Lendenwirbelsäule, nativ
Datum: 20.03.2026

Befund:
Regelrechte Stellung der LWS. Bei L4/L5 zeigt sich eine breitbasige
dorsomediane Bandscheibenprotrusion mit Kontakt zur Wurzel L5 links, ohne
höhergradige Spinalkanalstenose. Bei L5/S1 mäßige Osteochondrose mit
diskreter Protrusion ohne Wurzelkompression. Kein Hinweis auf Fraktur,
Tumor oder entzündliche Veränderung. Conus medullaris unauffällig.

Beurteilung:
Bandscheibenprotrusion L4/L5 mit Wurzelkontakt L5 links. Degenerative
Veränderungen L5/S1.
"""

RECHNUNG = """RECHNUNG Nr. 2026-0042
Elektro Huber GmbH, Hauptstraße 5, 4020 Linz
Rechnungsdatum: 18.03.2026

Pos.  Bezeichnung                      Menge   Einzelpreis   Gesamt
1     Installation Sicherungskasten    1       320,00        320,00
2     FI-Schutzschalter 40A            2        45,50         91,00
3     Arbeitsstunden Elektriker        6        65,00        390,00
4     Kleinmaterial pauschal           1        25,00         25,00

Nettobetrag:                                                826,00
USt 20%:                                                    165,20
Rechnungsbetrag:                                            991,20

Zahlbar binnen 14 Tagen ohne Abzug.
"""

PHISHING = """Von: Service <security@spar-kasse-konto.com>
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
"""

EINSTELLUNGEN = {
    "vorname": "Max", "nachname": "Mustermann", "adresse": "Beispielgasse 1",
    "plz": "1030", "ort": "Wien", "email": "max@example.at", "telefon": "+43 660 1234567",
}


def write(name: str, title: str, sample: str, output) -> None:
    path = os.path.join(OUT, f"{name}.md")
    if not isinstance(output, str):
        output = json.dumps(output, ensure_ascii=False, indent=2)
    with open(path, "w", encoding="utf-8") as f:
        f.write(f"# {title}\n\n## Eingabe (Auszug)\n\n```\n{sample[:600]}\n```\n\n## Ausgabe\n\n{output}\n")
    print(f"  wrote {name}.md ({len(output)} chars)")


async def main():
    print("ANALYSE (Bescheid)…")
    write("analyse_bescheid", "ANALYSE_PROMPT — Behörden-Bescheid", BESCHEID,
          await L.analyze_document_from_text(BESCHEID))

    print("ANALYSE (Rechnung)…")
    write("analyse_rechnung", "ANALYSE_PROMPT — Rechnung", RECHNUNG,
          await L.analyze_document_from_text(RECHNUNG))

    print("EXPENSE_ITEMS (Rechnung)…")
    write("expense_items_rechnung", "EXPENSE_ITEMS_PROMPT — Rechnung", RECHNUNG,
          await L.extract_expense_items(RECHNUNG))

    print("BEFUND_SIMPLIFY…")
    simple = await L.simplify_medical_report(BEFUND)
    write("befund_simplify", "BEFUND_SIMPLIFY_PROMPT — MRT-Befund", BEFUND, simple)

    print("BEFUND_TRANSLATE (en)…")
    write("befund_translate_en", "BEFUND_TRANSLATE_PROMPT — simplified → English", simple,
          await L.translate_simplified_report(simple, "en"))

    print("BEHOERDE explain…")
    write("behoerde_explain", "BEHOERDE_PROMPT — Bescheid erklärt", BESCHEID,
          await L.explain_authority_document(BESCHEID, "de"))

    print("LEGAL_ASSESSMENT…")
    write("legal_assessment", "LEGAL_ASSESSMENT_PROMPT — Bescheid", BESCHEID,
          await L.legal_assessment(BESCHEID, "de"))

    print("CONTESTABLE_ELEMENTS…")
    write("contestable_elements", "CONTESTABLE_ELEMENTS_PROMPT — Bescheid", BESCHEID,
          await L.get_contestable_elements(BESCHEID, "de"))

    print("ANTWORT (reply)…")
    write("antwort_reply", "ANTWORT_PROMPT_TEMPLATE — Antwortbrief", BESCHEID,
          await L.generate_reply({"volltext": BESCHEID, "absender": "Magistrat Wien"},
                                 EINSTELLUNGEN, "de", "Ich war nicht der Fahrer.", "einspruch"))

    print("OBJECTION letter…")
    absender = "Max Mustermann, Beispielgasse 1, 1030 Wien"
    write("objection_letter", "OBJECTION_LETTER_PROMPT — Widerspruch", BESCHEID,
          await L.generate_objection_letter(BESCHEID, absender,
                                            "Fahrereigenschaft bestritten; Beschilderung unklar", "Deutsch"))

    print("PHISHING (de)…")
    write("phishing_de", "PHISHING_PROMPT — Fake-Bank (de)", PHISHING,
          await L.check_phishing(PHISHING, "de"))

    print("PHISHING (en)…")
    write("phishing_en", "PHISHING_PROMPT — Fake-Bank (en output)", PHISHING,
          await L.check_phishing(PHISHING, "en"))

    print("done.")


if __name__ == "__main__":
    asyncio.run(main())
