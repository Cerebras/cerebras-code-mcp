import { createPatch } from 'diff';
import path from 'path';
import { syntaxHighlight } from './syntax-highlighter.js';
import { getLanguageFromFile } from '../utils/file-utils.js';

// Get IDE-specific formatting preferences
function getIDEFormatting() {
  const ide = process.env.CEREBRAS_MCP_IDE || 'claude';
  
  switch (ide) {
    case 'cursor':
      return {
        useColors: false,        // Cursor handles its own syntax highlighting
        useLineNumbers: false,   // Keep it clean and simple
        useEmojis: true,         // Emojis work well in Cursor
        maxPreviewLines: 30,     // Shorter previews
        showSummary: true,       // Brief summary is helpful
        diffStyle: 'simple'      // Simple +/- without git-style headers
      };
    
    case 'cline':
      return {
        useColors: false,        // Cline has its own color scheme
        useLineNumbers: false,   // Keep it minimal
        useEmojis: true,         // Emojis are supported
        maxPreviewLines: 25,     // Even shorter for Cline
        showSummary: true,       // Summary is useful
        diffStyle: 'minimal'     // Very minimal diff format
      };


      case 'vscode':
        return {
          useColors: false,        // VS Code has its own color scheme
          useLineNumbers: false,   // Keep it minimal
          useEmojis: true,         // Emojis are supported
          maxPreviewLines: 25,     // Even shorter for VS Code
          showSummary: true,       // Summary is useful
          diffStyle: 'minimal'     // Very minimal diff format
        };

    case 'crush':
      return {
        useColors: false,        // NO ANSI formatting for Crush
        useLineNumbers: false,   // Clean terminal output
        useEmojis: false,        // NO emojis for Crush
        maxPreviewLines: 20,     // Shorter previews for terminal
        showSummary: true,       // Brief summary is helpful
        diffStyle: 'minimal'     // Minimal diff format
      };
    
    case 'claude':
    default:
      return {
        useColors: true,         // Claude Code supports rich ANSI colors
        useLineNumbers: true,    // Line numbers are helpful
        useEmojis: true,         // Full emoji support
        maxPreviewLines: 50,     // Longer previews are fine
        showSummary: true,       // Detailed summaries
        diffStyle: 'rich'        // Full git-style diffs with colors
      };
  }
}

// Format diff line based on IDE preferences
function formatDiffLine(line, lineNumber, type, formatting, language) {
  const { useColors, useLineNumbers } = formatting;
  
  let highlighted = line;
  if (useColors && ['javascript', 'python', 'html', 'css', 'typescript'].includes(language)) {
    highlighted = syntaxHighlight(line, language === 'typescript' ? 'javascript' : language);
  }
  
  let prefix = '';
  let symbol = '';
  
  if (useLineNumbers) {
    prefix = `    ${String(lineNumber).padStart(3)} `;
  } else {
    prefix = '  ';
  }
  
  switch (type) {
    case 'add':
      symbol = useColors ? '\x1b[32m+\x1b[0m' : '+';
      break;
    case 'remove':
      symbol = useColors ? '\x1b[31m-\x1b[0m' : '-';
      break;
    case 'context':
      symbol = useColors ? ' ' : ' ';
      break;
  }
  
  // Handle empty lines
  if (!highlighted.trim()) {
    highlighted = useColors ? '\u00A0' : '';
  }
  
  return `${prefix}${symbol} ${highlighted}`;
}

