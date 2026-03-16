# CodeAtlas

**Transform complex codebases into intuitive, interactive knowledge graphs.**

CodeAtlas is a browser-based application that ingests a GitHub repository or ZIP file, analyzes the code using Tree-sitter parsing, and builds a comprehensive graph representation. Developers can visualize structural elements, dependencies, and relationships through an interactive Cytoscape.js-powered interface.

## What It Does

- **Parses** Python, JavaScript, and TypeScript source files using Tree-sitter
- **Extracts** functions, classes, modules, imports, and inheritance hierarchies
- **Builds** a directed knowledge graph with NetworkX
- **Renders** an interactive, color-coded visualization in the browser
- **Supports** GitHub repository URLs and ZIP file uploads

## Who It's For

- Developers onboarding to unfamiliar codebases
- Teams reviewing architecture and dependencies
- Anyone wanting a visual map of how code connects

## Quick Example

1. Open CodeAtlas in your browser
2. Paste a GitHub URL like `https://github.com/pallets/flask`
3. See the entire codebase rendered as an interactive graph — modules in blue, classes in green, functions in orange

## Current Status

CodeAtlas is in **Phase 1** — core ingestion and basic graph visualization are functional. See the [Roadmap](development/roadmap.md) for upcoming features including call chain analysis, Git history integration, and a RAG-powered query agent.

## Get Started

Follow the [Installation Guide](getting-started/installation.md) to set up CodeAtlas locally, or jump to the [Quick Start](getting-started/quickstart.md) if you already have Python and Node.js installed.
