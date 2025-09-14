# Security Policy

## Reporting Security Issues

The Cerebras MCP project takes security seriously. If you discover a security vulnerability in the `cerebras-code-mcp` package, please report it responsibly.

### How to Report

To report a security issue, please:

1. **Do NOT** create a public GitHub issue
2. Email us at: **security@cerebras.net**
3. Include the following information:
   - Description of the vulnerability
   - Steps to reproduce the issue
   - Potential impact assessment
   - Any suggested fixes (if available)

### What We Protect

This MCP server handles:
- API keys for Cerebras and OpenRouter services
- File system operations through the `write` tool
- IDE configuration files and settings
- Environment variables and system paths

### Security Considerations

- **API Keys**: Store securely in environment variables, never in code
- **File Operations**: The `write` tool operates with user permissions
- **IDE Integration**: Configuration files are created in standard IDE locations
- **Network Requests**: All API calls use HTTPS encryption

## Responsible Disclosure

We appreciate security researchers who help keep our users safe. When reporting vulnerabilities:

- Allow reasonable time for investigation and patching
- Avoid accessing or modifying user data beyond what's necessary to demonstrate the issue
- Do not perform actions that could harm users or degrade service quality

## Response Timeline

- **Initial Response**: Within 48 hours of report
- **Status Updates**: Weekly updates on investigation progress
- **Resolution**: Security fixes will be prioritized and released as soon as possible

## Supported Versions

Security updates are provided for:
- Latest stable release
- Previous major version (if applicable)

Please keep your installation up to date by running:
```bash
npm update -g cerebras-code-mcp
```