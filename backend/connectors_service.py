"""
E-mail connector service (Phase F).

Server-side storage and inbox search across multiple e-mail accounts. Tokens
and passwords live only here, encrypted at rest via crypto.py. Doka's
kdoc_search_emails tool calls search_emails() to query all active accounts in
parallel.

IMAP is handled with the stdlib imaplib run in a thread (asyncio.to_thread) —
dependency-free and equivalent to aioimaplib for our read-only search.
"""

import asyncio
import json
import logging
import os

import httpx

from crypto import decrypt_credentials, encrypt_credentials
from database import get_db

logger = logging.getLogger(__name__)

GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me"

# Provider metadata. Password/IMAP providers carry their host so the UI only
# needs the user's address + app-password.
AVAILABLE_CONNECTORS = {
    "gmail":   {"label": "Gmail", "auth": "oauth", "capabilities": ["search"]},
    "outlook": {"label": "Outlook / Microsoft", "auth": "oauth", "capabilities": ["search"]},
    "imap":    {"label": "IMAP (generisch)", "auth": "imap", "capabilities": ["search"]},
    "gmx":     {"label": "GMX", "auth": "imap", "host": "imap.gmx.net", "port": 993, "capabilities": ["search"]},
    "icloud":  {"label": "iCloud Mail", "auth": "imap", "host": "imap.mail.me.com", "port": 993, "capabilities": ["search"]},
    "yahoo":   {"label": "Yahoo Mail", "auth": "imap", "host": "imap.mail.yahoo.com", "port": 993, "capabilities": ["search"]},
}


def _public_account(row) -> dict:
    """Account dict for the API — never includes credentials."""
    d = dict(row)
    d.pop("encrypted_credentials", None)
    if d.get("capabilities"):
        try:
            d["capabilities"] = json.loads(d["capabilities"])
        except (json.JSONDecodeError, TypeError):
            d["capabilities"] = []
    return d


async def list_accounts(user_id: str) -> list[dict]:
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT id, user_id, connector_type, display_name, remote_account_id, status, "
            "capabilities, last_sync_at, last_error, created_at "
            "FROM connector_accounts WHERE user_id = ? ORDER BY created_at DESC",
            (user_id,),
        )
        return [_public_account(r) for r in await cursor.fetchall()]
    finally:
        await db.close()


async def _insert_account(user_id, connector_type, display_name, remote_id, creds: dict, capabilities):
    blob = encrypt_credentials(json.dumps(creds))
    db = await get_db()
    try:
        cursor = await db.execute(
            "INSERT INTO connector_accounts "
            "(user_id, connector_type, display_name, remote_account_id, status, encrypted_credentials, capabilities) "
            "VALUES (?, ?, ?, ?, 'active', ?, ?) "
            "ON CONFLICT(user_id, connector_type, remote_account_id) DO UPDATE SET "
            "encrypted_credentials = excluded.encrypted_credentials, display_name = excluded.display_name, "
            "status = 'active', last_error = NULL",
            (user_id, connector_type, display_name, remote_id, blob, json.dumps(capabilities or ["search"])),
        )
        await db.commit()
        return cursor.lastrowid
    finally:
        await db.close()


async def add_imap_account(user_id, connector_type, display_name, email, password, host=None, port=993):
    meta = AVAILABLE_CONNECTORS.get(connector_type, {})
    host = host or meta.get("host")
    if not host:
        raise ValueError("IMAP-Host fehlt")
    creds = {"email": email, "password": password, "host": host, "port": int(port or 993)}
    return await _insert_account(user_id, connector_type, display_name or email, email, creds, ["search"])


async def add_oauth_account(user_id, connector_type, display_name, email, tokens: dict):
    return await _insert_account(user_id, connector_type, display_name or email, email, tokens, ["search"])


async def delete_account(user_id, account_id) -> bool:
    db = await get_db()
    try:
        cursor = await db.execute(
            "DELETE FROM connector_accounts WHERE id = ? AND user_id = ?", (account_id, user_id)
        )
        await db.commit()
        return cursor.rowcount > 0
    finally:
        await db.close()


async def _load_full(user_id, account_id=None):
    db = await get_db()
    try:
        if account_id is not None:
            cursor = await db.execute(
                "SELECT * FROM connector_accounts WHERE id = ? AND user_id = ?", (account_id, user_id)
            )
        else:
            cursor = await db.execute(
                "SELECT * FROM connector_accounts WHERE user_id = ? AND status = 'active'", (user_id,)
            )
        return await cursor.fetchall()
    finally:
        await db.close()


