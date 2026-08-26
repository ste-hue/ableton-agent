# Ableton Agent

@AGENTS.md

The rules in AGENTS.md are shared with every MCP host used on this project and are
mandatory. For Claude Code specifically: the MCP server is configured in `.mcp.json`,
permissions in `.claude/settings.json` (read-only tools pre-approved, mutations
prompt, code-execution tools hard-denied), and the LOM reference is available as the
project skill `ableton-lom`.
