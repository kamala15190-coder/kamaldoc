"""Consolidated SQLAlchemy models for kdoc V2.

Notes:
- We use String for IDs to keep parity between SQLite (no native UUID) and Postgres.
- JSON columns use SQLAlchemy's generic JSON which maps to TEXT on SQLite and JSONB on Postgres.
"""
from __future__ import annotations

from datetime import date, datetime
from typing import Any

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    LargeBinary,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from kdoc.db.base import Base, IdMixin, TimestampMixin


# ---------- Profile & Subscription ----------

class Profile(Base, TimestampMixin):
    __tablename__ = "profiles"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)  # = supabase auth.users.id
    email: Mapped[str | None] = mapped_column(String(255))
    vorname: Mapped[str | None] = mapped_column(String(100))
    nachname: Mapped[str | None] = mapped_column(String(100))
    adresse: Mapped[str | None] = mapped_column(String(255))
    plz: Mapped[str | None] = mapped_column(String(20))
    ort: Mapped[str | None] = mapped_column(String(100))
    land: Mapped[str] = mapped_column(String(2), default="AT")
    telefon: Mapped[str | None] = mapped_column(String(50))
    app_locale: Mapped[str] = mapped_column(String(8), default="de")
    theme: Mapped[str] = mapped_column(String(20), default="onyx")


class Subscription(Base, TimestampMixin):
    __tablename__ = "subscriptions"
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("profiles.id"), primary_key=True)
    plan: Mapped[str] = mapped_column(String(20), default="free")  # free | basic | pro
    stripe_customer_id: Mapped[str | None] = mapped_column(String(100))
    stripe_subscription_id: Mapped[str | None] = mapped_column(String(100))
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    pending_plan: Mapped[str | None] = mapped_column(String(20))


class UsageCounter(Base, TimestampMixin):
    __tablename__ = "usage_counters"
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("profiles.id"), primary_key=True)
    documents_total: Mapped[int] = mapped_column(Integer, default=0)
    documents_month: Mapped[int] = mapped_column(Integer, default=0)
    ki_analyses_month: Mapped[int] = mapped_column(Integer, default=0)
    translations_month: Mapped[int] = mapped_column(Integer, default=0)
    befund_month: Mapped[int] = mapped_column(Integer, default=0)
    rechtshilfe_month: Mapped[int] = mapped_column(Integer, default=0)
    phishing_month: Mapped[int] = mapped_column(Integer, default=0)
    doka_messages_month: Mapped[int] = mapped_column(Integer, default=0)
    last_reset: Mapped[date | None] = mapped_column(Date)
    registration_date: Mapped[date | None] = mapped_column(Date)


# ---------- Documents ----------

class Document(Base, IdMixin, TimestampMixin):
    __tablename__ = "documents"
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("profiles.id"), nullable=False, index=True)
    source: Mapped[str] = mapped_column(String(20), default="upload")  # camera|upload|email_attach|imap_fetch
    original_filename: Mapped[str] = mapped_column(String(255))
    storage_key: Mapped[str] = mapped_column(String(500))
    thumbnail_key: Mapped[str | None] = mapped_column(String(500))
    mime_type: Mapped[str] = mapped_column(String(80))
    size_bytes: Mapped[int] = mapped_column(Integer, default=0)
    page_count: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[str] = mapped_column(String(20), default="queued", index=True)  # queued|analyzing|ready|failed
    error_message: Mapped[str | None] = mapped_column(Text)
    detected_language: Mapped[str | None] = mapped_column(String(8))
    is_encrypted: Mapped[bool] = mapped_column(Boolean, default=False)

    analysis: Mapped["DocAnalysis | None"] = relationship(
        "DocAnalysis", uselist=False, back_populates="document", cascade="all, delete-orphan"
    )


