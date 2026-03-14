"""
KamalDoc Subscription System
- Plan management (free/basic/pro)
- Usage tracking & enforcement
- Stripe integration
"""

import logging
import os
from datetime import datetime, timedelta
from typing import Optional

import stripe
from fastapi import HTTPException, Request
from database import get_db

logger = logging.getLogger(__name__)

# --- Stripe Config ---
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
STRIPE_BASIC_PRICE_ID = os.getenv("STRIPE_BASIC_PRICE_ID", "price_PLACEHOLDER")
STRIPE_PRO_PRICE_ID = os.getenv("STRIPE_PRO_PRICE_ID", "price_PLACEHOLDER")
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://kamaldoc-flax.vercel.app")

if STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY

# --- Plan Limits ---
PLAN_LIMITS = {
    "free": {
        "documents_total": 10,
        "ki_analyses_total": 10,
        "behoerden_total": 2,
        "befund_total": 2,
        "expenses": False,
        "push_notifications": False,
        "reminder_options": [],
    },
    "basic": {
        "documents_total": 50,
        "ki_analyses_total": None,  # unlimited
        "behoerden_month": 10,
        "befund_month": 10,
        "expenses": True,
        "push_notifications": True,
        "reminder_options": [3],
    },
    "pro": {
        "documents_total": None,  # unlimited
        "ki_analyses_total": None,
        "behoerden_month": None,
        "befund_month": None,
        "expenses": True,
        "push_notifications": True,
        "reminder_options": [1, 3, 7],
    },
}


# --- DB Helpers ---

async def ensure_subscription(user_id: str):
    """Ensure user has a subscription row. Creates 'free' if missing."""
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT plan FROM subscriptions WHERE user_id = ?", (user_id,)
        )
        row = await cursor.fetchone()
        if not row:
            await db.execute(
                "INSERT INTO subscriptions (user_id, plan) VALUES (?, 'free')",
                (user_id,),
            )
            await db.commit()
    finally:
        await db.close()


async def ensure_usage(user_id: str):
    """Ensure user has a usage_counters row."""
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT user_id FROM usage_counters WHERE user_id = ?", (user_id,)
        )
        row = await cursor.fetchone()
        if not row:
            now = datetime.now().strftime("%Y-%m-%d")
            await db.execute(
                "INSERT INTO usage_counters (user_id, last_reset) VALUES (?, ?)",
                (user_id, now),
            )
            await db.commit()
    finally:
        await db.close()


async def get_user_plan(user_id: str) -> str:
    """Get user's current plan, checking expiration."""
    await ensure_subscription(user_id)
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT plan, expires_at, cancelled_at, pending_plan FROM subscriptions WHERE user_id = ?",
            (user_id,),
        )
        row = await cursor.fetchone()
        if not row:
            return "free"

        plan = row["plan"]
        expires_at = row["expires_at"]

        # Check if paid plan has expired
        if plan in ("basic", "pro") and expires_at:
            try:
                exp_date = datetime.fromisoformat(expires_at)
                if exp_date < datetime.now():
                    # Check for pending downgrade
                    pending = row["pending_plan"] if "pending_plan" in row.keys() else None
                    new_plan = pending or "free"
                    await db.execute(
                        "UPDATE subscriptions SET plan = ?, pending_plan = NULL, updated_at = ? WHERE user_id = ?",
                        (new_plan, datetime.now().isoformat(), user_id),
                    )
                    await db.commit()
                    logger.info(f"User {user_id} downgraded to {new_plan} (expired {expires_at})")
                    return new_plan
            except (ValueError, TypeError):
                pass

        return plan
    finally:
        await db.close()


