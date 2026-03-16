"""RAG agent that answers natural language questions about a codebase graph."""

from __future__ import annotations

import json
import uuid
from dataclasses import dataclass, field

from app.services.graph_builder import graph_to_cytoscape_json, project_store
from app.services.graph_query import get_call_chain, search_nodes
from app.services.models import ProjectData
from app.services.vector_index import get_or_build_index


@dataclass
class AgentResponse:
    text: str
    highlighted_nodes: list[str] = field(default_factory=list)
    subgraph_elements: dict | None = None
    code_snippets: list[dict] = field(default_factory=list)
    confidence: str = "medium"
    follow_up_suggestions: list[str] = field(default_factory=list)
    is_local_only: bool = False


# Conversation memory: conversation_id -> list of {"role", "content"}
_conversations: dict[str, list[dict]] = {}

# Tool definitions for the Claude API
TOOLS = [
    {
        "name": "search_codebase",
        "description": (
            "Search the codebase vector index for nodes, relationships, or commits "
            "matching a natural language query. Returns the most relevant documents."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Natural language search query",
                },
                "top_k": {
                    "type": "integer",
                    "description": "Number of results to return (default 10)",
                    "default": 10,
                },
            },
            "required": ["query"],
        },
    },
    {
        "name": "find_nodes",
        "description": (
            "Search graph nodes by name substring, type (module/class/function/external), "
            "or file path prefix. Returns matching node IDs."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "Name substring to match"},
                "node_type": {
                    "type": "string",
                    "description": "Filter by node type",
                    "enum": ["module", "class", "function", "external"],
                },
                "file_path": {"type": "string", "description": "File path prefix"},
            },
        },
    },
    {
        "name": "get_call_chain",
        "description": (
            "Trace the call chain from a specific node. Returns callers or callees "
            "up to a given depth."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "node_id": {"type": "string", "description": "The node ID to trace from"},
                "direction": {
                    "type": "string",
                    "enum": ["callers", "callees"],
                    "default": "callees",
                },
                "max_depth": {
                    "type": "integer",
                    "description": "Max BFS depth (1-10)",
                    "default": 5,
                },
            },
            "required": ["node_id"],
        },
    },
    {
        "name": "get_node_details",
        "description": "Get detailed information about a specific node including its connections.",
        "input_schema": {
            "type": "object",
            "properties": {
                "node_id": {"type": "string", "description": "The node ID to inspect"},
            },
            "required": ["node_id"],
        },
    },
    {
        "name": "get_commit_history",
        "description": (
            "Get recent commit history, optionally filtered by file path. "
            "Returns commit messages, authors, and changed files."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "file_path": {
                    "type": "string",
                    "description": "Filter commits that touch this file path",
                },
                "limit": {
                    "type": "integer",
                    "description": "Max commits to return",
                    "default": 20,
                },
            },
        },
    },
]


def _build_system_prompt(project_data: ProjectData) -> str:
    """Build a system prompt with codebase context."""
    nodes = project_data.cytoscape_json.get("nodes", [])
    edges = project_data.cytoscape_json.get("edges", [])

    # Gather stats
    type_counts: dict[str, int] = {}
    for n in nodes:
        t = n["data"].get("type", "unknown")
        type_counts[t] = type_counts.get(t, 0) + 1

    files = sorted({n["data"].get("file", "") for n in nodes if n["data"].get("file")})

    stats = ", ".join(f"{count} {t}s" for t, count in sorted(type_counts.items()))
    file_list = "\n".join(f"  - {f}" for f in files[:50])
    if len(files) > 50:
        file_list += f"\n  ... and {len(files) - 50} more files"

    has_history = project_data.history is not None and len(project_data.history.commits) > 0

    return f"""You are a codebase analysis assistant for CodeAtlas. You help developers understand \
codebases by answering questions about code structure, dependencies, and history.

Codebase summary:
- {len(nodes)} nodes ({stats})
- {len(edges)} edges (relationships)
- Files:\n{file_list}
{"- Git history available with " + str(len(project_data.history.commits)) + " commits" if has_history else "- No git history available"}

Use the provided tools to search the codebase and answer questions accurately. When you find \
relevant nodes, include their IDs so they can be highlighted in the graph visualization.

Guidelines:
- Be concise and specific. Reference actual file paths, function names, and node IDs.
- When showing code relationships, mention the direction (calls, imports, inherits, contains).
- If the user asks about something you can't find, say so honestly.
- Suggest follow-up questions the user might find useful.
- Format your response in markdown for readability."""


