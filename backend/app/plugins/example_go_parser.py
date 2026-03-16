# """
# Example Go parser plugin for CodeAtlas.
#
# To enable this plugin:
#   1. Uncomment the code below.
#   2. Place this file in the configured plugin directory (default: backend/plugins/).
#   3. Restart the backend server.
#
# from app.services.parsers.base import LanguageParserPlugin
# from app.services.models import ParsedFile, FunctionDef, ImportDef
#
#
# class GoParserPlugin(LanguageParserPlugin):
#     name = "go"
#     extensions = [".go"]
#
#     def parse(self, source: str, rel_path: str, language: str) -> ParsedFile:
#         functions: list[FunctionDef] = []
#         imports: list[ImportDef] = []
#
#         for line_no, line in enumerate(source.splitlines(), start=1):
#             stripped = line.strip()
#
#             # Simple function detection
#             if stripped.startswith("func "):
#                 # Extract function name (very naive)
#                 rest = stripped[5:]
#                 paren = rest.find("(")
#                 if paren > 0:
#                     name = rest[:paren].strip()
#                     # Skip methods (receiver functions) for simplicity
#                     if " " not in name:
#                         functions.append(FunctionDef(name=name, line=line_no))
#
#             # Simple import detection
#             if stripped.startswith("import "):
#                 parts = stripped.split('"')
#                 if len(parts) >= 2:
#                     imports.append(ImportDef(module=parts[1]))
#
#         return ParsedFile(
#             path=rel_path,
#             language="go",
#             functions=functions,
#             imports=imports,
#         )
# """
