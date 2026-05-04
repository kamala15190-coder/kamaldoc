"""Mistral AI client — text generation + OCR. Hard timeouts, JSON-extraction helpers."""
from __future__ import annotations

import json
import logging
import re
from typing import Any

import httpx

from kdoc.settings import settings

logger = logging.getLogger(__name__)

API_BASE = "https://api.mistral.ai/v1"


class MistralError(RuntimeError):
    pass


class MistralTimeout(MistralError):
    pass


class MistralRateLimited(MistralError):
    pass


def _headers() -> dict[str, str]:
    if not settings.mistral_api_key:
        raise MistralError("MISTRAL_API_KEY not configured")
    return {
        "Authorization": f"Bearer {settings.mistral_api_key}",
        "Content-Type": "application/json",
    }


async def chat(
    messages: list[dict[str, Any]],
    *,
    model: str | None = None,
    temperature: float = 0.2,
    max_tokens: int = 2000,
    response_format: dict[str, Any] | None = None,
) -> str:
    """Send a chat completion. Returns the assistant's text content."""
    payload: dict[str, Any] = {
        "model": model or settings.mistral_text_model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    if response_format:
        payload["response_format"] = response_format

    timeout = httpx.Timeout(settings.mistral_timeout_seconds, connect=5.0)
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            r = await client.post(f"{API_BASE}/chat/completions", json=payload, headers=_headers())
    except httpx.TimeoutException as e:
        raise MistralTimeout("Mistral request timed out") from e

    if r.status_code == 429:
        raise MistralRateLimited("Mistral rate limit hit")
    if r.status_code >= 400:
        raise MistralError(f"Mistral error {r.status_code}: {r.text[:300]}")

    data = r.json()
    return data["choices"][0]["message"]["content"]


async def ocr_image(image_b64: str) -> str:
    """Mistral-OCR: extract text from a base64-encoded image."""
    payload = {
        "model": settings.mistral_ocr_model,
        "document": {"type": "image_base64", "image_base64": image_b64},
    }
    timeout = httpx.Timeout(settings.mistral_timeout_seconds * 2, connect=5.0)
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            r = await client.post(f"{API_BASE}/ocr", json=payload, headers=_headers())
    except httpx.TimeoutException as e:
        raise MistralTimeout("OCR request timed out") from e

    if r.status_code >= 400:
        raise MistralError(f"OCR error {r.status_code}: {r.text[:300]}")
    data = r.json()
    return data.get("text") or data.get("content") or ""


def extract_json(raw: str) -> dict[str, Any]:
    """Robust JSON extraction from LLM output (handles markdown fences, trailing commas)."""
    text = raw.strip()
    # Strip markdown fences
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    # Find outermost {...}
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        text = match.group(0)
    # Fix trailing commas
    text = re.sub(r",(\s*[}\]])", r"\1", text)
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        logger.warning("JSON extraction failed: %s — raw: %s", e, raw[:200])
        return {}