def _execute_tool(tool_name: str, tool_input: dict, project_data: ProjectData) -> str:
    """Execute a tool call and return the result as a string."""
    if tool_name == "search_codebase":
        index = get_or_build_index("current", project_data)
        results = index.search(tool_input["query"], top_k=tool_input.get("top_k", 10))
        return json.dumps([
            {"type": r.doc_type, "id": r.id, "text": r.text, "metadata": r.metadata}
            for r in results
        ])

    elif tool_name == "find_nodes":
        node_ids = search_nodes(
            project_data.graph,
            query=tool_input.get("name"),
            node_type=tool_input.get("node_type"),
            file_path=tool_input.get("file_path"),
        )
        # Return node details
        nodes_info = []
        for nid in node_ids[:30]:
            attrs = project_data.graph.nodes.get(nid, {})
            nodes_info.append({
                "id": nid,
                "label": attrs.get("label", nid),
                "type": attrs.get("type", "unknown"),
                "file": attrs.get("file", ""),
                "line": attrs.get("line", 0),
            })
        return json.dumps(nodes_info)

    elif tool_name == "get_call_chain":
        subgraph = get_call_chain(
            project_data.graph,
            tool_input["node_id"],
            direction=tool_input.get("direction", "callees"),
            max_depth=min(tool_input.get("max_depth", 5), 10),
        )
        elements = graph_to_cytoscape_json(subgraph)
        node_ids = [n["data"]["id"] for n in elements.get("nodes", [])]
        return json.dumps({"node_count": len(subgraph), "node_ids": node_ids, "elements": elements})

    elif tool_name == "get_node_details":
        nid = tool_input["node_id"]
        if nid not in project_data.graph:
            return json.dumps({"error": f"Node '{nid}' not found"})
        attrs = dict(project_data.graph.nodes[nid])
        successors = list(project_data.graph.successors(nid))
        predecessors = list(project_data.graph.predecessors(nid))
        out_edges = [
            {"target": t, "relationship": project_data.graph.edges[nid, t].get("relationship", "")}
            for t in successors
        ]
        in_edges = [
            {"source": s, "relationship": project_data.graph.edges[s, nid].get("relationship", "")}
            for s in predecessors
        ]
        return json.dumps({"id": nid, **attrs, "outgoing": out_edges, "incoming": in_edges})

    elif tool_name == "get_commit_history":
        if not project_data.history or not project_data.history.commits:
            return json.dumps({"error": "No git history available"})
        commits = project_data.history.commits
        file_filter = tool_input.get("file_path")
        limit = tool_input.get("limit", 20)
        if file_filter:
            commits = [c for c in commits if any(file_filter in f for f in c.files_changed)]
        commits = commits[:limit]
        return json.dumps([
            {
                "sha": c.short_sha,
                "message": c.message[:200],
                "author": c.author_name,
                "files_changed": c.files_changed[:10],
            }
            for c in commits
        ])

    return json.dumps({"error": f"Unknown tool: {tool_name}"})


def _extract_response_data(
    text: str, tool_results: list[dict], project_data: ProjectData
) -> AgentResponse:
    """Extract highlighted nodes, subgraph, and code snippets from the agent's work."""
    highlighted_nodes: list[str] = []
    subgraph_elements: dict | None = None
    code_snippets: list[dict] = []

    for result in tool_results:
        try:
            data = json.loads(result.get("content", "{}"))
        except (json.JSONDecodeError, TypeError):
            continue

        if isinstance(data, list):
            for item in data:
                if isinstance(item, dict) and "id" in item:
                    highlighted_nodes.append(item["id"])
        elif isinstance(data, dict):
            if "node_ids" in data:
                highlighted_nodes.extend(data["node_ids"])
                if "elements" in data:
                    subgraph_elements = data["elements"]
            elif "id" in data and "error" not in data:
                highlighted_nodes.append(data["id"])

    # Deduplicate
    highlighted_nodes = list(dict.fromkeys(highlighted_nodes))

    # Extract code snippets from highlighted nodes
    for nid in highlighted_nodes[:5]:
        if nid in project_data.graph:
            attrs = project_data.graph.nodes[nid]
            if attrs.get("file") and attrs.get("line", 0) > 0:
                code_snippets.append({
                    "file": attrs["file"],
                    "start_line": max(1, attrs["line"] - 2),
                    "end_line": attrs["line"] + 10,
                    "label": attrs.get("label", ""),
                })

    return AgentResponse(
        text=text,
        highlighted_nodes=highlighted_nodes,
        subgraph_elements=subgraph_elements,
        code_snippets=code_snippets,
        confidence="high" if highlighted_nodes else "medium",
        follow_up_suggestions=_generate_suggestions(text, highlighted_nodes),
    )


