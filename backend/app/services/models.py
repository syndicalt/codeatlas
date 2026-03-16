from dataclasses import dataclass, field


@dataclass
class FunctionDef:
    name: str
    line: int
    decorators: list[str] = field(default_factory=list)


@dataclass
class ClassDef:
    name: str
    line: int
    bases: list[str] = field(default_factory=list)
    methods: list[FunctionDef] = field(default_factory=list)


@dataclass
class ImportDef:
    module: str
    names: list[str] = field(default_factory=list)


@dataclass
class ParsedFile:
    path: str  # relative to project root
    language: str
    functions: list[FunctionDef] = field(default_factory=list)
    classes: list[ClassDef] = field(default_factory=list)
    imports: list[ImportDef] = field(default_factory=list)