async def get_usage(user_id: str) -> dict:
    """Get user's usage counters, auto-resetting monthly counters if needed."""
    await ensure_usage(user_id)
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT * FROM usage_counters WHERE user_id = ?", (user_id,)
        )
        row = await cursor.fetchone()
        usage = dict(row)

        # Auto-reset monthly counters on 1st of month
        now = datetime.now()
        last_reset = usage.get("last_reset") or ""
        try:
            last_date = datetime.strptime(last_reset, "%Y-%m-%d")
            if last_date.month != now.month or last_date.year != now.year:
                await db.execute(
                    """UPDATE usage_counters
                       SET behoerden_month = 0, befund_month = 0, last_reset = ?
                       WHERE user_id = ?""",
                    (now.strftime("%Y-%m-%d"), user_id),
                )
                await db.commit()
                usage["behoerden_month"] = 0
                usage["befund_month"] = 0
                usage["last_reset"] = now.strftime("%Y-%m-%d")
                logger.info(f"Monthly counters reset for user {user_id}")
        except (ValueError, TypeError):
            pass

        return usage
    finally:
        await db.close()


async def increment_usage(user_id: str, field: str, amount: int = 1):
    """Increment a usage counter."""
    await ensure_usage(user_id)
    db = await get_db()
    try:
        await db.execute(
            f"UPDATE usage_counters SET {field} = {field} + ? WHERE user_id = ?",
            (amount, user_id),
        )
        await db.commit()
    finally:
        await db.close()


# --- Plan Enforcement ---

async def check_upload_limit(user_id: str):
    """Check if user can upload a document."""
    plan = await get_user_plan(user_id)
    limits = PLAN_LIMITS[plan]
    max_docs = limits["documents_total"]
    if max_docs is None:
        return  # unlimited

    usage = await get_usage(user_id)
    if usage["documents_total"] >= max_docs:
        raise HTTPException(
            status_code=403,
            detail={
                "code": "UPLOAD_LIMIT",
                "message": f"Dokumenten-Limit erreicht ({max_docs}). Bitte upgraden.",
                "plan": plan,
                "limit": max_docs,
                "used": usage["documents_total"],
            },
        )


async def check_analysis_limit(user_id: str):
    """Check if user can run KI analysis."""
    plan = await get_user_plan(user_id)
    limits = PLAN_LIMITS[plan]
    max_analyses = limits["ki_analyses_total"]
    if max_analyses is None:
        return

    usage = await get_usage(user_id)
    if usage["ki_analyses_total"] >= max_analyses:
        raise HTTPException(
            status_code=403,
            detail={
                "code": "ANALYSIS_LIMIT",
                "message": f"KI-Analyse-Limit erreicht ({max_analyses}). Bitte upgraden.",
                "plan": plan,
                "limit": max_analyses,
                "used": usage["ki_analyses_total"],
            },
        )


async def check_behoerden_limit(user_id: str):
    """Check Behörden-Assistent limit."""
    plan = await get_user_plan(user_id)
    limits = PLAN_LIMITS[plan]
    usage = await get_usage(user_id)

    if plan == "free":
        max_total = limits.get("behoerden_total", 2)
        # For free plan, we track total via behoerden_month (reused as total)
        if usage["behoerden_month"] >= max_total:
            raise HTTPException(
                status_code=403,
                detail={
                    "code": "BEHOERDEN_LIMIT",
                    "message": f"Behörden-Assistent Limit erreicht ({max_total} gesamt). Bitte upgraden.",
                    "plan": plan,
                    "limit": max_total,
                    "used": usage["behoerden_month"],
                },
            )
    elif plan == "basic":
        max_month = limits.get("behoerden_month", 10)
        if max_month and usage["behoerden_month"] >= max_month:
            raise HTTPException(
                status_code=403,
                detail={
                    "code": "BEHOERDEN_LIMIT",
                    "message": f"Behörden-Assistent Monatslimit erreicht ({max_month}/Monat).",
                    "plan": plan,
                    "limit": max_month,
                    "used": usage["behoerden_month"],
                },
            )
    # Pro: unlimited


async def check_befund_limit(user_id: str):
    """Check Befund-Assistent limit."""
    plan = await get_user_plan(user_id)
    limits = PLAN_LIMITS[plan]
    usage = await get_usage(user_id)

    if plan == "free":
        max_total = limits.get("befund_total", 2)
        if usage["befund_month"] >= max_total:
            raise HTTPException(
                status_code=403,
                detail={
                    "code": "BEFUND_LIMIT",
                    "message": f"Befund-Assistent Limit erreicht ({max_total} gesamt). Bitte upgraden.",
                    "plan": plan,
                    "limit": max_total,
                    "used": usage["befund_month"],
                },
            )
    elif plan == "basic":
        max_month = limits.get("befund_month", 10)
        if max_month and usage["befund_month"] >= max_month:
            raise HTTPException(
                status_code=403,
                detail={
                    "code": "BEFUND_LIMIT",
                    "message": f"Befund-Assistent Monatslimit erreicht ({max_month}/Monat).",
                    "plan": plan,
                    "limit": max_month,
                    "used": usage["befund_month"],
                },
            )