class DocAnalysis(Base, TimestampMixin):
    __tablename__ = "doc_analysis"
    document_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("documents.id", ondelete="CASCADE"), primary_key=True
    )
    category: Mapped[str | None] = mapped_column(String(40))
    sender: Mapped[str | None] = mapped_column(String(255))
    recipient: Mapped[str | None] = mapped_column(String(255))
    document_date: Mapped[date | None] = mapped_column(Date)
    amount: Mapped[float | None] = mapped_column(Float)
    currency: Mapped[str | None] = mapped_column(String(8))
    due_date: Mapped[date | None] = mapped_column(Date)
    iban: Mapped[str | None] = mapped_column(String(40))
    has_action: Mapped[bool] = mapped_column(Boolean, default=False)
    action_summary: Mapped[str | None] = mapped_column(Text)
    ai_summary: Mapped[str | None] = mapped_column(Text)
    full_text: Mapped[str | None] = mapped_column(Text)
    contact_email: Mapped[str | None] = mapped_column(String(255))
    contact_phone: Mapped[str | None] = mapped_column(String(50))
    expense_category: Mapped[str | None] = mapped_column(String(80))
    raw_json: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    analyzed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=func.now())

    document: Mapped[Document] = relationship("Document", back_populates="analysis")


# ---------- Tasks ----------

class Task(Base, IdMixin, TimestampMixin):
    __tablename__ = "tasks"
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("profiles.id"), nullable=False, index=True)
    document_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("documents.id", ondelete="SET NULL"))
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    deadline: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    notify_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    notification_lead_days: Mapped[int | None] = mapped_column(Integer)
    done: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    done_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    source: Mapped[str] = mapped_column(String(20), default="manual")  # extracted | manual | recurring


# ---------- Tool outputs ----------

class Reply(Base, IdMixin, TimestampMixin):
    __tablename__ = "replies"
    document_id: Mapped[str] = mapped_column(String(36), ForeignKey("documents.id", ondelete="CASCADE"))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("profiles.id"))
    topic_keywords: Mapped[dict[str, Any] | None] = mapped_column(JSON)  # list as JSON
    user_instruction: Mapped[str | None] = mapped_column(Text)
    body: Mapped[str] = mapped_column(Text)
    tone: Mapped[str] = mapped_column(String(20), default="formal")
    language: Mapped[str] = mapped_column(String(8), default="de")


class Translation(Base, IdMixin, TimestampMixin):
    __tablename__ = "translations"
    document_id: Mapped[str] = mapped_column(String(36), ForeignKey("documents.id", ondelete="CASCADE"))
    source_language: Mapped[str] = mapped_column(String(8))
    target_language: Mapped[str] = mapped_column(String(8))
    translated_text: Mapped[str] = mapped_column(Text)
    __table_args__ = (UniqueConstraint("document_id", "target_language"),)


class BefundSimplification(Base, IdMixin, TimestampMixin):
    __tablename__ = "befund_simplifications"
    document_id: Mapped[str] = mapped_column(String(36), ForeignKey("documents.id", ondelete="CASCADE"))
    language: Mapped[str] = mapped_column(String(8), default="de")
    what_was_examined: Mapped[str | None] = mapped_column(Text)
    what_was_found: Mapped[str | None] = mapped_column(Text)
    what_it_means: Mapped[str | None] = mapped_column(Text)
    raw_text: Mapped[str | None] = mapped_column(Text)
    __table_args__ = (UniqueConstraint("document_id", "language"),)


class RechtshilfeResult(Base, IdMixin, TimestampMixin):
    __tablename__ = "rechtshilfe_results"
    document_id: Mapped[str] = mapped_column(String(36), ForeignKey("documents.id", ondelete="CASCADE"))
    jurisdiction: Mapped[str] = mapped_column(String(2))  # AT|DE|CH
    language: Mapped[str] = mapped_column(String(8), default="de")
    conformity_score: Mapped[int] = mapped_column(Integer, default=0)
    conformity_label: Mapped[str | None] = mapped_column(String(80))
    issues: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    contestable: Mapped[bool] = mapped_column(Boolean, default=False)
    draft_objection: Mapped[str | None] = mapped_column(Text)


