import httpx
import json

api_key = "***REDACTED_API_KEY***"

print("=" * 60)
print("Together.ai API Test")
print("=" * 60)

# Verfügbare Modelle abrufen
print("\n1. Lade verfügbare Modelle...")
try:
    response = httpx.get(
        "https://api.together.xyz/v1/models",
        headers={"Authorization": f"Bearer {api_key}"},
        timeout=30
    )
    response.raise_for_status()
    models = response.json()
    
    # Nach Gemma suchen
    gemma_models = [m for m in models if "gemma" in m.get("id", "").lower()]
    print(f"\nVerfügbare Gemma Modelle ({len(gemma_models)} gefunden):")
    for m in gemma_models:
        print(f"  - {m['id']}")
    
    # Prüfe ob gemma-3-12b-it verfügbar ist
    target_model = "google/gemma-3-12b-it"
    model_ids = [m.get("id") for m in models]
    
    if target_model in model_ids:
        print(f"\n✓ Zielmodell '{target_model}' ist verfügbar!")
    else:
        print(f"\n✗ Zielmodell '{target_model}' nicht gefunden.")
        print("\nÄhnliche Modelle:")
        similar = [m for m in model_ids if "gemma" in m.lower() and "12b" in m.lower()]
        for s in similar[:5]:
            print(f"  - {s}")
    
except Exception as e:
    print(f"FEHLER beim Laden der Modelle: {e}")
    exit(1)

# Test-Anfrage
print("\n" + "=" * 60)
print("2. Test-Anfrage an gemma-3-12b-it...")
print("=" * 60)

try:
    test_response = httpx.post(
        "https://api.together.xyz/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        },
        json={
            "model": "google/gemma-3-12b-it",
            "messages": [{"role": "user", "content": "Antworte nur mit: API funktioniert!"}],
            "max_tokens": 50,
            "temperature": 0.1
        },
        timeout=30
    )
    test_response.raise_for_status()
    result = test_response.json()
    
    print("\nAntwort:")
    print(json.dumps(result, indent=2, ensure_ascii=False))
    
    if "choices" in result and len(result["choices"]) > 0:
        content = result["choices"][0]["message"]["content"]
        print(f"\n✓ Modell-Antwort: {content}")
        print("\n✓ API funktioniert korrekt!")
    
except httpx.HTTPStatusError as e:
    print(f"\nHTTP Fehler {e.response.status_code}:")
    print(e.response.text)
except Exception as e:
    print(f"\nFEHLER: {e}")

print("\n" + "=" * 60)