async def check_expenses_access(user_id: str):
    """Check if user has access to expenses dashboard."""
    plan = await get_user_plan(user_id)
    if not PLAN_LIMITS[plan]["expenses"]:
        raise HTTPException(
            status_code=403,
            detail={
                "code": "EXPENSES_LOCKED",
                "message": "Ausgaben-Dashboard ist ab Basic Plan verfügbar.",
                "plan": plan,
            },
        )


# --- Subscription Status ---

async def get_subscription_status(user_id: str) -> dict:
    """Get full subscription status for frontend."""
    await ensure_subscription(user_id)
    await ensure_usage(user_id)

    plan = await get_user_plan(user_id)
    usage = await get_usage(user_id)
    limits = PLAN_LIMITS[plan]

    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT * FROM subscriptions WHERE user_id = ?", (user_id,)
        )
        sub = dict(await cursor.fetchone())
    finally:
        await db.close()

    return {
        "plan": plan,
        "expires_at": sub.get("expires_at"),
        "cancelled_at": sub.get("cancelled_at"),
        "pending_plan": sub.get("pending_plan"),
        "started_at": sub.get("started_at"),
        "stripe_subscription_id": sub.get("stripe_subscription_id"),
        "limits": {
            "documents_total": limits["documents_total"],
            "ki_analyses_total": limits["ki_analyses_total"],
            "behoerden": limits.get("behoerden_total") if plan == "free" else limits.get("behoerden_month"),
            "befund": limits.get("befund_total") if plan == "free" else limits.get("befund_month"),
            "expenses": limits["expenses"],
            "push_notifications": limits["push_notifications"],
            "reminder_options": limits["reminder_options"],
        },
        "usage": {
            "documents_total": usage["documents_total"],
            "ki_analyses_total": usage["ki_analyses_total"],
            "behoerden_used": usage["behoerden_month"],
            "befund_used": usage["befund_month"],
        },
    }


# --- Downgrade ---

async def downgrade_subscription(user_id: str, target_plan: str) -> dict:
    """Schedule a downgrade to a lower plan at end of current period."""
    PLAN_ORDER = {"free": 0, "basic": 1, "pro": 2}
    current = await get_user_plan(user_id)

    if target_plan not in PLAN_ORDER:
        raise HTTPException(400, "Ungültiger Plan.")
    if PLAN_ORDER[target_plan] >= PLAN_ORDER[current]:
        raise HTTPException(400, "Downgrade ist nur auf einen niedrigeren Plan möglich.")

    db = await get_db()
    try:
        if target_plan == "free":
            # For downgrade to free: cancel Stripe subscription at period end
            cursor = await db.execute(
                "SELECT stripe_subscription_id, expires_at FROM subscriptions WHERE user_id = ?",
                (user_id,),
            )
            row = await cursor.fetchone()
            stripe_sub_id = row["stripe_subscription_id"] if row else None
            if stripe_sub_id and STRIPE_SECRET_KEY:
                try:
                    stripe.Subscription.modify(stripe_sub_id, cancel_at_period_end=True)
                except Exception as e:
                    logger.error(f"Stripe cancel for downgrade error: {e}")

        now = datetime.now().isoformat()
        await db.execute(
            "UPDATE subscriptions SET pending_plan = ?, updated_at = ? WHERE user_id = ?",
            (target_plan, now, user_id),
        )
        await db.commit()

        cursor = await db.execute(
            "SELECT expires_at FROM subscriptions WHERE user_id = ?", (user_id,)
        )
        row = await cursor.fetchone()
        expires_at = row["expires_at"] if row else None

        logger.info(f"Downgrade scheduled: user={user_id}, from={current}, to={target_plan}")
        return {
            "message": f"Downgrade auf {target_plan} geplant.",
            "pending_plan": target_plan,
            "expires_at": expires_at,
        }
    finally:
        await db.close()


