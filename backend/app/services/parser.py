from pathlib import Path

from app.config import settings
from app.services.models import ParsedFile
from app.services.parsers.python_parser import parse_python
from app.services.parsers.js_ts_parser import parse_js_ts


LANGUAGE_MAP = {
    ".py": "python",
    ".js": "javascript",
    ".jsx": "javascript",
    ".ts": "typescript",
    ".tsx": "typescript",
}

PARSER_MAP = {
    "python": parse_python,
    "javascript": parse_js_ts,
    "typescript": parse_js_ts,
}


def parse_project(root: Path) -> list[ParsedFile]:
    parsed_files: list[ParsedFile] = []
    file_count = 0

    for filepath in sorted(root.rglob("*")):
        if not filepath.is_file():
            continue

        # Skip excluded directories
        parts = filepath.relative_to(root).parts
        if any(part in settings.skip_dirs for part in parts):
            continue

        ext = filepath.suffix
        if ext not in settings.allowed_extensions:
            continue

        file_count += 1
        if file_count > settings.max_file_count:
            break

        language = LANGUAGE_MAP.get(ext)
        if not language:
            continue

        parse_fn = PARSER_MAP.get(language)
        if not parse_fn:
            continue

        try:
            source = filepath.read_text(encoding="utf-8", errors="ignore")
            rel_path = str(filepath.relative_to(root)).replace("\\", "/")
            parsed = parse_fn(source, rel_path, language)
            parsed_files.append(parsed)
        except Exception:
            continue

    return parsed_files
