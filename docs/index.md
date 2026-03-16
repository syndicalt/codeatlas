# CodeAtlas

**Transform complex codebases into intuitive, interactive knowledge graphs.**

CodeAtlas is a browser-based application that ingests a GitHub repository or ZIP file, analyzes the code using Tree-sitter parsing, and builds a comprehensive graph representation. Developers can visualize structural elements, dependencies, call chains, and relationships through an interactive Cytoscape.js-powered dashboard.

## What It Does

- **Parses** Python, JavaScript, TypeScript, and Java source files using Tree-sitter
- **Extracts** functions, classes, modules, imports, inheritance, and function call chains
- **Builds** a directed knowledge graph with NetworkX
- **Renders** an interactive, color-coded visualization in the browser
- **Supports** searching, filtering, dependency scoping, and graph export
- **Processes** large repos asynchronously with progress tracking

## Who It's For

- Developers onboarding to unfamiliar codebases
- Teams reviewing architecture and dependencies
- Anyone wanting a visual map of how code connects

## Quick Example

1. Open CodeAtlas in your browser
2. Paste a GitHub URL, upload a ZIP, or click **Try Demo Project**
3. See the codebase rendered as an interactive graph — search, filter, and click nodes to explore

## Current Status

CodeAtlas has completed **Phase 1** (core ingestion) and **Phase 2** (advanced visuals). See the [Roadmap](development/roadmap.md) for upcoming features including Git history integration and a RAG-powered query agent.

## Get Started

Follow the [Installation Guide](getting-started/installation.md) to set up CodeAtlas locally, or jump to the [Quick Start](getting-started/quickstart.md) if you already have Python and Node.js installed.
