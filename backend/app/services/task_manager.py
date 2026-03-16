from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum


class TaskStatus(str, Enum):
    queued = "queued"
    processing = "processing"
    ready = "ready"
    error = "error"


@dataclass
class TaskInfo:
    project_id: str
    status: TaskStatus = TaskStatus.queued
    progress: int = 0
    error_message: str = ""


# In-memory task store
task_store: dict[str, TaskInfo] = {}


def create_task(project_id: str) -> TaskInfo:
    task = TaskInfo(project_id=project_id)
    task_store[project_id] = task
    return task


def update_task(project_id: str, status: TaskStatus,
                progress: int = 0, error_message: str = ""):
    task = task_store.get(project_id)
    if task:
        task.status = status
        task.progress = progress
        task.error_message = error_message


def get_task(project_id: str) -> TaskInfo | None:
    return task_store.get(project_id)
