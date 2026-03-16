# CodeAtlas: AI-Powered Code Knowledge Graph Explorer

## Overview
CodeAtlas is a browser-based application designed to transform complex codebases into intuitive, interactive knowledge graphs. By ingesting a GitHub repository or a ZIP file, it analyzes the code to build a comprehensive graph representation, enabling developers to visualize and query structural elements, dependencies, and historical evolution. Powered by Retrieval-Augmented Generation (RAG) for natural language queries, CodeAtlas accelerates codebase comprehension, onboarding, debugging, and refactoring insights. This tool is ideal for solo developers, teams, and AI-assisted coding workflows, aligning with the rise of intent-driven development and self-assembling systems.

The spec is structured to be AI-buildable: it includes modular components, clear interfaces, and implementation guidelines. An AI code generator (e.g., based on large language models) can use this as a blueprint to produce the initial codebase, with placeholders for extensions like custom parsers or integrations.

## Key Features
1. **Input Ingestion**:
   - Support for GitHub repository URLs (public or authenticated via OAuth).
   - Upload of ZIP files containing codebases (e.g., extracted repos or archives).
   - Automatic detection of programming languages (initially Python, JavaScript/TypeScript, Java; extensible via plugins).
   - Validation: Check for valid repo structure, handle large files (up to 1GB), and provide progress feedback.

2. **Graph Generation**:
   - **Code Structure Visualization**: Parse source files to extract classes, functions, variables, and modules. Represent as nodes (e.g., function nodes) and edges (e.g., inheritance or import relationships).
   - **Dependencies Analysis**: Identify internal dependencies (e.g., module imports) and external ones (e.g., package.json or requirements.txt). Visualize as a directed graph with filtering by scope (e.g., show only third-party deps).
   - **Call Chains**: Trace function calls across files to build invocation graphs. Highlight bottlenecks or deeply nested chains.
   - **Historical Evolution**: Integrate Git commit history to create time-based graphs. Show changes over commits, such as added/removed nodes, refactored edges, or churn metrics (e.g., lines changed per module).

3. **Interactive Visualizations**:
   - Browser-rendered graphs using interactive libraries (e.g., force-directed layouts).
   - Features: Zoom/pan, node expansion/collapse, search/filter, color-coding (e.g., by file type or change frequency), export to PNG/SVG/JSON.
   - Time slider for commit history: Animate graph changes or snapshot views.

4. **RAG-Based Query Agent**:
   - Natural language interface: Users query via text input (e.g., "Explain why this module was refactored" or "Show dependencies for function X").
   - RAG Pipeline: Embed graph data and commit messages into a vector store; retrieve relevant chunks and generate responses using an LLM (e.g., via API like Grok or OpenAI).
   - Response Types: Text explanations, highlighted graph views, or code snippets.
   - Guardrails: Handle ambiguous queries with clarifications; ensure responses are codebase-specific.

5. **Additional Capabilities**:
   - Export graphs as shareable links or files.
   - Collaboration: Real-time sharing for team sessions (optional WebSocket integration).
   - Extensibility: Plugin system for adding language parsers or custom visualizations.
   - Security: Process data client-side where possible; no persistent storage of user code.

## Architecture
CodeAtlas follows a client-server architecture for scalability, with heavy lifting on the backend for analysis and the frontend for interactivity.

- **Frontend (Browser-Based)**:
  - Built with TypeScript and React.js for UI components.
  - Graph Rendering: Use Cytoscape.js or Vis.js for interactive visualizations.
  - State Management: Redux or Context API for handling graph data and query states.
  - Query Interface: Integrated chat-like UI for RAG interactions.

- **Backend**:
  - Python-based server using FastAPI for RESTful endpoints.
  - Graph Processing: NetworkX for in-memory graphs (for smaller repos) or Neo4j for persistent, queryable storage (for larger ones).
  - Code Parsing: Language-specific libraries (e.g., Tree-sitter for syntax trees, Pydoc for Python docs).
  - Git Integration: Use GitPython to clone repos and analyze history.
  - RAG Setup: FAISS or Pinecone for vector embeddings; integrate with an LLM API for generation.
  - File Handling: Unzip and process ZIP uploads; temporary storage with cleanup.

- **Data Flow**:
  1. User uploads repo/ZIP via frontend.
  2. Backend ingests, parses, and builds graph (stored as JSON or in Neo4j).
  3. Frontend fetches graph data and renders visualizations.
  4. For queries: Frontend sends NL query to backend; backend retrieves from vector store, augments with LLM, and returns response.
  5. Historical views: Backend queries Git log and diffs to enrich graph.

- **Deployment**:
  - Containerized with Docker for easy setup.
  - Run locally (e.g., via `docker-compose up`) or deploy to cloud (Vercel for frontend, Heroku/AWS for backend).
  - API Rate Limiting: To prevent abuse, especially for LLM calls.

## Tech Stack
- **Frontend**: TypeScript, React.js, Cytoscape.js (for graphs), Tailwind CSS (styling).
- **Backend**: Python 3.10+, FastAPI, NetworkX/Neo4j, GitPython, LangChain (for RAG), Sentence Transformers (for embeddings).
- **Database**: Neo4j (graph DB) or SQLite (for metadata).
- **Other**: WebSockets (Socket.io) for real-time features; JWT for auth if needed.
- **Testing**: Jest for frontend, Pytest for backend; end-to-end with Cypress.
- **AI Build Hooks**: Include code stubs with comments like `# AI TODO: Implement parser for Java` to guide AI generation.

## User Interface Guidelines
- **Landing Page**: Simple upload form for GitHub URL or ZIP, with demo button (pre-loaded sample repo).
- **Dashboard**: Split view – left: Graph canvas; right: Query panel and details inspector.
- **Accessibility**: Keyboard navigation, high-contrast modes, ARIA labels for graphs.
- **Responsive Design**: Mobile-friendly, but optimized for desktop (large graphs).

## Implementation Roadmap (AI-Buildable Phases)
1. **Phase 1: Core Ingestion & Basic Graph** – Ingest repo, parse structure, render static graph.
2. **Phase 2: Advanced Visuals** – Add interactivity, dependencies, call chains.
3. **Phase 3: History Integration** – Git analysis and time-based views.
4. **Phase 4: RAG Agent** – Embed data, query pipeline.
5. **Phase 5: Polish & Extensibility** – UI refinements, plugins, testing.

This spec provides a complete blueprint for building CodeAtlas using AI tools like code generators or copilots. Start by generating the backend skeleton in Python, then the frontend in TypeScript, and iterate based on tests with sample repos.