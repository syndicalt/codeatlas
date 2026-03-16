from __future__ import annotations

from tree_sitter_languages import get_parser

from app.services.models import ClassDef, FunctionDef, ImportDef, ParsedFile


def parse_java(source: str, rel_path: str, language: str) -> ParsedFile:
    parser = get_parser("java")
    tree = parser.parse(source.encode("utf-8"))
    root = tree.root_node

    functions: list[FunctionDef] = []
    classes: list[ClassDef] = []
    imports: list[ImportDef] = []

    for node in root.children:
        if node.type == "import_declaration":
            imp = _extract_import(node)
            if imp:
                imports.append(imp)

        elif node.type == "class_declaration":
            cls = _extract_class(node)
            if cls:
                classes.append(cls)

        elif node.type == "interface_declaration":
            cls = _extract_interface(node)
            if cls:
                classes.append(cls)

    return ParsedFile(
        path=rel_path,
        language=language,
        functions=functions,
        classes=classes,
        imports=imports,
    )


def _extract_class(node) -> ClassDef | None:
    name_node = node.child_by_field_name("name")
    if not name_node:
        return None

    bases: list[str] = []
    # superclass — node contains "extends ClassName", extract the type_identifier child
    superclass = node.child_by_field_name("superclass")
    if superclass:
        for child in superclass.named_children:
            if child.type in ("type_identifier", "generic_type"):
                bases.append(child.text.decode("utf-8"))
    # interfaces — node contains "implements X, Y", extract from type_list
    interfaces = node.child_by_field_name("interfaces")
    if interfaces:
        for child in interfaces.named_children:
            if child.type == "type_list":
                for tc in child.named_children:
                    bases.append(tc.text.decode("utf-8"))
            elif child.type in ("type_identifier", "generic_type"):
                bases.append(child.text.decode("utf-8"))

    methods: list[FunctionDef] = []
    inner_classes: list[ClassDef] = []
    body = node.child_by_field_name("body")
    if body:
        for child in body.named_children:
            if child.type == "method_declaration":
                method = _extract_method(child)
                if method:
                    methods.append(method)
            elif child.type == "constructor_declaration":
                ctor = _extract_constructor(child, name_node.text.decode("utf-8"))
                if ctor:
                    methods.append(ctor)

    return ClassDef(
        name=name_node.text.decode("utf-8"),
        line=node.start_point[0] + 1,
        bases=bases,
        methods=methods,
    )


def _extract_interface(node) -> ClassDef | None:
    name_node = node.child_by_field_name("name")
    if not name_node:
        return None

    bases: list[str] = []
    extends = node.child_by_field_name("extends")
    if extends:
        for child in extends.named_children:
            bases.append(child.text.decode("utf-8"))

    methods: list[FunctionDef] = []
    body = node.child_by_field_name("body")
    if body:
        for child in body.named_children:
            if child.type == "method_declaration":
                method = _extract_method(child)
                if method:
                    methods.append(method)

    return ClassDef(
        name=name_node.text.decode("utf-8"),
        line=node.start_point[0] + 1,
        bases=bases,
        methods=methods,
    )


def _extract_method(node) -> FunctionDef | None:
    name_node = node.child_by_field_name("name")
    if not name_node:
        return None
    calls = _extract_calls(node)
    return FunctionDef(
        name=name_node.text.decode("utf-8"),
        line=node.start_point[0] + 1,
        calls=calls,
    )


def _extract_constructor(node, class_name: str) -> FunctionDef | None:
    calls = _extract_calls(node)
    return FunctionDef(
        name=class_name,
        line=node.start_point[0] + 1,
        calls=calls,
    )


def _extract_calls(node) -> list[str]:
    calls: list[str] = []
    _walk_calls(node, calls)
    return list(dict.fromkeys(calls))


def _walk_calls(node, calls: list[str]):
    if node.type == "method_invocation":
        name_node = node.child_by_field_name("name")
        if name_node:
            calls.append(name_node.text.decode("utf-8"))
    for child in node.children:
        _walk_calls(child, calls)


def _extract_import(node) -> ImportDef | None:
    # import_declaration text is like "import java.util.List;"
    text = node.text.decode("utf-8").strip().rstrip(";")
    parts = text.split()
    if len(parts) < 2:
        return None

    # Handle "import static ..."
    module = parts[-1]
    # Extract the package (everything before last dot) and the class name
    dot_idx = module.rfind(".")
    if dot_idx > 0:
        package = module[:dot_idx]
        name = module[dot_idx + 1:]
        return ImportDef(module=package, names=[name])
    return ImportDef(module=module, names=[module])