# --- Reactivate ---

async def reactivate_subscription(user_id: str) -> dict:
    """Reactivate a cancelled subscription."""
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT plan, cancelled_at, stripe_subscription_id, expires_at FROM subscriptions WHERE user_id = ?",
            (user_id,),
        )
        row = await cursor.fetchone()
        if not row or row["plan"] == "free":
            raise HTTPException(400, "Kein aktives Abo vorhanden.")
        if not row["cancelled_at"]:
            raise HTTPException(400, "Abo ist nicht gekündigt.")

        stripe_sub_id = row["stripe_subscription_id"]
        # Reactivate in Stripe (undo cancel_at_period_end)
        if stripe_sub_id and STRIPE_SECRET_KEY:
            try:
                stripe.Subscription.modify(stripe_sub_id, cancel_at_period_end=False)
            except Exception as e:
                logger.error(f"Stripe reactivate error: {e}")

        now = datetime.now().isoformat()
        await db.execute(
            "UPDATE subscriptions SET cancelled_at = NULL, pending_plan = NULL, updated_at = ? WHERE user_id = ?",
            (now, user_id),
        )
        await db.commit()

        logger.info(f"Subscription reactivated: user={user_id}, plan={row['plan']}")
        return {
            "message": "Abo reaktiviert.",
            "plan": row["plan"],
            "expires_at": row["expires_at"],
        }
    finally:
        await db.close()


# --- Stripe Checkout ---

async def create_checkout_session(user_id: str, plan: str) -> dict:
    """Create Stripe Checkout Session for Basic or Pro plan."""
    if not STRIPE_SECRET_KEY or STRIPE_SECRET_KEY == "sk_test_PLACEHOLDER":
        raise HTTPException(400, "Stripe ist noch nicht konfiguriert.")

    if plan not in ("basic", "pro"):
        raise HTTPException(400, "Ungültiger Plan. Nur 'basic' oder 'pro' möglich.")

    price_id = STRIPE_BASIC_PRICE_ID if plan == "basic" else STRIPE_PRO_PRICE_ID

    # Get or create Stripe customer
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT stripe_customer_id FROM subscriptions WHERE user_id = ?",
            (user_id,),
        )
        row = await cursor.fetchone()
        customer_id = row["stripe_customer_id"] if row else None

        if not customer_id:
            customer = stripe.Customer.create(metadata={"user_id": user_id})
            customer_id = customer.id
            await db.execute(
                "UPDATE subscriptions SET stripe_customer_id = ? WHERE user_id = ?",
                (customer_id, user_id),
            )
            await db.commit()
    finally:
        await db.close()

    session = stripe.checkout.Session.create(
        customer=customer_id,
        payment_method_types=["card"],
        mode="subscription",
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=f"{FRONTEND_URL}/profil?checkout=success",
        cancel_url=f"{FRONTEND_URL}/pricing?checkout=cancel",
        metadata={"user_id": user_id, "plan": plan},
    )

    return {"checkout_url": session.url, "session_id": session.id}


async def cancel_subscription(user_id: str) -> dict:
    """Cancel subscription (stays active until expires_at)."""
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT stripe_subscription_id, plan, expires_at FROM subscriptions WHERE user_id = ?",
            (user_id,),
        )
        row = await cursor.fetchone()
        if not row or row["plan"] == "free":
            raise HTTPException(400, "Kein aktives Abo vorhanden.")

        stripe_sub_id = row["stripe_subscription_id"]

        # Cancel in Stripe (at period end)
        if stripe_sub_id and STRIPE_SECRET_KEY and STRIPE_SECRET_KEY != "sk_test_PLACEHOLDER":
            try:
                stripe.Subscription.modify(
                    stripe_sub_id, cancel_at_period_end=True
                )
            except Exception as e:
                logger.error(f"Stripe cancel error: {e}")

        now = datetime.now().isoformat()
        await db.execute(
            "UPDATE subscriptions SET cancelled_at = ?, updated_at = ? WHERE user_id = ?",
            (now, now, user_id),
        )
        await db.commit()

        return {
            "message": "Abo gekündigt. Bleibt aktiv bis zum Ende der Laufzeit.",
            "expires_at": row["expires_at"],
        }
    finally:
        await db.close()


