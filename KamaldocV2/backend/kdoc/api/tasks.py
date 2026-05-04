"""Tasks API."""
from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import asc, select
from sqlalchemy.ext.asyncio import AsyncSession

from kdoc.auth.jwks import get_current_user
from kdoc.db.base import new_id
from kdoc.db.models import Task
from kdoc.db.session import get_db

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


class TaskOut(BaseModel):
    id: str
    title: str
    description: str | None = None
    deadline: datetime | None = None
    notify_at: datetime | None = None
    notification_lead_days: int | None = None
    done: bool = False
    source: str = "manual"
    document_id: str | None = None


class TaskCreate(BaseModel):
    title: str
    description: str | None = None
    deadline: datetime | None = None
    notification_lead_days: int | None = None
    document_id: str | None = None


class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    deadline: datetime | None = None
    notification_lead_days: int | None = None
    done: bool | None = None


@router.get("", response_model=list[TaskOut])
async def list_tasks(
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    filter: str = "open",
):
    stmt = select(Task).where(Task.user_id == user_id)
    if filter == "open":
        stmt = stmt.where(Task.done == False)  # noqa: E712
    elif filter == "done":
        stmt = stmt.where(Task.done == True)  # noqa: E712
    stmt = stmt.order_by(asc(Task.deadline))
    result = await db.execute(stmt)
    return [TaskOut.model_validate(t, from_attributes=True) for t in result.scalars().all()]


@router.post("", response_model=TaskOut)
async def create_task(
    payload: TaskCreate,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    t = Task(
        id=new_id(),
        user_id=user_id,
        title=payload.title,
        description=payload.description,
        deadline=payload.deadline,
        notification_lead_days=payload.notification_lead_days,
        document_id=payload.document_id,
        source="manual",
    )
    db.add(t)
    await db.commit()
    return TaskOut.model_validate(t, from_attributes=True)


@router.patch("/{task_id}", response_model=TaskOut)
async def update_task(
    task_id: str,
    payload: TaskUpdate,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    t = await db.get(Task, task_id)
    if not t or t.user_id != user_id:
        raise HTTPException(404, "Not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(t, k, v)
    if payload.done is True and not t.done_at:
        t.done_at = datetime.utcnow()
    await db.commit()
    return TaskOut.model_validate(t, from_attributes=True)


@router.delete("/{task_id}")
async def delete_task(
    task_id: str,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    t = await db.get(Task, task_id)
    if not t or t.user_id != user_id:
        raise HTTPException(404, "Not found")
    await db.delete(t)
    await db.commit()
    return {"ok": True}
