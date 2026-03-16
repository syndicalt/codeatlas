from __future__ import annotations

from tree_sitter_languages import get_parser

from app.services.models import ClassDef, FunctionDef, ImportDef, ParsedFile


def parse_python(source: str, rel_path: str, language: str) -> ParsedFile:
    parser = get_parser("python")
    tree = parser.parse(source.encode("utf-8"))
    root = tree.root_node

    functions: list[FunctionDef] = []
    classes: list[ClassDef] = []
    imports: list[ImportDef] = []

    for node in _iter_children(root):
        if node.type == "function_definition":
            func = _extract_function(node)
            if func:
                functions.append(func)

        elif node.type == "class_definition":
            cls = _extract_class(node)
            if cls:
                classes.append(cls)

        elif node.type == "import_statement":
            imp = _extract_import(node)
            if imp:
                imports.append(imp)

        elif node.type == "import_from_statement":
            imp = _extract_import_from(node)
            if imp:
                imports.append(imp)

    return ParsedFile(
        path=rel_path,
        language=language,
        functions=functions,
        classes=classes,
        imports=imports,
    )


def _iter_children(node):
    """Yield direct children (non-recursive to keep top-level only for functions)."""
    for child in node.children:
        yield child


def _extract_function(node) -> FunctionDef | None:
    name_node = node.child_by_field_name("name")
    if not name_node:
        return None
    decorators = []
    prev = node.prev_named_sibling
    while prev and prev.type == "decorator":
        decorators.append(prev.text.decode("utf-8"))
        prev = prev.prev_named_sibling

    calls = _extract_calls(node)

    return FunctionDef(
        name=name_node.text.decode("utf-8"),
        line=node.start_point[0] + 1,
        decorators=decorators,
        calls=calls,
    )


def _extract_class(node) -> ClassDef | None:
    name_node = node.child_by_field_name("name")
    if not name_node:
        return None

    bases: list[str] = []
    superclasses = node.child_by_field_name("superclasses")
    if superclasses:
        for child in superclasses.named_children:
            bases.append(child.text.decode("utf-8"))

    methods: list[FunctionDef] = []
    body = node.child_by_field_name("body")
    if body:
        for child in body.named_children:
            if child.type == "function_definition":
                func = _extract_function(child)
                if func:
                    methods.append(func)

    return ClassDef(
        name=name_node.text.decode("utf-8"),
        line=node.start_point[0] + 1,
        bases=bases,
        methods=methods,
    )


def _extract_calls(node) -> list[str]:
    """Recursively find all function/method calls within a node."""
    calls: list[str] = []
    _walk_calls(node, calls)
    return list(dict.fromkeys(calls))  # dedupe preserving order


def _walk_calls(node, calls: list[str]):
    if node.type == "call":
        func_node = node.child_by_field_name("function")
        if func_node:
            if func_node.type == "identifier":
                calls.append(func_node.text.decode("utf-8"))
            elif func_node.type == "attribute":
                attr = func_node.child_by_field_name("attribute")
                if attr:
                    calls.append(attr.text.decode("utf-8"))
    for child in node.children:
        _walk_calls(child, calls)


def _extract_import(node) -> ImportDef | None:
    names = []
    for child in node.named_children:
        if child.type == "dotted_name":
            names.append(child.text.decode("utf-8"))
        elif child.type == "aliased_import":
            name_node = child.child_by_field_name("name")
            if name_node:
                names.append(name_node.text.decode("utf-8"))
    if names:
        return ImportDef(module=names[0], names=names)
    return None


def _extract_import_from(node) -> ImportDef | None:
    module_node = node.child_by_field_name("module_name")
    module = module_node.text.decode("utf-8") if module_node else ""

    names: list[str] = []
    for child in node.named_children:
        if child.type == "dotted_name" and child != module_node:
            names.append(child.text.decode("utf-8"))
        elif child.type == "aliased_import":
            name_node = child.child_by_field_name("name")
            if name_node:
                names.append(name_node.text.decode("utf-8"))

    return ImportDef(module=module, names=names)