# --- Stripe Webhook ---

async def handle_webhook(request: Request):
    """Process Stripe webhook events."""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    if not STRIPE_WEBHOOK_SECRET or STRIPE_WEBHOOK_SECRET == "whsec_PLACEHOLDER":
        logger.warning("Stripe webhook secret not configured")
        return {"status": "ignored"}

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, STRIPE_WEBHOOK_SECRET
        )
    except stripe.error.SignatureVerificationError:
        raise HTTPException(400, "Invalid signature")
    except Exception as e:
        raise HTTPException(400, f"Webhook error: {str(e)}")

    event_type = event["type"]
    data = event["data"]["object"]
    logger.info(f"Stripe webhook: {event_type}")

    if event_type == "checkout.session.completed":
        await _handle_checkout_completed(data)
    elif event_type == "invoice.payment_succeeded":
        await _handle_payment_succeeded(data)
    elif event_type == "invoice.payment_failed":
        await _handle_payment_failed(data)
    elif event_type == "customer.subscription.deleted":
        await _handle_subscription_deleted(data)

    return {"status": "ok"}


async def _handle_checkout_completed(session):
    """Activate plan after successful checkout."""
    user_id = session.get("metadata", {}).get("user_id")
    plan = session.get("metadata", {}).get("plan")
    stripe_sub_id = session.get("subscription")
    customer_id = session.get("customer")

    if not user_id or not plan:
        logger.error("Checkout completed but missing user_id/plan in metadata")
        return

    now = datetime.now()
    expires_at = (now + timedelta(days=30)).isoformat()

    db = await get_db()
    try:
        await db.execute(
            """UPDATE subscriptions SET
                plan = ?, stripe_subscription_id = ?, stripe_customer_id = ?,
                started_at = ?, expires_at = ?, cancelled_at = NULL, updated_at = ?
               WHERE user_id = ?""",
            (plan, stripe_sub_id, customer_id, now.isoformat(), expires_at, now.isoformat(), user_id),
        )
        await db.commit()
        logger.info(f"Plan activated: user={user_id}, plan={plan}, expires={expires_at}")
    finally:
        await db.close()


async def _handle_payment_succeeded(invoice):
    """Extend subscription on successful payment."""
    customer_id = invoice.get("customer")
    if not customer_id:
        return

    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT user_id, plan FROM subscriptions WHERE stripe_customer_id = ?",
            (customer_id,),
        )
        row = await cursor.fetchone()
        if not row:
            return

        now = datetime.now()
        expires_at = (now + timedelta(days=30)).isoformat()

        await db.execute(
            "UPDATE subscriptions SET expires_at = ?, cancelled_at = NULL, updated_at = ? WHERE user_id = ?",
            (expires_at, now.isoformat(), row["user_id"]),
        )
        await db.commit()
        logger.info(f"Payment succeeded, extended: user={row['user_id']}, expires={expires_at}")
    finally:
        await db.close()


async def _handle_payment_failed(invoice):
    """Log payment failure."""
    customer_id = invoice.get("customer")
    logger.warning(f"Payment failed for customer {customer_id}")


async def _handle_subscription_deleted(subscription):
    """Handle subscription deletion from Stripe."""
    customer_id = subscription.get("customer")
    if not customer_id:
        return

    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT user_id FROM subscriptions WHERE stripe_customer_id = ?",
            (customer_id,),
        )
        row = await cursor.fetchone()
        if row:
            now = datetime.now().isoformat()
            await db.execute(
                "UPDATE subscriptions SET plan = 'free', stripe_subscription_id = NULL, cancelled_at = ?, updated_at = ? WHERE user_id = ?",
                (now, now, row["user_id"]),
            )
            await db.commit()
            logger.info(f"Subscription deleted, downgraded: user={row['user_id']}")
    finally:
        await db.close()
