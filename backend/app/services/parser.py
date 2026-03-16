from pathlib import Path

from app.config import settings
from app.services.models import ParsedFile
from app.services.parsers.python_parser import parse_python
from app.services.parsers.js_ts_parser import parse_js_ts
from app.services.parsers.java_parser import parse_java
from app.services.plugin_registry import registry

# Register built-in parsers in the plugin registry
registry.register_function("python", [".py"], parse_python)
registry.register_function("javascript", [".js", ".jsx"], parse_js_ts)
registry.register_function("typescript", [".ts", ".tsx"], parse_js_ts)
registry.register_function("java", [".java"], parse_java)


def parse_project(root: Path) -> list[ParsedFile]:
    parsed_files: list[ParsedFile] = []
    file_count = 0

    # Combine configured extensions with any plugin-provided ones
    allowed = settings.allowed_extensions | registry.supported_extensions

    for filepath in sorted(root.rglob("*")):
        if not filepath.is_file():
            continue

        # Skip excluded directories
        parts = filepath.relative_to(root).parts
        if any(part in settings.skip_dirs for part in parts):
            continue

        ext = filepath.suffix
        if ext not in allowed:
            continue

        file_count += 1
        if file_count > settings.max_file_count:
            break

        result = registry.get_parser(ext)
        if not result:
            continue
        language, parse_fn = result

        try:
            source = filepath.read_text(encoding="utf-8", errors="ignore")
            rel_path = str(filepath.relative_to(root)).replace("\\", "/")
            parsed = parse_fn(source, rel_path, language)
            parsed_files.append(parsed)
        except Exception:
            continue

    return parsed_files