class PhishingCheck(Base, IdMixin, TimestampMixin):
    __tablename__ = "phishing_checks"
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("profiles.id"), index=True)
    document_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("documents.id", ondelete="CASCADE")
    )
    raw_storage_key: Mapped[str | None] = mapped_column(String(500))
    risk_score: Mapped[int] = mapped_column(Integer, default=50)  # 0=phishing, 100=safe
    verdict: Mapped[str] = mapped_column(String(40))
    reasoning: Mapped[dict[str, Any] | None] = mapped_column(JSON)


# ---------- Connectors (Multi-Account via MCP) ----------

class ConnectorAccount(Base, IdMixin, TimestampMixin):
    __tablename__ = "connector_accounts"
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("profiles.id"), nullable=False, index=True)
    connector_type: Mapped[str] = mapped_column(String(40), nullable=False)  # gmail | outlook | imap | ...
    display_name: Mapped[str] = mapped_column(String(80))
    remote_account_id: Mapped[str] = mapped_column(String(255))  # email address
    status: Mapped[str] = mapped_column(String(20), default="active")
    encrypted_credentials: Mapped[bytes | None] = mapped_column(LargeBinary)
    capabilities: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    last_sync_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_error: Mapped[str | None] = mapped_column(Text)

    __table_args__ = (
        UniqueConstraint("user_id", "connector_type", "remote_account_id", name="uq_user_connector_remote"),
    )


# ---------- Doka KI-Chat ----------

class DokaConversation(Base, IdMixin, TimestampMixin):
    __tablename__ = "doka_conversations"
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("profiles.id"), nullable=False, index=True)
    title: Mapped[str | None] = mapped_column(String(255))


class DokaMessage(Base, IdMixin, TimestampMixin):
    __tablename__ = "doka_messages"
    conversation_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("doka_conversations.id", ondelete="CASCADE"), index=True
    )
    role: Mapped[str] = mapped_column(String(20))  # user | assistant | tool
    content: Mapped[str] = mapped_column(Text)
    attachments: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    tool_calls: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    tokens_in: Mapped[int] = mapped_column(Integer, default=0)
    tokens_out: Mapped[int] = mapped_column(Integer, default=0)


# ---------- Push & Devices ----------

class PushDevice(Base, IdMixin, TimestampMixin):
    __tablename__ = "push_devices"
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("profiles.id"), index=True)
    fcm_token: Mapped[str] = mapped_column(String(500), unique=True)
    platform: Mapped[str] = mapped_column(String(20))  # ios | android | web
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class ScheduledPush(Base, IdMixin, TimestampMixin):
    __tablename__ = "scheduled_pushes"
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("profiles.id"), index=True)
    task_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("tasks.id", ondelete="SET NULL"))
    title: Mapped[str] = mapped_column(String(255))
    body: Mapped[str | None] = mapped_column(Text)
    fire_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    fired_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(20), default="scheduled")


# ---------- Admin & Audit ----------

class Admin(Base, TimestampMixin):
    __tablename__ = "admins"
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("profiles.id"), primary_key=True)


class FeatureFlag(Base, TimestampMixin):
    __tablename__ = "feature_flags"
    key: Mapped[str] = mapped_column(String(80), primary_key=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=False)


class AuditLog(Base, IdMixin):
    __tablename__ = "audit_log"
    user_id: Mapped[str | None] = mapped_column(String(36), index=True)
    actor_admin_id: Mapped[str | None] = mapped_column(String(36))
    action: Mapped[str] = mapped_column(String(80))
    meta: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    ip: Mapped[str | None] = mapped_column(String(45))
    user_agent: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now())


class StripeEvent(Base):
    __tablename__ = "processed_stripe_events"
    event_id: Mapped[str] = mapped_column(String(100), primary_key=True)
    processed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now())
