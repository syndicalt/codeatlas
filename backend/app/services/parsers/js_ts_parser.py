from __future__ import annotations

from tree_sitter_languages import get_parser

from app.services.models import ClassDef, FunctionDef, ImportDef, ParsedFile


def parse_js_ts(source: str, rel_path: str, language: str) -> ParsedFile:
    lang_name = language
    if rel_path.endswith(".tsx") or rel_path.endswith(".jsx"):
        lang_name = "tsx" if rel_path.endswith(".tsx") else "javascript"

    parser = get_parser(lang_name)
    tree = parser.parse(source.encode("utf-8"))
    root = tree.root_node

    functions: list[FunctionDef] = []
    classes: list[ClassDef] = []
    imports: list[ImportDef] = []

    for node in root.children:
        if node.type == "function_declaration":
            func = _extract_function(node)
            if func:
                functions.append(func)

        elif node.type in ("lexical_declaration", "variable_declaration"):
            func = _extract_arrow_function(node)
            if func:
                functions.append(func)

        elif node.type == "export_statement":
            for child in node.named_children:
                if child.type == "function_declaration":
                    func = _extract_function(child)
                    if func:
                        functions.append(func)
                elif child.type == "class_declaration":
                    cls = _extract_class(child)
                    if cls:
                        classes.append(cls)
                elif child.type in ("lexical_declaration", "variable_declaration"):
                    func = _extract_arrow_function(child)
                    if func:
                        functions.append(func)

        elif node.type == "class_declaration":
            cls = _extract_class(node)
            if cls:
                classes.append(cls)

        elif node.type == "import_statement":
            imp = _extract_import(node)
            if imp:
                imports.append(imp)

    return ParsedFile(
        path=rel_path,
        language=language,
        functions=functions,
        classes=classes,
        imports=imports,
    )


def _extract_function(node) -> FunctionDef | None:
    name_node = node.child_by_field_name("name")
    if not name_node:
        return None
    calls = _extract_calls(node)
    return FunctionDef(
        name=name_node.text.decode("utf-8"),
        line=node.start_point[0] + 1,
        calls=calls,
    )


def _extract_arrow_function(node) -> FunctionDef | None:
    for child in node.named_children:
        if child.type == "variable_declarator":
            name_node = child.child_by_field_name("name")
            value_node = child.child_by_field_name("value")
            if name_node and value_node and value_node.type == "arrow_function":
                calls = _extract_calls(value_node)
                return FunctionDef(
                    name=name_node.text.decode("utf-8"),
                    line=node.start_point[0] + 1,
                    calls=calls,
                )
    return None


def _extract_class(node) -> ClassDef | None:
    name_node = node.child_by_field_name("name")
    if not name_node:
        return None

    bases: list[str] = []
    heritage = node.child_by_field_name("heritage")
    if not heritage:
        for child in node.children:
            if child.type == "class_heritage":
                heritage = child
                break
    if heritage:
        for child in heritage.named_children:
            bases.append(child.text.decode("utf-8"))

    methods: list[FunctionDef] = []
    body = node.child_by_field_name("body")
    if body:
        for child in body.named_children:
            if child.type == "method_definition":
                name = child.child_by_field_name("name")
                if name:
                    calls = _extract_calls(child)
                    methods.append(FunctionDef(
                        name=name.text.decode("utf-8"),
                        line=child.start_point[0] + 1,
                        calls=calls,
                    ))

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
    return list(dict.fromkeys(calls))


def _walk_calls(node, calls: list[str]):
    if node.type == "call_expression":
        func_node = node.child_by_field_name("function")
        if func_node:
            if func_node.type == "identifier":
                calls.append(func_node.text.decode("utf-8"))
            elif func_node.type == "member_expression":
                prop = func_node.child_by_field_name("property")
                if prop:
                    calls.append(prop.text.decode("utf-8"))
    for child in node.children:
        _walk_calls(child, calls)


def _extract_import(node) -> ImportDef | None:
    source_node = node.child_by_field_name("source")
    if not source_node:
        return None

    module = source_node.text.decode("utf-8").strip("'\"")
    names: list[str] = []

    for child in node.named_children:
        if child.type == "import_clause":
            for sub in child.named_children:
                if sub.type == "identifier":
                    names.append(sub.text.decode("utf-8"))
                elif sub.type == "named_imports":
                    for spec in sub.named_children:
                        if spec.type == "import_specifier":
                            name_node = spec.child_by_field_name("name")
                            if name_node:
                                names.append(name_node.text.decode("utf-8"))
                elif sub.type == "namespace_import":
                    names.append(sub.text.decode("utf-8"))

    return ImportDef(module=module, names=names)
