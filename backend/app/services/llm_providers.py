"""Multi-provider LLM abstraction layer.

Unified interface for Anthropic, OpenAI, Google Gemini, Ollama, and Grok (xAI).
All providers convert from a canonical (Anthropic-style) tool format to their native format.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field


@dataclass
class LLMResponse:
    """Unified response from any LLM provider."""
    text: str = ""
    tool_calls: list[dict] = field(default_factory=list)  # [{"id", "name", "input"}]
    raw_content: list[dict] = field(default_factory=list)
    stop_reason: str = ""


class LLMProvider(ABC):
    """Abstract base class for LLM providers."""

    def __init__(self, api_key: str, model: str):
        self.api_key = api_key
        self.model = model

    @abstractmethod
    async def chat(
        self,
        messages: list[dict],
        system: str = "",
        tools: list[dict] | None = None,
        max_tokens: int = 2048,
    ) -> LLMResponse:
        """Send a chat completion request and return a unified response."""
        ...


class AnthropicProvider(LLMProvider):
    """Wraps the Anthropic SDK (Claude models)."""

    async def chat(
        self,
        messages: list[dict],
        system: str = "",
        tools: list[dict] | None = None,
        max_tokens: int = 2048,
    ) -> LLMResponse:
        import anthropic

        client = anthropic.AsyncAnthropic(api_key=self.api_key)

        kwargs: dict = {
            "model": self.model,
            "max_tokens": max_tokens,
            "messages": messages,
        }
        if system:
            kwargs["system"] = system
        if tools:
            kwargs["tools"] = tools

        response = await client.messages.create(**kwargs)

        text_parts = []
        tool_calls = []
        raw_content = []

        for block in response.content:
            if block.type == "text":
                text_parts.append(block.text)
                raw_content.append({"type": "text", "text": block.text})
            elif block.type == "tool_use":
                tool_calls.append({
                    "id": block.id,
                    "name": block.name,
                    "input": block.input,
                })
                raw_content.append({
                    "type": "tool_use",
                    "id": block.id,
                    "name": block.name,
                    "input": block.input,
                })

        return LLMResponse(
            text="\n".join(text_parts),
            tool_calls=tool_calls,
            raw_content=raw_content,
            stop_reason=response.stop_reason or "",
        )


def _anthropic_tools_to_openai(tools: list[dict]) -> list[dict]:
    """Convert Anthropic-style tool definitions to OpenAI function-calling format."""
    openai_tools = []
    for tool in tools:
        openai_tools.append({
            "type": "function",
            "function": {
                "name": tool["name"],
                "description": tool.get("description", ""),
                "parameters": tool.get("input_schema", {}),
            },
        })
    return openai_tools


def _anthropic_messages_to_openai(messages: list[dict], system: str = "") -> list[dict]:
    """Convert Anthropic-style messages to OpenAI format.

    Handles tool_use / tool_result content blocks.
    """
    out: list[dict] = []
    if system:
        out.append({"role": "system", "content": system})

    for msg in messages:
        role = msg["role"]
        content = msg.get("content")

        # Simple string content
        if isinstance(content, str):
            out.append({"role": role, "content": content})
            continue

        # List of content blocks (Anthropic style)
        if isinstance(content, list):
            # Check for tool_result blocks (these come as role=user in Anthropic)
            tool_results = [b for b in content if isinstance(b, dict) and b.get("type") == "tool_result"]
            if tool_results:
                for tr in tool_results:
                    out.append({
                        "role": "tool",
                        "tool_call_id": tr["tool_use_id"],
                        "content": tr.get("content", ""),
                    })
                continue

            # Check for assistant messages with tool_use blocks
            text_parts = []
            tool_calls_out = []
            for block in content:
                if isinstance(block, dict):
                    if block.get("type") == "text":
                        text_parts.append(block["text"])
                    elif block.get("type") == "tool_use":
                        import json
                        tool_calls_out.append({
                            "id": block["id"],
                            "type": "function",
                            "function": {
                                "name": block["name"],
                                "arguments": json.dumps(block["input"]),
                            },
                        })

            if tool_calls_out:
                msg_out: dict = {"role": "assistant", "content": "\n".join(text_parts) if text_parts else None}
                msg_out["tool_calls"] = tool_calls_out
                out.append(msg_out)
            elif text_parts:
                out.append({"role": role, "content": "\n".join(text_parts)})
            else:
                out.append({"role": role, "content": str(content)})
            continue

        out.append({"role": role, "content": str(content) if content else ""})

    return out


class OpenAIProvider(LLMProvider):
    """Wraps the OpenAI SDK. Also serves as base for OpenAI-compatible APIs."""

    base_url: str | None = None

    async def chat(
        self,
        messages: list[dict],
        system: str = "",
        tools: list[dict] | None = None,
        max_tokens: int = 2048,
    ) -> LLMResponse:
        import json
        from openai import AsyncOpenAI

        client_kwargs: dict = {"api_key": self.api_key}
        if self.base_url:
            client_kwargs["base_url"] = self.base_url

        client = AsyncOpenAI(**client_kwargs)

        openai_messages = _anthropic_messages_to_openai(messages, system)
        kwargs: dict = {
            "model": self.model,
            "max_tokens": max_tokens,
            "messages": openai_messages,
        }
        if tools:
            kwargs["tools"] = _anthropic_tools_to_openai(tools)

        response = await client.chat.completions.create(**kwargs)
        choice = response.choices[0]
        message = choice.message

        text = message.content or ""
        tool_calls = []
        raw_content = []

        if text:
            raw_content.append({"type": "text", "text": text})

        if message.tool_calls:
            for tc in message.tool_calls:
                try:
                    args = json.loads(tc.function.arguments)
                except json.JSONDecodeError:
                    args = {}
                tool_calls.append({
                    "id": tc.id,
                    "name": tc.function.name,
                    "input": args,
                })
                raw_content.append({
                    "type": "tool_use",
                    "id": tc.id,
                    "name": tc.function.name,
                    "input": args,
                })

        return LLMResponse(
            text=text,
            tool_calls=tool_calls,
            raw_content=raw_content,
            stop_reason=choice.finish_reason or "",
        )


class GeminiProvider(LLMProvider):
    """Wraps the Google GenAI SDK for Gemini models."""

    async def chat(
        self,
        messages: list[dict],
        system: str = "",
        tools: list[dict] | None = None,
        max_tokens: int = 2048,
    ) -> LLMResponse:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=self.api_key)

        # Convert tools to Gemini format
        gemini_tools = None
        if tools:
            func_decls = []
            for tool in tools:
                schema = tool.get("input_schema", {})
                # Remove unsupported fields
                cleaned = {k: v for k, v in schema.items() if k in ("type", "properties", "required")}
                func_decls.append(types.FunctionDeclaration(
                    name=tool["name"],
                    description=tool.get("description", ""),
                    parameters=cleaned if cleaned else None,
                ))
            gemini_tools = [types.Tool(function_declarations=func_decls)]

        # Convert messages to Gemini format
        gemini_contents = []
        for msg in messages:
            role = "user" if msg["role"] == "user" else "model"
            content = msg.get("content")

            if isinstance(content, str):
                gemini_contents.append(types.Content(
                    role=role,
                    parts=[types.Part.from_text(text=content)],
                ))
            elif isinstance(content, list):
                parts = []
                for block in content:
                    if isinstance(block, dict):
                        if block.get("type") == "text":
                            parts.append(types.Part.from_text(text=block["text"]))
                        elif block.get("type") == "tool_result":
                            parts.append(types.Part.from_function_response(
                                name="tool_response",
                                response={"result": block.get("content", "")},
                            ))
                if parts:
                    gemini_contents.append(types.Content(role=role, parts=parts))

        config = types.GenerateContentConfig(
            max_output_tokens=max_tokens,
            tools=gemini_tools,
        )
        if system:
            config.system_instruction = system

        response = client.models.generate_content(
            model=self.model,
            contents=gemini_contents,
            config=config,
        )

        text_parts = []
        tool_calls = []
        raw_content = []

        if response.candidates:
            for part in response.candidates[0].content.parts:
                if part.text:
                    text_parts.append(part.text)
                    raw_content.append({"type": "text", "text": part.text})
                elif part.function_call:
                    fc = part.function_call
                    call_id = f"call_{fc.name}_{len(tool_calls)}"
                    tool_calls.append({
                        "id": call_id,
                        "name": fc.name,
                        "input": dict(fc.args) if fc.args else {},
                    })
                    raw_content.append({
                        "type": "tool_use",
                        "id": call_id,
                        "name": fc.name,
                        "input": dict(fc.args) if fc.args else {},
                    })

        stop_reason = ""
        if response.candidates:
            stop_reason = str(response.candidates[0].finish_reason or "")

        return LLMResponse(
            text="\n".join(text_parts),
            tool_calls=tool_calls,
            raw_content=raw_content,
            stop_reason=stop_reason,
        )


class OllamaProvider(OpenAIProvider):
    """Ollama via OpenAI-compatible API at localhost:11434."""

    base_url = "http://localhost:11434/v1"


class GrokProvider(OpenAIProvider):
    """Grok (xAI) via OpenAI-compatible API."""

    base_url = "https://api.x.ai/v1"


# --- Factory ---

_PROVIDER_MAP: dict[str, type[LLMProvider]] = {
    "anthropic": AnthropicProvider,
    "openai": OpenAIProvider,
    "google": GeminiProvider,
    "ollama": OllamaProvider,
    "xai": GrokProvider,
}

# Default models per provider
_DEFAULT_MODELS: dict[str, str] = {
    "anthropic": "claude-sonnet-4-20250514",
    "openai": "gpt-4o",
    "google": "gemini-2.0-flash",
    "ollama": "llama3",
    "xai": "grok-3-mini",
}


def get_provider(provider_name: str, api_key: str, model: str = "") -> LLMProvider:
    """Create an LLM provider instance.

    Args:
        provider_name: One of anthropic, openai, google, ollama, xai.
        api_key: The API key for the provider.
        model: Model name. Uses default for the provider if empty.

    Returns:
        An LLMProvider instance.
    """
    cls = _PROVIDER_MAP.get(provider_name)
    if cls is None:
        raise ValueError(f"Unknown provider: {provider_name}. Valid: {', '.join(_PROVIDER_MAP)}")
    if not model:
        model = _DEFAULT_MODELS.get(provider_name, "")
    return cls(api_key=api_key, model=model)
