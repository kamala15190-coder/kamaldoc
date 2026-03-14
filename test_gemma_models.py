import httpx

api_key = "***REDACTED_API_KEY***"

# Gemma-3-Modelle zum Testen (von klein nach groß)
test_models = [
    "google/gemma-3-1b-it",
    "google/gemma-3-4b-it",
    "google/gemma-2-9b-it",
    "google/gemma-3-27b-it",
    "google/gemma-3-12b-it",
]

print("=" * 70)
print("Teste welche Gemma-Modelle für Chat Completions verfügbar sind")
print("=" * 70)

for model in test_models:
    print(f"\nTeste: {model}...", end=" ")
    try:
        response = httpx.post(
            "https://api.together.xyz/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": model,
                "messages": [{"role": "user", "content": "Sage nur: OK"}],
                "max_tokens": 10,
                "temperature": 0.1
            },
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            content = result["choices"][0]["message"]["content"]
            print(f"✓ VERFÜGBAR - Antwort: {content.strip()}")
        elif response.status_code == 404:
            print("✗ Nicht verfügbar (404)")
        elif response.status_code == 402:
            print("⚠ Kein Guthaben (402)")
        else:
            print(f"✗ Fehler {response.status_code}")
            
    except Exception as e:
        print(f"✗ Exception: {e}")

print("\n" + "=" * 70)