def _generate_suggestions(text: str, highlighted_nodes: list[str]) -> list[str]:
    """Generate follow-up question suggestions."""
    suggestions = []
    if highlighted_nodes:
        suggestions.append("What are the dependencies of these nodes?")
        suggestions.append("Show me the call chain for this function")
    suggestions.append("What are the most connected modules?")
    return suggestions[:3]


async def query_agent(
    project_id: str,
    message: str,
    conversation_id: str | None = None,
    api_key: str | None = None,
    provider_name: str | None = None,
    model: str | None = None,
) -> tuple[AgentResponse, str]:
    """Run the RAG agent to answer a question about the codebase.

    Args:
        project_id: The project to query.
        message: The user's question.
        conversation_id: Optional conversation ID for multi-turn.
        api_key: Optional user-provided API key. Falls back to server anthropic key.
        provider_name: Optional LLM provider name (anthropic, openai, google, ollama, xai).
        model: Optional model name. Uses provider default if empty.

    Returns (AgentResponse, conversation_id).
    """
    from app.config import settings
    from app.services.llm_providers import get_provider

    project_data = project_store.get(project_id)
    if project_data is None:
        return AgentResponse(text="Project not found.", confidence="low"), conversation_id or ""

    # Manage conversation
    if not conversation_id:
        conversation_id = str(uuid.uuid4())
    if conversation_id not in _conversations:
        _conversations[conversation_id] = []

    history = _conversations[conversation_id]

    # Resolve API key and provider
    resolved_key = api_key or settings.anthropic_api_key
    resolved_provider = provider_name or "anthropic"
    resolved_model = model or (settings.rag_llm_model if resolved_provider == "anthropic" else "")

    # If no API key at all, use local-only mode
    if not resolved_key:
        return _local_query(project_data, message, conversation_id)

    provider = get_provider(resolved_provider, resolved_key, resolved_model)

    # Build messages
    history.append({"role": "user", "content": message})

    system_prompt = _build_system_prompt(project_data)
    tool_results: list[dict] = []

    # Agent loop — max 5 iterations
    messages = list(history)
    final_text = ""
    for _ in range(5):
        response = await provider.chat(
            messages=messages,
            system=system_prompt,
            tools=TOOLS,
            max_tokens=2048,
        )

        if not response.tool_calls:
            # No more tool calls — done
            final_text = response.text
            break

        # Execute tools and continue
        messages.append({"role": "assistant", "content": response.raw_content})

        # Build tool results
        tool_result_content = []
        for tc in response.tool_calls:
            result_str = _execute_tool(tc["name"], tc["input"], project_data)
            tool_results.append({"tool_name": tc["name"], "content": result_str})
            tool_result_content.append({
                "type": "tool_result",
                "tool_use_id": tc["id"],
                "content": result_str,
            })

        messages.append({"role": "user", "content": tool_result_content})
    else:
        # Exhausted iterations
        final_text = response.text if response.text else "I couldn't find a complete answer."

    # Save assistant response to conversation history
    history.append({"role": "assistant", "content": final_text})

    # Keep conversation history bounded
    if len(history) > 20:
        history[:] = history[-20:]

    agent_resp = _extract_response_data(final_text, tool_results, project_data)
    return agent_resp, conversation_id


def _local_query(
    project_data: ProjectData, message: str, conversation_id: str
) -> tuple[AgentResponse, str]:
    """Fallback local-only mode using just vector search (no LLM)."""
    index = get_or_build_index("current", project_data)
    results = index.search(message, top_k=10)

    if not results:
        return AgentResponse(
            text="No matching results found in the codebase. Try rephrasing your question.",
            confidence="low",
            is_local_only=True,
            follow_up_suggestions=["List all modules", "Show all classes", "What functions exist?"],
        ), conversation_id

    # Build a text summary
    lines = ["**Search results** (local mode — set `CODEATLAS_ANTHROPIC_API_KEY` for AI answers):\n"]
    highlighted = []
    for r in results:
        if r.doc_type == "node":
            lines.append(f"- **{r.metadata.get('type', '')}** `{r.metadata.get('label', r.id)}` in `{r.metadata.get('file', '')}`")
        elif r.doc_type == "relationship":
            lines.append(f"- **relationship** `{r.text[:100]}`")
        elif r.doc_type == "commit":
            lines.append(f"- **commit** {r.text[:120]}")
        highlighted.append(r.id)

    return AgentResponse(
        text="\n".join(lines),
        highlighted_nodes=highlighted,
        confidence="low",
        is_local_only=True,
        follow_up_suggestions=["Tell me more about the first result", "Show dependencies"],
    ), conversation_id
