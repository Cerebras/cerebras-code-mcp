# Cerebras Code MCP Server v1.3.0

This MCP server is designed for **planning with Claude Code, Cline, or Cursor** and **making changes with Cerebras** to maximize speed and intelligence while avoiding API limits. Use your preferred AI for planning and strategy, then leverage Cerebras for high-quality code generation.

It will use the Qwen 3 Coder model, and can be embedded in IDEs like Claude Code and Cline, with beta support for Cursor.

## ✨ New in v1.3.0

- **Project Restructure**: Organized project into smaller, more manageable components for DX purposes
- **Stronger Instruction**: Improved `write` usage count among models
- **Claude Code - Enhanced Visual Diffs**: Displays changes/edits in a pretty format
- **VS Code Support**: Added install/remove support for VS Code
- **Update Config Wizard for Messy Configs**: Added a removal wizard that helps uninstall

## 1. Install the NPM Package
```bash
npm install -g cerebras-code-mcp
```

## 2. Get Cerebras API key
Visit [cloud.cerebras.ai](https://cloud.cerebras.ai) and create an API key

[OPTIONAL] Add OpenRouter as a backup in case you hit your Cerebras rate limits
Visit [OpenRouter](https://openrouter.ai/) and get a key to use as a fallback provider.

You can set this key in your MCP settings under OPENROUTER_API_KEY, and it will trigger automatically if anything goes wrong with calling Cerebras.


## 3. Run the Setup Wizard for Claude Code / Cursor / Cline / VS Code (Copilot)
```bash
cerebras-mcp --config
```

Use the setup wizard to configure the tool on your machine.

If you're using Cursor, it will ask you to copy and paste a prompt into your Cursor User Rules.

## 4. Removal/Cleanup (Optional)
```bash
cerebras-mcp --remove
```

Use the removal wizard to clean up configurations for any IDE or perform a complete cleanup.

## 5. Usage

The MCP tool will appear as `write` in your tool list. It supports:

- **Natural language prompts**: Just describe what you want in plain English
- **Context files**: Include multiple files as context for better code understanding
- **Visual diffs**: See changes with Git-style diffs

Example usage:
```
Create a REST API with Express.js that handles user authentication
```