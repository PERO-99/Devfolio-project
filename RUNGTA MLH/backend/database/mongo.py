from __future__ import annotations

import os
from collections import Counter
from datetime import datetime, timedelta, timezone
from threading import Lock
from typing import Any

try:
    from pymongo import MongoClient
except Exception:  # pragma: no cover
    MongoClient = None  # type: ignore


class InMemoryStore:
    def __init__(self) -> None:
        self._lock = Lock()
        self._detections: list[dict[str, Any]] = []

    def save_detection(self, detection: dict[str, Any]) -> dict[str, Any]:
        with self._lock:
            timestamp = _parse_timestamp(detection.get('timestamp'))
            detection = {**detection, 'timestamp': timestamp.isoformat()}
            self._detections.insert(0, detection)
            self._cleanup_locked()
            return detection

    def get_recent(self, limit: int = 80) -> list[dict[str, Any]]:
        with self._lock:
            self._cleanup_locked()
            return list(self._detections[:limit])

    def get_stats(self) -> dict[str, int]:
        with self._lock:
            self._cleanup_locked()
            counts = Counter(str(item.get('status') or 'suspicious').lower() for item in self._detections)
            total = len(self._detections)
            safe = counts.get('safe', 0)
            suspicious = counts.get('suspicious', 0)
            danger = counts.get('danger', 0)
            return {'total': total, 'safe': safe, 'suspicious': suspicious, 'danger': danger}

    def _cleanup_locked(self) -> None:
        cutoff = datetime.now(timezone.utc) - timedelta(days=30)
        filtered: list[dict[str, Any]] = []
        for detection in self._detections:
            timestamp = _parse_timestamp(detection.get('timestamp'))
            if timestamp >= cutoff:
                filtered.append(detection)
        self._detections = filtered


class MongoStore:
    def __init__(self, client: Any, db_name: str) -> None:
        self.client = client
        self.db = client[db_name]
        self.detections = self.db['detections']
        self.stats = self.db['stats_cache']
        self._lock = Lock()
        self._ensure_indexes()

    def _ensure_indexes(self) -> None:
        try:
            self.detections.create_index('timestamp')
            self.detections.create_index('content_hash')
            self.detections.create_index('dedupe_key')
            self.stats.create_index('_id', unique=True)
        except Exception:
            pass

    def save_detection(self, detection: dict[str, Any]) -> dict[str, Any]:
        with self._lock:
            now = _parse_timestamp(detection.get('timestamp'))
            dedupe_key = detection.get('dedupe_key')
            cutoff = now - timedelta(seconds=int(os.getenv('DEDUPE_WINDOW_SECONDS', '30')))
            status_field = _normalize_status(detection.get('status'))

            try:
                if dedupe_key:
                    existing = self.detections.find_one(
                        {
                            'dedupe_key': dedupe_key,
                            'timestamp': {'$gte': cutoff},
                        },
                        sort=[('timestamp', -1)],
                    )
                    if existing:
                        return self._serialize(existing)

                record = {**detection, 'status': status_field, 'timestamp': now, '_created_at': datetime.now(timezone.utc)}
                self.detections.insert_one(record)

                self.stats.update_one(
                    {'_id': 'global'},
                    {
                        '$setOnInsert': {
                            'total': 0,
                            'safe': 0,
                            'suspicious': 0,
                            'danger': 0,
                        }
                    },
                    upsert=True,
                )
                self.stats.update_one(
                    {'_id': 'global'},
                    {
                        '$inc': {
                            'total': 1,
                            status_field: 1,
                        }
                    },
                    upsert=False,
                )
                return self._serialize(record)
            except Exception:
                # Never crash API flow because of DB write failures.
                fallback = {**detection, 'status': status_field, 'timestamp': now.isoformat()}
                return fallback

    def get_recent(self, limit: int = 80) -> list[dict[str, Any]]:
        try:
            cursor = self.detections.find().sort('timestamp', -1).limit(int(limit))
            return [self._serialize(item) for item in cursor]
        except Exception:
            return []

    def get_stats(self) -> dict[str, int]:
        try:
            doc = self.stats.find_one({'_id': 'global'}) or {}
            return {
                'total': int(doc.get('total') or 0),
                'safe': int(doc.get('safe') or 0),
                'suspicious': int(doc.get('suspicious') or 0),
                'danger': int(doc.get('danger') or 0),
            }
        except Exception:
            return {'total': 0, 'safe': 0, 'suspicious': 0, 'danger': 0}

    def _serialize(self, item: dict[str, Any]) -> dict[str, Any]:
        serialized = dict(item)
        if isinstance(serialized.get('timestamp'), datetime):
            serialized['timestamp'] = serialized['timestamp'].astimezone(timezone.utc).isoformat()
        if '_id' in serialized:
            serialized['id'] = str(serialized.pop('_id'))
        if isinstance(serialized.get('_created_at'), datetime):
            serialized['_created_at'] = serialized['_created_at'].astimezone(timezone.utc).isoformat()
        return serialized


_STORE: Any | None = None


def get_store() -> Any:
    global _STORE
    if _STORE is not None:
        return _STORE

    mongo_uri = os.getenv('MONGO_URI', 'mongodb://localhost:27017')
    db_name = os.getenv('MONGO_DB', 'veritas_x')

    if MongoClient is not None:
        try:
            client = MongoClient(mongo_uri, serverSelectionTimeoutMS=800)
            client.admin.command('ping')
            _STORE = MongoStore(client, db_name)
            return _STORE
        except Exception:
            pass

    _STORE = InMemoryStore()
    return _STORE


def _parse_timestamp(value: Any) -> datetime:
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)
    if isinstance(value, str) and value:
        try:
            parsed = datetime.fromisoformat(value.replace('Z', '+00:00'))
            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=timezone.utc)
            return parsed.astimezone(timezone.utc)
        except ValueError:
            pass
    return datetime.now(timezone.utc)


def _normalize_status(value: Any) -> str:
    status = str(value or 'suspicious').lower()
    if status not in {'safe', 'suspicious', 'danger'}:
        return 'suspicious'
    return status

