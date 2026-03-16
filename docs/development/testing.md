# Testing

## Backend Tests

Backend tests use **pytest** and are located in `backend/tests/`. The current suite has **21 tests** covering all three language parsers and the graph builder.

### Running Tests

```bash
cd backend
python -m pytest tests/ -v
```

### Test Structure

| File | Tests | Coverage |
|------|-------|----------|
| `test_parser.py` | 11 | Python parser (functions, classes, imports, calls, method calls), JS/TS parser (functions, classes, imports, calls), Java parser (classes, inheritance, imports, calls, interfaces) |
| `test_graph_builder.py` | 7 | Graph node creation, edge creation, call edges, Cytoscape JSON format, directory attributes, connection counts, edge weights |
| `conftest.py` | — | FastAPI TestClient fixture |

### Parser Tests

Parser tests verify that Tree-sitter extraction works correctly for each language:

```python
def test_parse_python_functions():
    source = '''
def hello():
    pass

def greet(name):
    return f"Hi {name}"
'''
    result = parse_python(source, "test.py", "python")
    assert len(result.functions) == 2
    assert result.functions[0].name == "hello"
```

Each language parser is tested for:

- Function extraction (including arrow functions for JS/TS, constructors for Java)
- Class extraction (including base classes, extends, implements)
- Import extraction (various import styles per language)
- **Function call extraction** — verifying that `calls` lists are populated from AST call nodes
- **Method call extraction** — verifying attribute/member expression calls (e.g., `self.db.find()`)

#### Java-Specific Tests

The Java parser has dedicated tests for:

- **Class declarations** with superclass extraction (`extends`)
- **Interface declarations** with extends extraction
- **Method and constructor declarations**
- **Import declarations** (e.g., `import java.util.List`)
- **Method invocations** extracted from method bodies

### Graph Builder Tests

Graph builder tests verify the structural correctness of the output:

- **Node creation** — Modules, functions, classes, and methods produce expected node IDs
- **Edge creation** — Contains, imports, and inherits relationships are correctly established
- **Call edges** — Function-to-function call relationships are resolved (same-file > same-directory > global)
- **Cytoscape JSON** — Output matches the `{ nodes: [...], edges: [...] }` structure with required `data` fields
- **Directory attributes** — Each node includes the correct parent directory path
- **Connection counts** — The `connections` field equals in-degree + out-degree
- **Edge weights** — Each edge includes a `weight` field

### Writing New Tests

When adding a new parser or feature:

1. Add test functions to the appropriate test file
2. Use inline source strings rather than fixture files for parser tests
3. Test both happy paths and edge cases (empty files, malformed syntax)
4. For new parsers, include tests for function calls extraction

```python
def test_parse_empty_file():
    result = parse_python("", "empty.py", "python")
    assert result.functions == []
    assert result.classes == []
    assert result.imports == []
```

## Frontend Testing

Frontend type checking is performed via the TypeScript compiler:

```bash
cd frontend
npx tsc --noEmit
```

Component testing with Jest and React Testing Library will be added in Phase 5.
