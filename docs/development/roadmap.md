# Roadmap

CodeAtlas is being developed in five phases. Each phase builds on the previous one.

## Phase 1: Core Ingestion & Basic Graph :white_check_mark:

**Status: Complete**

- [x] GitHub repository cloning (shallow, public repos)
- [x] ZIP file upload and extraction
- [x] Tree-sitter parsing for Python, JavaScript, TypeScript
- [x] Extraction of functions, classes, imports, inheritance
- [x] NetworkX graph construction
- [x] Cytoscape.js interactive visualization
- [x] Landing page with URL input and drag-and-drop upload
- [x] Node detail panel (file path, line number, type)
- [x] Color-coded nodes by type (module, class, function, external)
- [x] Backend test suite (9 tests passing)

## Phase 2: Advanced Visuals

**Focus:** Richer interaction and deeper analysis

- [ ] Node expansion/collapse (show/hide module contents)
- [ ] Search and filter by name, type, or file path
- [ ] Call chain analysis — trace function invocations across files
- [ ] Dependency scope filtering (internal only, external only, all)
- [ ] Graph export to PNG, SVG, and JSON
- [ ] Node clustering by directory/package
- [ ] Edge weight visualization (number of connections)
- [ ] Background task processing for large repositories

## Phase 3: History Integration

**Focus:** Git-aware analysis and time-based views

- [ ] Full Git history analysis (not just shallow clone)
- [ ] Time slider to view graph at any commit
- [ ] Churn metrics — lines changed per module over time
- [ ] Change highlighting — added/removed/modified nodes between commits
- [ ] Contributor visualization — who works on what
- [ ] Branch comparison graphs

## Phase 4: RAG Agent

**Focus:** Natural language querying

- [ ] Vector embeddings of graph data and commit messages (FAISS)
- [ ] LLM-powered query agent for natural language questions
- [ ] Chat-like query interface in the dashboard
- [ ] Response types: text explanations, highlighted subgraphs, code snippets
- [ ] Query examples: "Why was this module refactored?", "Show all callers of function X"
- [ ] Guardrails for ambiguous queries

## Phase 5: Polish & Extensibility

**Focus:** Production readiness

- [ ] Plugin system for custom language parsers
- [ ] OAuth authentication for private GitHub repos
- [ ] Real-time collaboration via WebSockets
- [ ] Shareable graph links
- [ ] Docker containerization (docker-compose)
- [ ] Cloud deployment (Vercel + AWS/Heroku)
- [ ] Comprehensive frontend testing (Jest + React Testing Library)
- [ ] End-to-end tests (Cypress)
- [ ] Accessibility: keyboard navigation, ARIA labels, high-contrast mode
- [ ] Performance optimization for graphs with 10,000+ nodes
- [ ] API rate limiting
- [ ] Neo4j integration for persistent graph storage
