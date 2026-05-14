# ADR-0006 — Backend uses the Claude Agent SDK, not `claude` CLI spawns

The Next.js backend invokes Claude Code's logic via the Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`), not by spawning the `claude` CLI as a child process. The SDK runs the same Claude Code primitives — `.claude/skills/`, `.claude/agents/`, `.claude/commands/`, `CLAUDE.md`, MCP servers, hooks — in-process, so ADR-0004 ("Claude Code is the implementation language") holds either way.

We considered CLI child-process spawning because it is the literal interpretation of the CCOS Manual's phrasing. We rejected it: token streaming to the Operator's UI is materially easier in-process than parsing a CLI's stdout stream; the two-step pipeline from the drafting design composes as sequential SDK calls instead of two spawns plus two parsers; cancellation is a function call instead of an OS signal; and we drop one moving piece (no `claude` binary on the container PATH).

The trade-off we accept: the SDK is younger than the CLI and we couple our backend to its API surface. Both are first-party Anthropic, so divergence risk is low — but we will not avoid using newer Claude Code primitives in `.claude/` just because the SDK might lag the CLI in supporting them.

This refines (does not supersede) **ADR-0003**: the "engine" is still Claude Code, just consumed as a library rather than a subprocess.
