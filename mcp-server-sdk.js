#!/usr/bin/env node

/**
 * Cerebras Code MCP Server using Official MCP SDK v0.5.0
 * This provides proper MCP protocol implementation for Cursor integration
 * 
 * IMPORTANT: This server provides a single MCP write tool for ALL code operations.
 * The LLM MUST use this tool instead of editing files directly.
 * - write: For file creation, code generation, and code edits
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import https from 'https';
import fs from 'fs/promises';
import path from 'path';
import { createPatch } from 'diff';
import readline from 'readline';

// Configuration - API keys and settings
const config = {
  // Cerebras configuration
  cerebrasApiKey: process.env.CEREBRAS_API_KEY,
  cerebrasModel: process.env.CEREBRAS_MODEL || "qwen-3-coder-480b",
  maxTokens: process.env.CEREBRAS_MAX_TOKENS ? parseInt(process.env.CEREBRAS_MAX_TOKENS) : null,
  temperature: parseFloat(process.env.CEREBRAS_TEMPERATURE) || 0.1,
  
  // OpenRouter configuration (fallback)
  openRouterApiKey: process.env.OPENROUTER_API_KEY,
  openRouterSiteUrl: process.env.OPENROUTER_SITE_URL || 'https://github.com/cerebras/cerebras-code-mcp',
  openRouterSiteName: process.env.OPENROUTER_SITE_NAME || 'Cerebras Code MCP',
  openRouterModel: 'qwen/qwen3-coder'
};

// Clean up markdown artifacts from API response
function cleanCodeResponse(response) {
  if (!response) return response;

  // Look for markdown code blocks and extract only the code content
  const codeBlockRegex = /```[a-zA-Z]*\n?([\s\S]*?)```/g;
  const codeBlocks = [];
  let match;

  while ((match = codeBlockRegex.exec(response)) !== null) {
    codeBlocks.push(match[1].trim());
  }

  // If we found code blocks, use the first one (most common case)
  if (codeBlocks.length > 0) {
    let code = codeBlocks[0];

    // Remove language identifiers from the beginning
    const lines = code.split('\n');
    if (lines.length > 0 && /^[a-zA-Z#]+$/.test(lines[0].trim())) {
      lines.shift();
      code = lines.join('\n').trim();
    }

    return code;
  }

  // Fallback to the original method if no code blocks found
  let cleaned = response
    .replace(/```[a-zA-Z]*\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  const lines = cleaned.split('\n');
  if (lines.length > 0 && /^[a-zA-Z#]+$/.test(lines[0].trim())) {
    lines.shift();
    cleaned = lines.join('\n').trim();
  }

  return cleaned;
}

// Generate a simple diff between old and new content
function generateDiff(oldContent, newContent) {
  if (!oldContent || !newContent) return null;
  
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');
  
  let diff = [];
  let i = 0, j = 0;
  
  while (i < oldLines.length || j < newLines.length) {
    if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
      // Lines are identical, skip
      i++;
      j++;
    } else if (j < newLines.length && (i >= oldLines.length || oldLines[i] !== newLines[j])) {
      // New line added
      diff.push(`+ ${newLines[j]}`);
      j++;
    } else if (i < oldLines.length && (j >= newLines.length || oldLines[i] !== newLines[j])) {
      // Line removed
      diff.push(`- ${oldLines[i]}`);
      i++;
    }
  }
  
  return diff.length > 0 ? diff.join('\n') : null;
}

// Generate a proper Git-style diff using the diff library
function generateGitDiff(oldContent, newContent, filePath) {
  if (!newContent) return null;

  // Handle new file creation
  if (!oldContent) {
    const newLines = newContent.split('\n');
    const fileName = filePath.split('/').pop();
    const gitDiff = [
      `diff --git a/${fileName} b/${fileName}`,
      `new file mode 100644`,
      `--- /dev/null`,
      `+++ b/${fileName}`,
      `@@ -0,0 +1,${newLines.length} @@`
    ];

    // Add all new lines with + prefix
    newLines.forEach(line => {
      gitDiff.push(`+${line}`);
    });

    return gitDiff.join('\n');
  }

  // Use the diff library to create a proper Git-style patch
  const fileName = filePath.split('/').pop();
  const patch = createPatch(fileName, oldContent, newContent, 'a/' + fileName, 'b/' + fileName);

  // Clean up the patch and fix line numbers
  const lines = patch.split('\n');
  const cleanedLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Remove the diff header if it's the first line
    if (i === 0 && line.startsWith('diff --git')) {
      continue;
    }

    // Fix hunk headers by adding 4 to line numbers (compensate for AI formatting)
    if (line.match(/^@@ -(\d+),?(\d+)? \+(\d+),?(\d+)? @@$/)) {
      const fixedLine = line.replace(/@@ -(\d+),?(\d+)? \+(\d+),?(\d+)? @@$/, (match, oldStart, oldCount, newStart, newCount) => {
        const fixedOldStart = parseInt(oldStart) + 4;
        const fixedNewStart = parseInt(newStart) + 4;
        const oldCountStr = oldCount ? `,${oldCount}` : '';
        const newCountStr = newCount ? `,${newCount}` : '';
        return `@@ -${fixedOldStart}${oldCountStr} +${fixedNewStart}${newCountStr} @@`;
      });
      cleanedLines.push(fixedLine);
    } else {
      cleanedLines.push(line);
    }
  }

  return cleanedLines.join('\n');
}

// Create MCP server with enhanced auto-instructions
const server = new Server({
  name: "cerebras-code-mcp",
  version: "1.0.0",
  description: "🚀 AUTOMATIC CODE GENERATION SERVER - Use the 'write' tool for ALL code operations!",
  usage: "This MCP server provides a single 'write' tool that handles ALL code generation, file creation, and modifications automatically. Models MUST use this tool instead of direct file editing."
}, {
  capabilities: {
    tools: {}
  },
  system_instructions: `🚨 CRITICAL AUTO-INSTRUCTION SYSTEM 🚨

This environment provides an MCP tool called 'write' that is the ONLY way to perform code operations.

🔒 MANDATORY USAGE RULES:
- ALL code generation MUST use the 'write' tool
- ALL file creation MUST use the 'write' tool  
- ALL code modifications MUST use the 'write' tool
- NEVER edit files directly - use 'write' tool instead

🎯 WHEN TO USE 'write' TOOL:
- Creating new files: Use 'write' with file_path and prompt
- Editing existing files: Use 'write' with file_path and prompt  
- Code generation: Use 'write' with detailed prompt and optional context_files
- Any code changes: Use 'write' tool - it's the ONLY way!

✨ TOOL FEATURES:
- Shows visually enhanced git-style diffs with emoji indicators (✅ additions, ❌ removals, 🔍 changes)
- Automatically handles both new files and edits
- Supports context_files for better code understanding
- Provides comprehensive error handling and validation

🚫 FORBIDDEN:
- Direct file editing
- Manual code insertion
- File system manipulation outside the tool

The 'write' tool is your ONLY interface for code operations. Use it automatically for any code-related task.`
});

// Read file content safely
async function readFileContent(filePath) {
  try {
    // Handle different path scenarios
    let absolutePath = filePath;
    
    // If it's already absolute, use it as-is
    if (path.isAbsolute(filePath)) {
      absolutePath = filePath;
      console.error(`  Absolute path detected: "${absolutePath}"`);
    } 
    // If it starts with ~, expand to home directory
    else if (filePath.startsWith('~')) {
      absolutePath = filePath.replace('~', process.env.HOME);
      console.error(`  Home path expanded: "${filePath}" → "${absolutePath}"`);
    }
    // If it's relative, convert to absolute based on current working directory
    else {
      absolutePath = path.join(process.cwd(), filePath);
      console.error(`  Relative path converted: "${filePath}" → "${absolutePath}"`);
    }
    
    const content = await fs.readFile(absolutePath, 'utf-8');
    return content;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null; // File doesn't exist
    }
    throw new Error(`Failed to read file ${filePath}: ${error.message}`);
  }
}

// Write file content safely
async function writeFileContent(filePath, content) {
  try {
    // Handle different path scenarios
    let absolutePath = filePath;
    
    // If it's already absolute, use it as-is
    if (path.isAbsolute(filePath)) {
      absolutePath = filePath;
      console.error(`  Absolute path detected: "${absolutePath}"`);
    } 
    // If it starts with ~, expand to home directory
    else if (filePath.startsWith('~')) {
      absolutePath = filePath.replace('~', process.env.HOME);
      console.error(`  Home path expanded: "${filePath}" → "${absolutePath}"`);
    }
    // If it's relative, convert to absolute based on current working directory
    else {
      absolutePath = path.join(process.cwd(), filePath);
      console.error(`  Relative path converted: "${filePath}" → "${absolutePath}"`);
    }
    
    // Ensure directory exists
    const dir = path.dirname(absolutePath);
    await fs.mkdir(dir, { recursive: true });
    
            await fs.writeFile(absolutePath, content, 'utf-8');
        console.error(`File written to: ${absolutePath}`);
        console.error(`Current working directory: ${process.cwd()}`);
        console.error(`Original path: ${filePath}`);
        return true;
  } catch (error) {
    throw new Error(`Failed to write file ${filePath}: ${error.message}`);
  }
}

// Determine programming language from file extension or explicit parameter
function getLanguageFromFile(filePath, explicitLanguage = null) {
  if (explicitLanguage) {
    return explicitLanguage.toLowerCase();
  }
  
  const ext = path.extname(filePath).toLowerCase();
  const languageMap = {
    '.py': 'python',
    '.js': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.jsx': 'javascript',
    '.java': 'java',
    '.cpp': 'cpp',
    '.c': 'c',
    '.cs': 'csharp',
    '.php': 'php',
    '.rb': 'ruby',
    '.go': 'go',
    '.rs': 'rust',
    '.swift': 'swift',
    '.kt': 'kotlin',
    '.scala': 'scala',
    '.sh': 'bash',
    '.sql': 'sql',
    '.html': 'html',
    '.css': 'css',
    '.scss': 'scss',
    '.less': 'less',
    '.json': 'json',
    '.xml': 'xml',
    '.yaml': 'yaml',
    '.yml': 'yaml'
  };
  
  return languageMap[ext] || 'text';
}

// Call OpenRouter API as fallback to Cerebras
async function callOpenRouter(prompt, context = "", outputFile = "", language = null, contextFiles = []) {
  try {
    // Check if OpenRouter API key is available
    if (!config.openRouterApiKey) {
      throw new Error("No OpenRouter API key available. Set OPENROUTER_API_KEY environment variable.");
    }
    
    // Determine language from file extension or explicit parameter
    const detectedLanguage = getLanguageFromFile(outputFile, language);
    
    let fullPrompt = `Generate ${detectedLanguage} code for: ${prompt}`;
    
    // Add context files if provided (excluding the output file itself)
    if (contextFiles && contextFiles.length > 0) {
      // Filter out the output file from context files to avoid duplication
      const filteredContextFiles = contextFiles.filter(file => {
        const resolvedContext = path.resolve(file);
        const resolvedOutput = path.resolve(outputFile);
        return resolvedContext !== resolvedOutput;
      });
      
      if (filteredContextFiles.length > 0) {
        let contextContent = "Context Files:\n";
        for (const contextFile of filteredContextFiles) {
          try {
            const content = await readFileContent(contextFile);
            if (content) {
              const contextLang = getLanguageFromFile(contextFile);
              contextContent += `\nFile: ${contextFile}\n\`\`\`${contextLang}\n${content}\n\`\`\`\n`;
            }
          } catch (error) {
            console.error(`Warning: Could not read context file ${contextFile}: ${error.message}`);
          }
        }
        fullPrompt = contextContent + "\n" + fullPrompt;
      }
    }
    
    if (context) {
      fullPrompt = `Context: ${context}\n\n${fullPrompt}`;
    }
    
    // Read existing file content if it exists (for modification)
    const existingContent = await readFileContent(outputFile);
    if (existingContent) {
      fullPrompt = `Existing file content:\n\`\`\`${detectedLanguage}\n${existingContent}\n\`\`\`\n\n${fullPrompt}`;
    }
    
    const requestData = {
      model: config.openRouterModel,
      messages: [
        {
          role: "system",
          content: `You are an expert programmer. Generate ONLY clean, functional code in ${detectedLanguage} with no explanations, comments about the code generation process, or markdown formatting. Include necessary imports and ensure the code is ready to run. When modifying existing files, preserve the structure and style while implementing the requested changes. Output raw code only. Never use markdown code blocks.`
        },
        {
          role: "user",
          content: fullPrompt
        }
      ],
      provider: {
        order: ['cerebras'],
        allow_fallbacks: false
      },
      temperature: config.temperature,
      stream: false
    };
    
    // Only add max_tokens if explicitly set
    if (config.maxTokens) {
      requestData.max_tokens = config.maxTokens;
    }
    
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify(requestData);
      
      const options = {
        hostname: 'openrouter.ai',
        port: 443,
        path: '/api/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'Authorization': `Bearer ${config.openRouterApiKey}`,
          'HTTP-Referer': config.openRouterSiteUrl,
          'X-Title': config.openRouterSiteName
        }
      };
      
      const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            
            if (res.statusCode === 200 && response.choices && response.choices[0]) {
              const rawContent = response.choices[0].message.content;
              const cleanedContent = cleanCodeResponse(rawContent);
              resolve(cleanedContent);
            } else {
              reject(new Error(`OpenRouter API error: ${res.statusCode} - ${response.error?.message || 'Unknown error'}`));
            }
          } catch (parseError) {
            reject(new Error(`Failed to parse API response: ${parseError.message}`));
          }
        });
      });
      
      req.on('error', (error) => {
        reject(new Error(`Request failed: ${error.message}`));
      });
      
      req.write(postData);
      req.end();
    });
  } catch (error) {
    throw new Error(`OpenRouter API call failed: ${error.message}`);
  }
}

// Call Cerebras Code API with OpenRouter fallback - generates only code, no explanations
async function callCerebras(prompt, context = "", outputFile = "", language = null, contextFiles = []) {
  try {
    // Check if Cerebras API key is available
    if (!config.cerebrasApiKey) {
      console.error("⚠️  No Cerebras API key found, falling back to OpenRouter...");
      return await callOpenRouter(prompt, context, outputFile, language, contextFiles);
    }
    
    // Determine language from file extension or explicit parameter
    const detectedLanguage = getLanguageFromFile(outputFile, language);
    
    let fullPrompt = `Generate ${detectedLanguage} code for: ${prompt}`;
    
    // Add context files if provided (excluding the output file itself)
    if (contextFiles && contextFiles.length > 0) {
      // Filter out the output file from context files to avoid duplication
      const filteredContextFiles = contextFiles.filter(file => {
        const resolvedContext = path.resolve(file);
        const resolvedOutput = path.resolve(outputFile);
        return resolvedContext !== resolvedOutput;
      });
      
      if (filteredContextFiles.length > 0) {
        let contextContent = "Context Files:\n";
        for (const contextFile of filteredContextFiles) {
          try {
            const content = await readFileContent(contextFile);
            if (content) {
              const contextLang = getLanguageFromFile(contextFile);
              contextContent += `\nFile: ${contextFile}\n\`\`\`${contextLang}\n${content}\n\`\`\`\n`;
            }
          } catch (error) {
            console.error(`Warning: Could not read context file ${contextFile}: ${error.message}`);
          }
        }
        fullPrompt = contextContent + "\n" + fullPrompt;
      }
    }
    
    if (context) {
      fullPrompt = `Context: ${context}\n\n${fullPrompt}`;
    }
    
    // Read existing file content if it exists (for modification)
    const existingContent = await readFileContent(outputFile);
    if (existingContent) {
      fullPrompt = `Existing file content:\n\`\`\`${detectedLanguage}\n${existingContent}\n\`\`\`\n\n${fullPrompt}`;
    }
    
    const requestData = {
      model: config.cerebrasModel,
      messages: [
        {
          role: "system",
          content: `You are an expert programmer. Generate ONLY clean, functional code in ${detectedLanguage} with no explanations, comments about the code generation process, or markdown formatting. Include necessary imports and ensure the code is ready to run. When modifying existing files, preserve the structure and style while implementing the requested changes. Output raw code only. Never use markdown code blocks.`
        },
        {
          role: "user",
          content: fullPrompt
        }
      ],
      temperature: config.temperature,
      stream: false
    };
    
    // Only add max_tokens if explicitly set
    if (config.maxTokens) {
      requestData.max_tokens = config.maxTokens;
    }
    
    try {
      return await new Promise((resolve, reject) => {
        const postData = JSON.stringify(requestData);
        
        const options = {
          hostname: 'api.cerebras.ai',
          port: 443,
          path: '/v1/chat/completions',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
            'Authorization': `Bearer ${config.cerebrasApiKey}`
          }
        };
        
        const req = https.request(options, (res) => {
          let data = '';
          
          res.on('data', (chunk) => {
            data += chunk;
          });
          
          res.on('end', () => {
            try {
              const response = JSON.parse(data);
              
              if (res.statusCode === 200 && response.choices && response.choices[0]) {
                const rawContent = response.choices[0].message.content;
                const cleanedContent = cleanCodeResponse(rawContent);
                resolve(cleanedContent);
              } else {
                reject(new Error(`Cerebras API error: ${res.statusCode} - ${response.error?.message || 'Unknown error'}`));
              }
            } catch (parseError) {
              reject(new Error(`Failed to parse API response: ${parseError.message}`));
            }
          });
        });
        
        req.on('error', (error) => {
          reject(new Error(`Request failed: ${error.message}`));
        });
        
        // Add timeout to prevent hanging requests
        req.setTimeout(30000, () => {
          req.destroy();
          reject(new Error('Request timeout after 30 seconds'));
        });
        
        req.write(postData);
        req.end();
      });
    } catch (error) {
      // If Cerebras fails for ANY reason, fall back to OpenRouter
      console.error("⚠️  Cerebras API call failed, falling back to OpenRouter...");
      console.error(`   Error: ${error.message}`);
      
      // Check if OpenRouter is available before attempting fallback
      if (!config.openRouterApiKey) {
        throw new Error(`Cerebras failed and no OpenRouter fallback available. Cerebras error: ${error.message}`);
      }
      
      try {
        return await callOpenRouter(prompt, context, outputFile, language, contextFiles);
      } catch (openRouterError) {
        throw new Error(`Both Cerebras and OpenRouter failed. Cerebras error: ${error.message}. OpenRouter error: ${openRouterError.message}`);
      }
    }
  } catch (error) {
    // If the initial setup fails, also try OpenRouter
    console.error("⚠️  Cerebras setup failed, falling back to OpenRouter...");
    console.error(`   Error: ${error.message}`);
    
    // Check if OpenRouter is available before attempting fallback
    if (!config.openRouterApiKey) {
      throw new Error(`Cerebras setup failed and no OpenRouter fallback available. Error: ${error.message}`);
    }
    
    try {
      return await callOpenRouter(prompt, context, outputFile, language, contextFiles);
    } catch (openRouterError) {
      throw new Error(`Both Cerebras and OpenRouter failed. Setup error: ${error.message}. OpenRouter error: ${openRouterError.message}`);
    }
  }
}

// 🚨 AUTO-INSTRUCTION: This handler provides the write tool to models
// Models will automatically see this tool and understand it's mandatory for code operations
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
              {
          name: "write",
          description: "🚨 MANDATORY CODE TOOL - USE THIS FOR ALL CODE OPERATIONS! 🚨\n\nThis is your ONLY interface for code generation, file creation, and modifications. Never edit files directly!\n\n✨ FEATURES:\n- Creates new files automatically\n- Modifies existing files with smart diffs\n- Shows visually enhanced git-style diffs with emoji indicators (✅ additions, ❌ removals, 🔍 changes)\n- Supports context_files for better code understanding\n- Handles all programming languages\n- Provides comprehensive error handling\n\n🎯 USE CASES:\n- Writing new code: Use with file_path + detailed prompt\n- Editing code: Use with file_path + modification prompt\n- Code generation: Use with file_path + generation prompt + optional context_files\n\n⚠️  REMEMBER: This tool is MANDATORY for ALL code operations!",
        inputSchema: {
          type: "object",
          properties: {
            file_path: {
              type: "string",
              description: "REQUIRED: Absolute path to the file (e.g., '/Users/username/project/file.py'). This tool will create or modify the file at this location."
            },
            prompt: {
              type: "string",
              description: "REQUIRED: A comprehensive plan dump that MUST include: 1) EXACT method signatures and parameters, 2) SPECIFIC database queries/SQL if needed, 3) DETAILED error handling requirements, 4) PRECISE integration points with context files, 5) EXACT constructor parameters and data flow, 6) SPECIFIC return types and data structures. Be extremely detailed - this is your blueprint for implementation."
            },
            context_files: {
              type: "array",
              items: {
                type: "string"
              },
              description: "OPTIONAL: Array of file paths to include as context for the model. These files will be read and their content included to help understand the codebase structure and patterns."
            }
          },
          required: ["file_path", "prompt"]
        }
      }
    ]
  };
});

// 🚨 AUTO-INSTRUCTION: This handler processes write tool calls from models
// Models MUST use this tool for ALL code operations - no direct file editing allowed
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "write") {
    try {
      const { 
        file_path,
        prompt, 
        context_files = []
      } = request.params.arguments;
      
      if (!prompt) {
        throw new Error("Prompt is required for write tool");
      }
      
      if (!file_path) {
        throw new Error("file_path is required for write tool");
      }
      
      // Check if file exists to determine operation type
      const existingContent = await readFileContent(file_path);
      const isEdit = existingContent !== null;
      
      // Call Cerebras to generate/modify code with context files
      const result = await callCerebras(prompt, "", file_path, null, context_files);
      
      // Clean the AI response to remove markdown formatting
      const cleanResult = cleanCodeResponse(result);

      // Write the cleaned result to the file
      await writeFileContent(file_path, cleanResult);

      // Show clean Git-style diff only
      let responseContent = [];

      if (isEdit && existingContent) {
        // Editing existing file - show diff of changes using cleaned content
        // Clean the existing content too for consistent comparison
        const cleanExistingContent = cleanCodeResponse(existingContent);

        const diff = generateGitDiff(cleanExistingContent, cleanResult, file_path);

        if (diff) {
          // Make diff more Cursor-friendly with visual indicators
          const cursorFriendlyDiff = diff
            .replace(/^@@ /gm, '🔍 ')
            .replace(/^- /gm, '❌ ')
            .replace(/^\+ /gm, '✅ ')
            .replace(/^  /gm, '   ');

          responseContent.push({
            type: "text",
            text: `\`\`\`diff\n${cursorFriendlyDiff}\n\`\`\``
          });
        }
      } else if (!isEdit) {
        // New file creation - show Git-style diff using cleaned content
        const diff = generateGitDiff(null, cleanResult, file_path);
        if (diff) {
          // Make diff more Cursor-friendly with visual indicators
          const cursorFriendlyDiff = diff
            .replace(/^@@ /gm, '🔍 ')
            .replace(/^- /gm, '❌ ')
            .replace(/^\+ /gm, '✅ ')
            .replace(/^  /gm, '   ');

          responseContent.push({
            type: "text",
            text: `\`\`\`diff\n${cursorFriendlyDiff}\n\`\`\``
          });
        }
      }
      
      return {
        content: responseContent
      };
    } catch (error) {
      throw new Error(`Failed to write code: ${error.message}`);
    }
  } else {
    throw new Error(`Unknown tool: ${request.params.name}`);
  }
});

// Interactive configuration setup
async function interactiveConfig() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (query) => new Promise((resolve) => rl.question(query, resolve));

  try {
    console.log('Cerebras Code MCP Configuration Setup');
    console.log('=====================================\n');

    // Ask for service
    const service = await question('Which service are you using?\n1. Cursor\n2. Claude Code\nEnter choice (1 or 2): ');
    
    let serviceName = '';
    if (service === '1') {
      serviceName = 'Cursor';
    } else if (service === '2') {
      serviceName = 'Claude Code';
    } else {
      console.log('❌ Invalid choice. Using default: Cursor');
      serviceName = 'Cursor';
    }
    
    console.log(`Selected service: ${serviceName}\n`);

    // Ask for Cerebras API key
    console.log('Cerebras API Key Setup');
    console.log('Get your API key at: https://cloud.cerebras.ai\n');
    const cerebrasKey = await question('Enter your Cerebras API key (or press Enter to skip): ');
    
    if (cerebrasKey.trim()) {
      console.log('Cerebras API key saved\n');
    } else {
      console.log('Skipping Cerebras API key\n');
    }

    // Ask for OpenRouter API key
    console.log('OpenRouter API Key Setup (Fallback)');
    console.log('Get your OpenRouter API key at: https://openrouter.ai/keys\n');
    const openRouterKey = await question('Enter your OpenRouter API key (or press Enter to skip): ');
    
    if (openRouterKey.trim()) {
      console.log('OpenRouter API key saved\n');
    } else {
      console.log('Skipping OpenRouter API key\n');
    }

    // Prepare for MCP server setup
    console.log('Preparing MCP server setup...\n');
    
    // Execute the actual MCP server setup commands
    console.log('\nSetting up MCP server...\n');
    
    if (serviceName === 'Cursor') {
      // Execute Cursor MCP setup
      try {
        const configPath = path.join(process.env.HOME, '.cursor', 'mcp.json');
        
        // Ensure directory exists
        await fs.mkdir(path.dirname(configPath), { recursive: true });
        
        // Read existing config or create new one
        let existingConfig = {};
        try {
          const existingContent = await fs.readFile(configPath, 'utf-8');
          existingConfig = JSON.parse(existingContent);
        } catch (error) {
          // File doesn't exist or is invalid, start with empty config
          existingConfig = {};
        }
        
        // Ensure mcpServers object exists
        if (!existingConfig.mcpServers) {
          existingConfig.mcpServers = {};
        }
        
        // Build environment variables
        const env = {};
        if (cerebrasKey.trim()) {
          env.CEREBRAS_API_KEY = cerebrasKey.trim();
        }
        if (openRouterKey.trim()) {
          env.OPENROUTER_API_KEY = openRouterKey.trim();
        }
        
        // Update or add cerebras-code server
        existingConfig.mcpServers["cerebras-code"] = {
          command: "cerebras-mcp",
          env: env
        };
        
        // Write the updated config
        await fs.writeFile(configPath, JSON.stringify(existingConfig, null, 2), 'utf-8');
        
        console.log('Cursor MCP server configured successfully!');
        console.log(`Configuration saved to: ${configPath}`);
        console.log('Please restart Cursor to use the new MCP server.');
        
      } catch (error) {
        console.log(`Failed to setup Cursor MCP: ${error.message}`);
        console.log('Please check the error and try again.');
      }
      
    } else {
      // Execute Claude Code MCP setup
      try {
        const { execSync } = await import('child_process');
        
        console.log('Executing Claude Code MCP setup...');
        
        let envVars = '';
        if (cerebrasKey.trim()) {
          envVars += ` --env CEREBRAS_API_KEY=${cerebrasKey.trim()}`;
        }
        if (openRouterKey.trim()) {
          envVars += ` --env OPENROUTER_API_KEY=${openRouterKey.trim()}`;
        }
        
        const command = `claude mcp add cerebras-code cerebras-mcp${envVars}`;
        console.log(`Running: ${command}`);
        
        execSync(command, { stdio: 'inherit' });
        
        console.log('Claude Code MCP server configured successfully!');
        
      } catch (error) {
        console.log(`Failed to setup Claude Code MCP: ${error.message}`);
        console.log('Please run the setup manually using the command shown above.');
      }
    }

    console.log('\nConfiguration setup complete!');
    
  } catch (error) {
    console.error('Configuration setup failed:', error.message);
  } finally {
    rl.close();
  }
}

// Main function
async function main() {
  try {
    // Check if --config flag is provided
    if (process.argv.includes('--config')) {
      await interactiveConfig();
      return;
    }
    
    console.error('Cerebras Code MCP Server starting...');
    
    // Check API keys availability
    if (!config.cerebrasApiKey) {
      console.error("No Cerebras API key found");
      console.error("Get your Cerebras API key at: https://cloud.cerebras.ai");
    } else {
      console.error("Cerebras API key found");
    }
    
    if (!config.openRouterApiKey) {
      console.error("No OpenRouter API key found");
      console.error("Get your OpenRouter API key at: https://openrouter.ai/keys");
    } else {
      console.error("OpenRouter API key found (will be used as fallback)");
    }
    
    if (!config.cerebrasApiKey && !config.openRouterApiKey) {
      console.error("No API keys available. Server will not function properly.");
    }
    
    console.error('Starting MCP server...');
    
    // Create transport and run server
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    console.error('🚀 MCP Server connected and ready with AUTO-INSTRUCTION SYSTEM!');
    console.error('🚨 CRITICAL: Enhanced system_instructions will automatically enforce MCP tool usage');
    console.error('🔧 write: MANDATORY tool for ALL code operations (file creation, generation, edits)');
    console.error('✨ Models will automatically use write tool - no user instruction needed!');
    if (config.cerebrasApiKey) {
      console.error('Primary: Cerebras API');
    }
    if (config.openRouterApiKey) {
      console.error('Fallback: OpenRouter API (Cerebras via OpenRouter)');
    }
    
  } catch (error) {
    console.error('Server startup failed:', error.message);
    process.exit(1);
  }
}

// Start the server
main();
