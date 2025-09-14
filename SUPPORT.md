# Support for Cerebras MCP

Thank you for using the Cerebras MCP (Model Context Protocol) server! We're here to help you with any questions or issues you might have.

## Getting Help

If you need help with the Cerebras MCP server, here are the best ways to get support:

### Discord Community

Join our Discord community for real-time support, discussions, and updates:
https://discord.gg/fQwFthdrq2

In our Discord, you can:
- Ask questions about using the MCP server
- Get help with API key setup and IDE configuration
- Discuss best practices for MCP integration
- Connect with other users across different IDEs
- Get updates about new features and supported IDEs

### Documentation

Check our documentation for detailed information about using the MCP server:
- [README.md](README.md) - Complete setup and usage guide
- [Cerebras Inference Documentation](https://inference-docs.cerebras.ai/)
- [Model Context Protocol Specification](https://modelcontextprotocol.io/)

### GitHub Issues

For bugs, feature requests, or other issues, please file them in our [GitHub issues](https://github.com/cerebras/cerebras-code-mcp/issues) tracker.

When filing an issue, please include:
- A clear description of the problem
- Steps to reproduce the issue
- IDE/editor being used (Claude Code, Cursor, Cline, VS Code, Crush)
- Node.js version and operating system
- Any relevant error messages or MCP server logs
- Your configuration setup (without exposing API keys)

## Frequently Asked Questions

### How do I get a Cerebras API key?

1. Visit [Cerebras Cloud](https://cloud.cerebras.ai/)
2. Sign up for a free account
3. Navigate to the API keys section
4. Generate a new API key
5. Copy the key (it should start with `csk-`)
6. Use it in the interactive setup: `cerebras-mcp --config`

### What IDEs are supported?

The Cerebras MCP server supports:

**Fully Supported IDEs:**
- **Claude Code** - Native MCP integration
- **Cursor** - MCP configuration via mcp.json
- **Cline** - Rules-based integration
- **VS Code** - Native MCP support via mcp.json
- **Crush** - Terminal AI with MCP configuration

**Setup Methods:**
- Interactive setup wizard: `cerebras-mcp --config`
- Manual configuration (see README.md)
- Removal wizard: `cerebras-mcp --remove`

### What models are supported?

The MCP server provides access to:

**Cerebras Models:**
- All models available through Cerebras Inference API
- Optimized for code generation and editing

**OpenRouter Models:**
- Access to 200+ models through OpenRouter
- Includes GPT, Claude, Llama, and other popular models

For current model availability, check the [Cerebras Inference Documentation](https://inference-docs.cerebras.ai/).

### Why is my MCP server not working?

If you're experiencing issues, check:

1. **API Key Configuration:**
   - Ensure your API key is set: `echo $CEREBRAS_API_KEY`
   - Verify the key format (should start with `csk-`)
   - Re-run setup if needed: `cerebras-mcp --config`

2. **IDE Configuration:**
   - Check that MCP server is properly configured in your IDE
   - Verify the server command path is correct
   - Restart your IDE after configuration changes

3. **Server Status:**
   - Test the server directly: `CEREBRAS_API_KEY=your_key cerebras-mcp`
   - Check for error messages in the console
   - Ensure Node.js version is 18 or higher

4. **Network Issues:**
   - Verify internet connectivity
   - Check if corporate firewall blocks API access
   - Test API access: `curl -H "Authorization: Bearer $CEREBRAS_API_KEY" https://api.cerebras.ai/v1/models`

### How do I update the MCP server?

To update to the latest version:

```bash
npm update -g cerebras-code-mcp
```

Or reinstall completely:

```bash
npm uninstall -g cerebras-code-mcp
npm install -g cerebras-code-mcp
```

After updating:
1. Restart your IDE
2. Verify the new version: `cerebras-mcp --version`
3. Re-run configuration if needed: `cerebras-mcp --config`

### How do I switch between IDEs?

To use the MCP server with a different IDE:

1. **Remove current setup:**
   ```bash
   cerebras-mcp --remove
   ```

2. **Set up new IDE:**
   ```bash
   cerebras-mcp --config
   ```

3. **Or configure multiple IDEs:**
   - You can have the server configured for multiple IDEs simultaneously
   - Each IDE will use its own configuration files

## Contact Information

For additional support, you can reach out through:
- **Discord**: https://discord.gg/fQwFthdrq2
- **GitHub Issues**: https://github.com/cerebras/cerebras-code-mcp/issues
- **Email**: support@cerebras.ai (for security issues)

## Security Issues

If you discover a security vulnerability, please contact us at support@cerebras.ai with details.

## Providing Feedback

We value your feedback and suggestions for improving the MCP server. Please share your thoughts:

- **Discord Community**: General discussions and feature requests
- **GitHub Issues**: Bug reports and specific feature requests
- **GitHub Discussions**: Broader conversations about MCP integration

## Troubleshooting Common Issues

### "Command not found: cerebras-mcp"
```bash
npm install -g cerebras-code-mcp
```

### "Permission denied" errors
```bash
sudo npm install -g cerebras-code-mcp
```

### MCP server not responding
1. Check if the process is running
2. Verify API key is set correctly
3. Restart your IDE
4. Check the server logs for errors

### IDE not using the write tool
1. Verify MCP server configuration in your IDE
2. Check that the server is properly connected
3. Look for tool permission settings in your IDE
4. Try restarting the MCP server connection