async def _mark_account(account_id, *, status=None, error=None, synced=False):
    db = await get_db()
    try:
        sets, params = [], []
        if status:
            sets.append("status = ?"); params.append(status)
        sets.append("last_error = ?"); params.append(error)
        if synced:
            sets.append("last_sync_at = datetime('now','localtime')")
        params.append(account_id)
        await db.execute(f"UPDATE connector_accounts SET {', '.join(sets)} WHERE id = ?", params)
        await db.commit()
    finally:
        await db.close()


# --- Inbox search ------------------------------------------------------------

def _imap_search_sync(host, port, email, password, query, maxn) -> list[dict]:
    import email as emaillib
    import imaplib
    from email.header import decode_header, make_header

    out = []
    M = imaplib.IMAP4_SSL(host, int(port))
    try:
        M.login(email, password)
        M.select("INBOX", readonly=True)
        crit = ("TEXT", f'"{query}"') if query else ("ALL",)
        typ, data = M.search(None, *crit)
        if typ != "OK":
            return out
        ids = data[0].split()[-maxn:]
        for num in reversed(ids):
            typ, msg_data = M.fetch(num, "(BODY.PEEK[HEADER.FIELDS (FROM SUBJECT DATE)])")
            if typ != "OK" or not msg_data or not msg_data[0]:
                continue
            msg = emaillib.message_from_bytes(msg_data[0][1])
            def _h(name):
                try:
                    return str(make_header(decode_header(msg.get(name, "") or "")))
                except Exception:  # noqa: BLE001
                    return msg.get(name, "") or ""
            out.append({"from": _h("From"), "subject": _h("Subject"), "date": _h("Date"), "snippet": ""})
    finally:
        try:
            M.logout()
        except Exception:  # noqa: BLE001
            pass
    return out


async def _refresh_gmail_token(creds: dict) -> dict | None:
    client_id = os.getenv("GMAIL_CLIENT_ID") or os.getenv("GOOGLE_CLIENT_ID", "")
    client_secret = os.getenv("GMAIL_CLIENT_SECRET") or os.getenv("GOOGLE_CLIENT_SECRET", "")
    refresh = creds.get("refresh_token")
    if not (client_id and client_secret and refresh):
        return None
    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.post(GOOGLE_TOKEN_URL, data={
            "client_id": client_id, "client_secret": client_secret,
            "refresh_token": refresh, "grant_type": "refresh_token",
        })
    if resp.status_code != 200:
        return None
    tok = resp.json()
    creds["access_token"] = tok.get("access_token", creds.get("access_token"))
    return creds


async def _gmail_search(creds: dict, query, maxn) -> tuple[list[dict], dict | None]:
    """Returns (results, refreshed_creds_or_None)."""
    refreshed = None

    async def _do(token):
        async with httpx.AsyncClient(timeout=25) as client:
            lst = await client.get(
                f"{GMAIL_API}/messages",
                headers={"Authorization": f"Bearer {token}"},
                params={"q": query or "", "maxResults": maxn},
            )
            if lst.status_code == 401:
                return None
            lst.raise_for_status()
            ids = [m["id"] for m in (lst.json().get("messages") or [])][:maxn]
            results = []
            for mid in ids:
                det = await client.get(
                    f"{GMAIL_API}/messages/{mid}",
                    headers={"Authorization": f"Bearer {token}"},
                    params={"format": "metadata", "metadataHeaders": ["From", "Subject", "Date"]},
                )
                if det.status_code != 200:
                    continue
                payload = det.json()
                headers = {h["name"].lower(): h["value"] for h in payload.get("payload", {}).get("headers", [])}
                results.append({
                    "from": headers.get("from", ""), "subject": headers.get("subject", ""),
                    "date": headers.get("date", ""), "snippet": payload.get("snippet", ""),
                })
            return results

    res = await _do(creds.get("access_token", ""))
    if res is None:  # token expired → try one refresh
        refreshed = await _refresh_gmail_token(creds)
        if not refreshed:
            raise PermissionError("gmail token expired")
        res = await _do(refreshed["access_token"])
        if res is None:
            raise PermissionError("gmail token invalid after refresh")
    return res, refreshed


GRAPH_API = "https://graph.microsoft.com/v1.0/me"
MS_TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token"


async def _refresh_outlook_token(creds: dict) -> dict | None:
    client_id = os.getenv("OUTLOOK_CLIENT_ID", "")
    client_secret = os.getenv("OUTLOOK_CLIENT_SECRET", "")
    refresh = creds.get("refresh_token")
    if not (client_id and refresh):
        return None
    data = {
        "client_id": client_id, "refresh_token": refresh,
        "grant_type": "refresh_token",
        "scope": "https://graph.microsoft.com/Mail.Read offline_access",
    }
    if client_secret:
        data["client_secret"] = client_secret
    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.post(MS_TOKEN_URL, data=data)
    if resp.status_code != 200:
        return None
    tok = resp.json()
    creds["access_token"] = tok.get("access_token", creds.get("access_token"))
    if tok.get("refresh_token"):
        creds["refresh_token"] = tok["refresh_token"]
    return creds


