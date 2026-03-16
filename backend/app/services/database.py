"""SQLite database via aiosqlite for users, API keys, and atlas history."""

from __future__ import annotations

import aiosqlite

from app.config import settings

_db: aiosqlite.Connection | None = None


async def get_db() -> aiosqlite.Connection:
    global _db
    if _db is None:
        _db = await aiosqlite.connect(settings.database_path)
        _db.row_factory = aiosqlite.Row
        await _db.execute("PRAGMA journal_mode=WAL")
        await _db.execute("PRAGMA foreign_keys=ON")
    return _db


async def init_db() -> None:
    """Create tables if they don't exist."""
    db = await get_db()

    await db.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT NOT NULL,
            name TEXT NOT NULL DEFAULT '',
            avatar_url TEXT NOT NULL DEFAULT '',
            oauth_provider TEXT NOT NULL,
            oauth_provider_id TEXT NOT NULL,
            preferred_model TEXT NOT NULL DEFAULT '',
            preferred_provider TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE(oauth_provider, oauth_provider_id)
        )
    """)

    await db.execute("""
        CREATE TABLE IF NOT EXISTS api_keys (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            provider TEXT NOT NULL,
            encrypted_key TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE(user_id, provider)
        )
    """)

    await db.execute("""
        CREATE TABLE IF NOT EXISTS atlas_history (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            project_id TEXT NOT NULL,
            source_url TEXT NOT NULL DEFAULT '',
            name TEXT NOT NULL DEFAULT '',
            node_count INTEGER NOT NULL DEFAULT 0,
            edge_count INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
    """)

    await db.commit()


async def close_db() -> None:
    global _db
    if _db is not None:
        await _db.close()
        _db = None


# --- User CRUD ---

async def upsert_user(
    user_id: str,
    email: str,
    name: str,
    avatar_url: str,
    oauth_provider: str,
    oauth_provider_id: str,
) -> dict:
    """Insert or update a user. Returns the user row as a dict."""
    db = await get_db()
    await db.execute(
        """
        INSERT INTO users (id, email, name, avatar_url, oauth_provider, oauth_provider_id)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(oauth_provider, oauth_provider_id) DO UPDATE SET
            email = excluded.email,
            name = excluded.name,
            avatar_url = excluded.avatar_url,
            updated_at = datetime('now')
        """,
        (user_id, email, name, avatar_url, oauth_provider, oauth_provider_id),
    )
    await db.commit()
    return await get_user_by_oauth(oauth_provider, oauth_provider_id)


async def get_user_by_id(user_id: str) -> dict | None:
    db = await get_db()
    cursor = await db.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    row = await cursor.fetchone()
    return dict(row) if row else None


async def get_user_by_oauth(provider: str, provider_id: str) -> dict | None:
    db = await get_db()
    cursor = await db.execute(
        "SELECT * FROM users WHERE oauth_provider = ? AND oauth_provider_id = ?",
        (provider, provider_id),
    )
    row = await cursor.fetchone()
    return dict(row) if row else None


async def update_user_preferences(user_id: str, preferred_model: str, preferred_provider: str) -> None:
    db = await get_db()
    await db.execute(
        "UPDATE users SET preferred_model = ?, preferred_provider = ?, updated_at = datetime('now') WHERE id = ?",
        (preferred_model, preferred_provider, user_id),
    )
    await db.commit()


# --- API Key CRUD ---

async def set_api_key(key_id: str, user_id: str, provider: str, encrypted_key: str) -> None:
    db = await get_db()
    await db.execute(
        """
        INSERT INTO api_keys (id, user_id, provider, encrypted_key)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id, provider) DO UPDATE SET
            encrypted_key = excluded.encrypted_key,
            created_at = datetime('now')
        """,
        (key_id, user_id, provider, encrypted_key),
    )
    await db.commit()


async def get_api_keys(user_id: str) -> list[dict]:
    db = await get_db()
    cursor = await db.execute(
        "SELECT id, provider, created_at FROM api_keys WHERE user_id = ?",
        (user_id,),
    )
    rows = await cursor.fetchall()
    return [dict(r) for r in rows]


async def get_api_key_for_provider(user_id: str, provider: str) -> str | None:
    """Return the encrypted key for a specific provider, or None."""
    db = await get_db()
    cursor = await db.execute(
        "SELECT encrypted_key FROM api_keys WHERE user_id = ? AND provider = ?",
        (user_id, provider),
    )
    row = await cursor.fetchone()
    return row["encrypted_key"] if row else None


async def delete_api_key(user_id: str, provider: str) -> bool:
    db = await get_db()
    cursor = await db.execute(
        "DELETE FROM api_keys WHERE user_id = ? AND provider = ?",
        (user_id, provider),
    )
    await db.commit()
    return cursor.rowcount > 0


# --- Atlas History CRUD ---

async def add_atlas_history(
    entry_id: str,
    user_id: str,
    project_id: str,
    source_url: str = "",
    name: str = "",
    node_count: int = 0,
    edge_count: int = 0,
) -> None:
    db = await get_db()
    await db.execute(
        """
        INSERT INTO atlas_history (id, user_id, project_id, source_url, name, node_count, edge_count)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (entry_id, user_id, project_id, source_url, name, node_count, edge_count),
    )
    await db.commit()


async def get_atlas_history(user_id: str) -> list[dict]:
    db = await get_db()
    cursor = await db.execute(
        "SELECT * FROM atlas_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
        (user_id,),
    )
    rows = await cursor.fetchall()
    return [dict(r) for r in rows]


async def delete_atlas_history_entry(user_id: str, entry_id: str) -> bool:
    db = await get_db()
    cursor = await db.execute(
        "DELETE FROM atlas_history WHERE id = ? AND user_id = ?",
        (entry_id, user_id),
    )
    await db.commit()
    return cursor.rowcount > 0
