# Testing

## Backend Tests

Backend tests use **pytest** and are located in `backend/tests/`.

### Running Tests

```bash
cd backend
python -m pytest tests/ -v
```

### Test Structure

| File | Coverage |
|------|----------|
| `test_parser.py` | Python parser (functions, classes, imports), JS/TS parser (functions, classes, imports) |
| `test_graph_builder.py` | Graph node creation, edge creation, Cytoscape JSON export format |
| `conftest.py` | FastAPI TestClient fixture |

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

- Function extraction (including arrow functions for JS/TS)
- Class extraction (including base classes / extends)
- Import extraction (various import styles)

### Graph Builder Tests

Graph builder tests verify the structural correctness of the output:

- **Node creation** — Modules, functions, classes, and methods produce expected node IDs
- **Edge creation** — Contains, imports, and inherits relationships are correctly established
- **Cytoscape JSON** — Output matches the `{ nodes: [...], edges: [...] }` structure with required `data` fields

### Writing New Tests

When adding a new parser or feature:

1. Add test functions to the appropriate test file
2. Use inline source strings rather than fixture files for parser tests
3. Test both happy paths and edge cases (empty files, malformed syntax)

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