async def _outlook_search(creds: dict, query, maxn) -> tuple[list[dict], dict | None]:
    """Microsoft Graph mailbox search. Returns (results, refreshed_creds_or_None)."""
    refreshed = None

    async def _do(token):
        params = {"$top": maxn, "$select": "from,subject,receivedDateTime,bodyPreview"}
        if query:
            params["$search"] = f'"{query}"'
        else:
            params["$orderby"] = "receivedDateTime desc"
        headers = {"Authorization": f"Bearer {token}", "ConsistencyLevel": "eventual"}
        async with httpx.AsyncClient(timeout=25) as client:
            resp = await client.get(f"{GRAPH_API}/messages", headers=headers, params=params)
        if resp.status_code == 401:
            return None
        resp.raise_for_status()
        out = []
        for m in (resp.json().get("value") or [])[:maxn]:
            sender = (m.get("from") or {}).get("emailAddress") or {}
            frm = sender.get("address") or sender.get("name") or ""
            if sender.get("name") and sender.get("address"):
                frm = f"{sender['name']} <{sender['address']}>"
            out.append({
                "from": frm, "subject": m.get("subject", ""),
                "date": m.get("receivedDateTime", ""), "snippet": m.get("bodyPreview", ""),
            })
        return out

    res = await _do(creds.get("access_token", ""))
    if res is None:
        refreshed = await _refresh_outlook_token(creds)
        if not refreshed:
            raise PermissionError("outlook token expired")
        res = await _do(refreshed["access_token"])
        if res is None:
            raise PermissionError("outlook token invalid after refresh")
    return res, refreshed


async def _search_one(row, query, maxn) -> list[dict]:
    account_id = row["id"]
    ctype = row["connector_type"]
    label = row["display_name"] or ctype
    try:
        creds = json.loads(decrypt_credentials(row["encrypted_credentials"]))
    except Exception as exc:  # noqa: BLE001
        await _mark_account(account_id, status="error", error=f"decrypt: {exc}")
        return []

    try:
        meta = AVAILABLE_CONNECTORS.get(ctype, {})
        if meta.get("auth") == "oauth" and ctype == "gmail":
            results, refreshed = await _gmail_search(creds, query, maxn)
            if refreshed:
                await _insert_account(row["user_id"], ctype, label, row["remote_account_id"], refreshed, ["search"])
        elif meta.get("auth") == "oauth" and ctype == "outlook":
            results, refreshed = await _outlook_search(creds, query, maxn)
            if refreshed:
                await _insert_account(row["user_id"], ctype, label, row["remote_account_id"], refreshed, ["search"])
        elif meta.get("auth") == "imap" or ctype == "imap":
            results = await asyncio.to_thread(
                _imap_search_sync, creds["host"], creds.get("port", 993),
                creds["email"], creds["password"], query, maxn,
            )
        else:
            return []  # unknown connector type
        await _mark_account(account_id, status="active", error=None, synced=True)
        for r in results:
            r["account"] = label
        return results
    except PermissionError as exc:
        await _mark_account(account_id, status="token_expired", error=str(exc))
        return []
    except Exception as exc:  # noqa: BLE001
        logger.warning("Connector search failed for %s: %s", account_id, exc)
        await _mark_account(account_id, status="error", error=str(exc))
        return []


async def search_emails(user_id: str, query: str, max_results: int = 5) -> dict:
    """Search across all active accounts in parallel. Used by Doka's kdoc_search_emails."""
    rows = await _load_full(user_id)
    if not rows:
        return {"count": 0, "results": [], "accounts": 0,
                "note": "Es sind keine E-Mail-Konten verbunden."}
    per = max(1, min(max_results, 10))
    batches = await asyncio.gather(*[_search_one(r, query, per) for r in rows])
    results = [item for batch in batches for item in batch][: max_results * 2]
    return {"count": len(results), "results": results, "accounts": len(rows)}


async def sync_account(user_id: str, account_id: int) -> dict:
    """Lightweight connectivity check: run an empty search to refresh status."""
    rows = await _load_full(user_id, account_id)
    if not rows:
        return {"ok": False, "error": "not_found"}
    await _search_one(rows[0], "", 1)
    fresh = await _load_full(user_id, account_id)
    return {"ok": True, "account": _public_account(fresh[0]) if fresh else None}
