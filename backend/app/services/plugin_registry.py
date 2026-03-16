"""Plugin registry for language parser discovery and management."""
from __future__ import annotations

import importlib.util
import inspect
import sys
from pathlib import Path
from typing import Callable

from app.services.models import ParsedFile
from app.services.parsers.base import LanguageParserPlugin

ParseFn = Callable[[str, str, str], ParsedFile]


class ParserRegistry:
    """Registry that maps file extensions to parser functions or plugins."""

    def __init__(self) -> None:
        self._parsers: dict[str, tuple[str, ParseFn]] = {}

    # ------------------------------------------------------------------
    # Registration helpers
    # ------------------------------------------------------------------

    def register_function(
        self, name: str, extensions: list[str], parse_fn: ParseFn
    ) -> None:
        """Register a plain function-based parser for the given extensions."""
        for ext in extensions:
            self._parsers[ext] = (name, parse_fn)

    def register_plugin(self, plugin: LanguageParserPlugin) -> None:
        """Register a class-based parser plugin."""
        for ext in plugin.extensions:
            self._parsers[ext] = (plugin.name, plugin.parse)

    # ------------------------------------------------------------------
    # Dynamic discovery
    # ------------------------------------------------------------------

    def discover_plugins(self, directory: Path) -> None:
        """Load .py files from *directory* and register any LanguageParserPlugin subclasses."""
        if not directory.is_dir():
            return

        for py_file in sorted(directory.glob("*.py")):
            if py_file.name.startswith("_"):
                continue
            module_name = f"codeatlas_plugin_{py_file.stem}"
            try:
                spec = importlib.util.spec_from_file_location(module_name, py_file)
                if spec is None or spec.loader is None:
                    continue
                module = importlib.util.module_from_spec(spec)
                sys.modules[module_name] = module
                spec.loader.exec_module(module)

                for _attr_name, obj in inspect.getmembers(module, inspect.isclass):
                    if (
                        issubclass(obj, LanguageParserPlugin)
                        and obj is not LanguageParserPlugin
                    ):
                        instance = obj()
                        self.register_plugin(instance)
            except Exception:
                # Skip plugins that fail to load
                continue

    # ------------------------------------------------------------------
    # Lookup
    # ------------------------------------------------------------------

    def get_parser(self, extension: str) -> tuple[str, ParseFn] | None:
        """Return (language, parse_fn) for the given file extension, or None."""
        return self._parsers.get(extension)

    @property
    def supported_extensions(self) -> set[str]:
        """Return the set of all registered file extensions."""
        return set(self._parsers.keys())


# Module-level singleton
registry = ParserRegistry()
