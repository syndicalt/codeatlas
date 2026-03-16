"""Base class for language parser plugins."""
from __future__ import annotations
from abc import ABC, abstractmethod
from app.services.models import ParsedFile


class LanguageParserPlugin(ABC):
    """Abstract base for language parser plugins."""
    name: str = ""
    extensions: list[str] = []

    @abstractmethod
    def parse(self, source: str, rel_path: str, language: str) -> ParsedFile:
        ...
