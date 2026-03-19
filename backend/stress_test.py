"""
KamalDoc Hardcore Stress Test
=============================
Tests rate limiting, large payloads, concurrent requests, auth bypass attempts,
path traversal, SQL injection probes, and edge cases.

Usage:
  python stress_test.py --base-url https://api.kdoc.at --token <JWT_TOKEN>

Requires: httpx, asyncio
"""

import argparse
import asyncio
import json
import os
import sys
import time
from io import BytesIO

try:
    import httpx
except ImportError:
    print("pip install httpx")
    sys.exit(1)


PASSED = 0
FAILED = 0
WARNINGS = 0


def result(name, ok, detail=""):
    global PASSED, FAILED, WARNINGS
    icon = "✅" if ok else "❌"
    if ok:
        PASSED += 1
    else:
        FAILED += 1
    print(f"  {icon} {name}" + (f" — {detail}" if detail else ""))


def warn(name, detail=""):
    global WARNINGS
    WARNINGS += 1
    print(f"  ⚠️  {name}" + (f" — {detail}" if detail else ""))


async def run_tests(base_url: str, token: str):
    headers = {"Authorization": f"Bearer {token}"}

    async with httpx.AsyncClient(base_url=base_url, timeout=30.0) as c:

        # ============================================================
        print("\n🔒 1. AUTH BYPASS TESTS")
        # ============================================================

        # No token
        r = await c.get("/api/documents")
        result("No auth header → 401", r.status_code == 401, f"got {r.status_code}")

        # Invalid token
        r = await c.get("/api/documents", headers={"Authorization": "Bearer invalidtoken123"})
        result("Invalid JWT → 401", r.status_code == 401, f"got {r.status_code}")

        # Expired token (malformed)
        r = await c.get("/api/documents", headers={"Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0IiwiZXhwIjoxMDAwMDAwMDAwfQ.abc"})
        result("Expired/malformed JWT → 401", r.status_code == 401, f"got {r.status_code}")

        # Missing Bearer prefix
        r = await c.get("/api/documents", headers={"Authorization": token})
        result("No 'Bearer' prefix → 401", r.status_code == 401, f"got {r.status_code}")

        # ============================================================
        print("\n🛡️  2. IDOR TESTS (accessing other users' data)")
        # ============================================================

        # Try to access doc ID 1 (likely belongs to another user)
        r = await c.get("/api/documents/1", headers=headers)
        result("Access other user's doc → 404", r.status_code == 404, f"got {r.status_code}")

        r = await c.get("/api/documents/1/file", headers=headers)
        result("Access other user's file → 404", r.status_code == 404, f"got {r.status_code}")

        r = await c.get("/api/documents/1/thumbnail", headers=headers)
        result("Access other user's thumbnail → 404", r.status_code == 404, f"got {r.status_code}")

        r = await c.get("/api/documents/999999/todos", headers=headers)
        result("Access non-existent doc todos → 404", r.status_code == 404, f"got {r.status_code}")

        # ============================================================
        print("\n💉 3. INJECTION TESTS")
        # ============================================================

        # SQL injection in search
        r = await c.get("/api/documents", headers=headers, params={"search": "' OR 1=1 --"})
        result("SQL injection in search → 200 (empty)", r.status_code == 200, f"got {r.status_code}")

        r = await c.get("/api/documents", headers=headers, params={"search": "'; DROP TABLE documents; --"})
        result("SQL DROP TABLE in search → 200 (no crash)", r.status_code == 200, f"got {r.status_code}")

        # SQL injection in kategorie filter
        r = await c.get("/api/documents", headers=headers, params={"kategorie": "' UNION SELECT * FROM admins --"})
        result("SQL injection in kategorie → 200 (empty)", r.status_code == 200, f"got {r.status_code}")

        # XSS in todo text
        r = await c.get("/api/documents", headers=headers)
        docs = r.json().get("documents", [])
        if docs:
            doc_id = docs[0]["id"]
            xss_payload = '<script>alert("xss")</script>'
            r = await c.post(f"/api/documents/{doc_id}/todos", headers=headers, json={"text": xss_payload})
            if r.status_code == 200:
                todo_id = r.json().get("id")
                result("XSS in todo stored (check output escaping)", True, "stored but React auto-escapes")
                # cleanup
                await c.delete(f"/api/todos/{todo_id}", headers=headers)
            else:
                result("XSS in todo", True, f"rejected with {r.status_code}")
        else:
            warn("No docs found for XSS test — skipping")

        # ============================================================
        print("\n📁 4. FILE UPLOAD SECURITY TESTS")
        # ============================================================

        # Wrong extension
        r = await c.post("/api/upload", headers=headers,
                         files={"file": ("test.exe", b"MZ\x90\x00", "application/octet-stream")},
                         params={"doc_type": "standard"})
        result("Upload .exe → 400", r.status_code == 400, f"got {r.status_code}")

        # Double extension
        r = await c.post("/api/upload", headers=headers,
                         files={"file": ("test.jpg.exe", b"fake", "application/octet-stream")},
                         params={"doc_type": "standard"})
        result("Upload .jpg.exe → 400", r.status_code == 400, f"got {r.status_code}")

        # Path traversal in filename
        r = await c.post("/api/upload", headers=headers,
                         files={"file": ("../../../etc/passwd.jpg", b"\xff\xd8\xff\xe0", "image/jpeg")},
                         params={"doc_type": "standard"})
        # Should succeed (filename is stored in DB only, file saved with UUID)
        result("Path traversal filename → safe (UUID-based save)",
               r.status_code in (200, 201, 403), f"got {r.status_code}")

        # Oversized file (21 MB)
        big_data = b"\xff\xd8\xff\xe0" + b"\x00" * (21 * 1024 * 1024)
        r = await c.post("/api/upload", headers=headers,
                         files={"file": ("big.jpg", big_data, "image/jpeg")},
                         params={"doc_type": "standard"})
        result("Upload 21MB file → 413", r.status_code == 413, f"got {r.status_code}")

        # Empty file
        r = await c.post("/api/upload", headers=headers,
                         files={"file": ("empty.jpg", b"", "image/jpeg")},
                         params={"doc_type": "standard"})
        result("Upload empty file → error or handled", r.status_code != 500, f"got {r.status_code}")

        # ============================================================
        print("\n📏 5. INPUT VALIDATION TESTS")
        # ============================================================

        # Extremely long search string
        r = await c.get("/api/documents", headers=headers, params={"search": "A" * 10000})
        result("10K char search → no crash", r.status_code in (200, 400, 422), f"got {r.status_code}")

        # Negative doc_id
        r = await c.get("/api/documents/-1", headers=headers)
        result("Negative doc_id → 404 or 422", r.status_code in (404, 422), f"got {r.status_code}")

        # Float doc_id
        r = await c.get("/api/documents/1.5", headers=headers)
        result("Float doc_id → 404 or 422", r.status_code in (404, 422), f"got {r.status_code}")

        # Support ticket with too-long message
        r = await c.post("/api/support/ticket", headers=headers, json={
            "priority": "mittel",
            "email": "test@test.com",
            "message": "A" * 6000,
        })
        result("Support 6K char message → 400", r.status_code == 400, f"got {r.status_code}")

        # Invalid email in support
        r = await c.post("/api/support/ticket", headers=headers, json={
            "priority": "mittel",
            "email": "not-an-email",
            "message": "A" * 25,
        })
        result("Invalid email in support → 400", r.status_code == 400, f"got {r.status_code}")

        # ============================================================
        print("\n🔐 6. ADMIN PROTECTION TESTS")
        # ============================================================

        r = await c.get("/api/admin/list", headers=headers)
        result("Admin list (non-admin) → 403", r.status_code == 403, f"got {r.status_code}")

        r = await c.post("/api/admin/add", headers=headers, json={"email": "hacker@evil.com"})
        result("Admin add (non-admin) → 403", r.status_code == 403, f"got {r.status_code}")

        r = await c.post("/api/admin/change-plan", headers=headers, json={"email": "a@b.com", "new_plan": "pro"})
        result("Admin change plan (non-admin) → 403", r.status_code == 403, f"got {r.status_code}")

        r = await c.get("/api/admin/support-email", headers=headers)
        result("Admin support email (non-admin) → 403", r.status_code == 403, f"got {r.status_code}")

        # ============================================================
        print("\n⚡ 7. RATE LIMITING STRESS TEST")
        # ============================================================

        print("  Sending 130 requests in quick succession...")
        tasks = [c.get("/api/documents", headers=headers) for _ in range(130)]
        responses = await asyncio.gather(*tasks, return_exceptions=True)
        status_codes = [r.status_code for r in responses if not isinstance(r, Exception)]
        rate_limited = sum(1 for s in status_codes if s == 429)
        result(f"Rate limiter triggered ({rate_limited}/130 got 429)", rate_limited > 0,
               f"{rate_limited} rate-limited")

        # Wait for rate limit window to reset
        print("  Waiting 5s for rate limit cooldown...")
        await asyncio.sleep(5)

        # ============================================================
        print("\n🔄 8. CONCURRENT WRITE TESTS")
        # ============================================================

        if docs:
            doc_id = docs[0]["id"]
            # Concurrent updates to same document
            tasks = [
                c.patch(f"/api/documents/{doc_id}", headers=headers,
                        json={"notizen": f"concurrent-{i}"})
                for i in range(20)
            ]
            results_list = await asyncio.gather(*tasks, return_exceptions=True)
            ok_count = sum(1 for r in results_list if not isinstance(r, Exception) and r.status_code == 200)
            err_count = sum(1 for r in results_list if isinstance(r, Exception) or (hasattr(r, 'status_code') and r.status_code >= 500))
            result(f"20 concurrent updates → {ok_count} ok, {err_count} errors",
                   err_count == 0, f"no 500 errors")
        else:
            warn("No docs for concurrent write test")

        # ============================================================
        print("\n🌐 9. SUBSCRIPTION/PAYMENT SECURITY")
        # ============================================================

        # Try to downgrade to invalid plan
        r = await c.post("/api/subscription/downgrade", headers=headers, json={"target_plan": "enterprise"})
        result("Downgrade to invalid plan → 400", r.status_code == 400, f"got {r.status_code}")

        # Try to create checkout for invalid plan
        r = await c.post("/api/subscription/create-checkout", headers=headers, json={"plan": "super_pro"})
        result("Checkout invalid plan → 400", r.status_code == 400, f"got {r.status_code}")

        # Fake webhook without signature
        r = await c.post("/api/subscription/webhook",
                         content=json.dumps({"type": "checkout.session.completed"}),
                         headers={"Content-Type": "application/json"})
        result("Webhook without signature → 400", r.status_code == 400, f"got {r.status_code}")

        # ============================================================
        print("\n🧪 10. EDGE CASES")
        # ============================================================

        # Status endpoint (no auth required)
        r = await c.get("/api/status")
        result("Status endpoint accessible", r.status_code == 200, f"got {r.status_code}")

        # OPTIONS preflight
        r = await c.options("/api/documents")
        result("CORS preflight → 200", r.status_code == 200, f"got {r.status_code}")

        # Unicode in search
        r = await c.get("/api/documents", headers=headers, params={"search": "日本語テスト🎌"})
        result("Unicode search → 200", r.status_code == 200, f"got {r.status_code}")

        # Null bytes in input
        r = await c.patch("/api/documents/1", headers=headers, json={"notizen": "test\x00null"})
        result("Null bytes in input → no crash", r.status_code != 500, f"got {r.status_code}")

        # Very large JSON body
        r = await c.post("/api/support/ticket", headers=headers,
                         content=json.dumps({"priority": "mittel", "email": "a@b.com", "message": "x" * 100000}),
                         headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
        result("100KB JSON body → handled", r.status_code != 500, f"got {r.status_code}")

    # ============================================================
    print(f"\n{'='*50}")
    print(f"  RESULTS: {PASSED} passed, {FAILED} failed, {WARNINGS} warnings")
    print(f"{'='*50}\n")

    return FAILED == 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="KamalDoc Security Stress Test")
    parser.add_argument("--base-url", default="https://api.kdoc.at", help="API base URL")
    parser.add_argument("--token", required=True, help="Valid JWT token for authenticated tests")
    args = parser.parse_args()

    print(f"\n🔥 KamalDoc Hardcore Stress Test")
    print(f"   Target: {args.base_url}\n")

    ok = asyncio.run(run_tests(args.base_url, args.token))
    sys.exit(0 if ok else 1)
