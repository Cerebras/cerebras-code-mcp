# Contributing to Cerebras MCP

Thank you for your interest in contributing to the Cerebras MCP (Model Context Protocol) server! We welcome contributions from the community and are excited to collaborate with you.

## Getting Help and Support

If you have questions about the MCP server or need help:

- Join our Discord community: https://discord.gg/fQwFthdrq2
- File bugs and feature requests in our GitHub issues
- Check the documentation in our README.md

## Reporting Issues

If you encounter any bugs or have feature requests, please file them in our [GitHub issues](https://github.com/cerebras/cerebras-code-mcp/issues) with as much detail as possible.

When reporting a bug, please include:
- A clear description of the issue
- Steps to reproduce the problem
- Expected behavior vs. actual behavior
- IDE/editor being used (Claude Code, Cursor, Cline, VS Code, Crush)
- Node.js version and operating system
- Any relevant error messages or logs from the MCP server

## Development Setup

### Prerequisites

- [Node.js](https://nodejs.org/) (version 18 or higher)
- [npm](https://www.npmjs.com/)
- One of the supported IDEs: Claude Code, Cursor, Cline, VS Code, or Crush

### Setting Up the Development Environment

1. Clone the repository:
   ```bash
   git clone https://github.com/cerebras/cerebras-code-mcp.git
   cd cerebras-code-mcp
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Test the MCP server:
   ```bash
   node src/index.js --help
   ```

4. Run the interactive configuration:
   ```bash
   node src/index.js --config
   ```

### Testing Your Changes

1. **Test the MCP server directly:**
   ```bash
   CEREBRAS_API_KEY=your_key node src/index.js
   ```

2. **Test the configuration wizard:**
   ```bash
   node src/index.js --config
   ```

3. **Test the removal wizard:**
   ```bash
   node src/index.js --remove
   ```

4. **Test with different IDEs:**
   ```bash
   CEREBRAS_MCP_IDE=cursor CEREBRAS_API_KEY=your_key node src/index.js
   ```

### Publishing Changes

To publish a new version:

```bash
npm version patch  # or minor/major
npm publish
```

This will update the version and publish to npm registry.

## Testing

To test the MCP server during development:

1. **Unit Testing**: Test individual components
   ```bash
   # Test API connections
   node -e "import('./src/api/cerebras.js').then(m => console.log('✅ Cerebras API loaded'))"
   
   # Test configuration
   node -e "import('./src/config/constants.js').then(m => console.log('✅ Constants loaded'))"
   ```

2. **Integration Testing**: Test with actual IDEs
   - Set up the MCP server in your preferred IDE
   - Test the `write` tool functionality
   - Verify API key configuration
   - Test different formatting outputs

3. **Cross-Platform Testing**: Test on different operating systems
   - macOS: Test with standard paths
   - Windows: Test with Windows-specific paths
   - Linux: Test with Linux-specific paths

## Code Style and Standards

The project follows these standards:

- **ES6+ JavaScript**: Use modern JavaScript features
- **Consistent Formatting**: Use consistent indentation and spacing
- **Clear Naming**: Use descriptive variable and function names
- **Error Handling**: Always handle errors gracefully
- **Documentation**: Comment complex logic and functions

### Key Files and Their Purpose:

- `src/index.js`: Main entry point and CLI handler
- `src/server/mcp-server.js`: Core MCP server implementation
- `src/server/tool-handlers.js`: Tool implementation (write tool)
- `src/config/interactive-config.js`: Setup and removal wizards
- `src/config/constants.js`: Configuration constants and paths
- `src/formatting/`: Response formatting for different IDEs
- `src/api/`: API clients for Cerebras and OpenRouter

## Making Changes

1. Fork the repository
2. Create a new branch for your feature or bug fix
3. Make your changes
4. Ensure your code follows the project's style guidelines
5. Test your changes thoroughly
6. Commit your changes with a clear, descriptive commit message
7. Push your branch to your fork
8. Open a pull request with a detailed description of your changes

## Pull Request Guidelines

- Keep pull requests focused on a single feature or bug fix
- Include a clear description of what the pull request does
- Reference any related issues in the pull request description
- Ensure all checks pass before submitting

## Additional Resources

- [Cerebras Inference Documentation](https://inference-docs.cerebras.ai/)
- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [OpenRouter API Documentation](https://openrouter.ai/docs)
- [Claude Code MCP Documentation](https://docs.anthropic.com/claude/docs/mcp)
- [Cursor MCP Integration](https://docs.cursor.com/)
- [VS Code MCP Support](https://code.visualstudio.com/)