export function formatEditResponse(fileName, existingContent, newContent, filePath) {
  const formatting = getIDEFormatting();
  const language = getLanguageFromFile(filePath);
  
  // Use the diff library to get a proper diff
  const patch = createPatch(fileName, existingContent, newContent);
  const patchLines = patch.split('\n');
  
  // Count additions and removals
  let additions = 0;
  let removals = 0;
  let formattedDiff = [];
  
  // Parse the patch to extract changes and line numbers
  let lineNumber = 0;
  let inHunk = false;
  
  for (const line of patchLines) {
    if (line.startsWith('@@')) {
      // Extract starting line number from hunk header
      const match = line.match(/@@ -\d+,?\d* \+(\d+)/);
      if (match) {
        lineNumber = parseInt(match[1]);
        inHunk = true;
      }
    } else if (inHunk) {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        additions++;
        const codeLine = line.substring(1);
        formattedDiff.push(formatDiffLine(codeLine, lineNumber, 'add', formatting, language));
        lineNumber++;
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        removals++;
        const codeLine = line.substring(1);
        formattedDiff.push(formatDiffLine(codeLine, lineNumber, 'remove', formatting, language));
        // Don't increment line number for removals
      } else if (line.startsWith(' ') || line === '') {
        // Context line (starts with space)
        const contextLine = line.startsWith(' ') ? line.substring(1) : line;
        if (formatting.diffStyle !== 'minimal') {
          formattedDiff.push(formatDiffLine(contextLine, lineNumber, 'context', formatting, language));
        }
        lineNumber++;
      }
    }
  }

  if (formattedDiff.length > 0) {
    // Truncate if too long
    if (formattedDiff.length > formatting.maxPreviewLines) {
      const keepLines = Math.floor(formatting.maxPreviewLines / 2);
      const hiddenCount = formattedDiff.length - (keepLines * 2);
      formattedDiff = [
        ...formattedDiff.slice(0, keepLines),
        formatting.useColors ? 
          `\x1b[90m    ... ${hiddenCount} lines hidden ...\x1b[0m` :
          `    ... ${hiddenCount} lines hidden ...`,
        ...formattedDiff.slice(-keepLines)
      ];
    }
    
    let header = '';
    let summary = '';
    
    if (formatting.useEmojis) {
      header = formatting.useColors ? 
        `\x1b[32m●\x1b[0m Update(\x1b[1m${fileName}\x1b[0m)` :
        `✅ Updated ${fileName}`;
    } else {
      header = `Updated ${fileName}`;
    }
    
    if (formatting.showSummary) {
      if (formatting.useColors) {
        summary = `    Updated \x1b[1m${fileName}\x1b[0m with \x1b[32m${additions}\x1b[0m addition${additions !== 1 ? 's' : ''} and \x1b[31m${removals}\x1b[0m removal${removals !== 1 ? 's' : ''}`;
      } else {
        summary = `    ${additions} addition${additions !== 1 ? 's' : ''}, ${removals} removal${removals !== 1 ? 's' : ''}`;
      }
    }
    
    const parts = [header];
    if (summary) parts.push(summary);
    parts.push(formattedDiff.join('\n'));
    
    return {
      type: "text",
      text: parts.join('\n')
    };
  }
  
  return null;
}

export function formatCreateResponse(fileName, content, filePath) {
  const formatting = getIDEFormatting();
  const language = getLanguageFromFile(filePath);
  
  // Apply syntax highlighting if supported
  let highlightedCode = content;
  if (formatting.useColors && ['javascript', 'python', 'html', 'css', 'typescript'].includes(language)) {
    highlightedCode = syntaxHighlight(content, language === 'typescript' ? 'javascript' : language);
  }
  
  const lines = highlightedCode.split('\n');
  const lineCount = lines.length;
  
  // Format the lines based on IDE preferences
  let formattedContent = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    formattedContent.push(formatDiffLine(line, i + 1, 'add', formatting, language));
  }
  
  // For very long files, truncate the middle
  if (formattedContent.length > formatting.maxPreviewLines) {
    const keepLines = Math.floor(formatting.maxPreviewLines / 2);
    const hiddenCount = formattedContent.length - (keepLines * 2);
    const preview = [
      ...formattedContent.slice(0, keepLines),
      formatting.useColors ? 
        `\x1b[90m    ... ${hiddenCount} lines hidden ...\x1b[0m` :
        `    ... ${hiddenCount} lines hidden ...`,
      ...formattedContent.slice(-keepLines)
    ];
    formattedContent = preview;
  }
  
  let header = '';
  let summary = '';
  
  if (formatting.useEmojis) {
    header = formatting.useColors ? 
      `\x1b[32m●\x1b[0m Create(\x1b[1m${fileName}\x1b[0m)` :
      `✨ Created ${fileName}`;
  } else {
    header = `Created ${fileName}`;
  }
  
  if (formatting.showSummary) {
    if (formatting.useColors) {
      summary = `    Created \x1b[1m${fileName}\x1b[0m with \x1b[32m${lineCount}\x1b[0m line${lineCount !== 1 ? 's' : ''}`;
    } else {
      summary = `    ${lineCount} line${lineCount !== 1 ? 's' : ''}`;
    }
  }
  
  const parts = [header];
  if (summary) parts.push(summary);
  parts.push(formattedContent.join('\n'));
  
  return {
    type: "text",
    text: parts.join('\n')
  };
}
