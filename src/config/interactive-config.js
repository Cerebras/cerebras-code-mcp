import readline from 'readline';
import fs from 'fs/promises';
import path from 'path';
import { getClineRulesPath, CEREBRAS_MCP_RULES } from './constants.js';

// Input validation functions
function validateMenuChoice(choice, maxOption) {
  const num = parseInt(choice);
  return !isNaN(num) && num >= 1 && num <= maxOption;
}

function validateApiKey(key) {
  if (!key || typeof key !== 'string') return false;
  const trimmed = key.trim();
  return trimmed.length > 0 && trimmed.length < 500; // Reasonable length limits
}

function sanitizeForShell(input) {
  if (!input || typeof input !== 'string') return '';
  // Remove potentially dangerous characters for shell commands
  return input.replace(/[;&|`$(){}[\]\\]/g, '');
}

// Removal/cleanup handler
async function handleRemoval(question) {
  console.log('\nCerebras MCP Removal/Cleanup');
  console.log('============================\n');
  
  const removeChoice = await question('What would you like to remove?\n1. Claude Code setup\n2. Cursor setup\n3. Cline setup\n4. VS Code (Copilot) setup\n5. Crush (Terminal AI) setup\n6. All setups (complete cleanup)\nEnter choice (1, 2, 3, 4, 5, or 6): ');
  
  switch (removeChoice) {
    case '1':
      await removeClaudeSetup();
      break;
    case '2':
      await removeCursorSetup();
      break;
    case '3':
      await removeClineSetup();
      break;
    case '4':
      await removeVSCodeSetup();
      break;
    case '5':
      await removeCrushSetup();
      break;
    case '6':
      await removeAllSetups();
      break;
    default:
      console.log('❌ Invalid choice. Exiting...');
      return;
  }
}

// Remove Claude Code setup
async function removeClaudeSetup() {
  try {
    console.log('\n🧹 Removing Claude Code setup...');
    
    const { execSync } = await import('child_process');
    
    // Remove MCP servers (both old and new names)
    try {
      execSync('claude mcp remove cerebras-mcp', { stdio: 'inherit' });
      console.log('✅ Removed cerebras-mcp from Claude MCP servers');
    } catch (error) {
      console.log('ℹ️  cerebras-mcp was not found in Claude MCP servers (already removed or never installed)');
    }
    
    // Also remove old cerebras-code server if it exists
    try {
      execSync('claude mcp remove cerebras-code', { stdio: 'inherit' });
      console.log('✅ Removed old cerebras-code from Claude MCP servers');
    } catch (error) {
      console.log('ℹ️  Old cerebras-code server not found (already removed or never installed)');
    }
    
    // Remove from Claude rules file
    try {
      const claudeRulesPath = path.join(process.env.HOME, '.claude', 'CLAUDE.md');
      let existingContent = '';
      
      try {
        existingContent = await fs.readFile(claudeRulesPath, 'utf-8');
      } catch (readError) {
        console.log('ℹ️  No Claude rules file found');
        return;
      }
      
      // Remove our rules from the file
      const updatedContent = existingContent.replace(CEREBRAS_MCP_RULES.comment, '').replace(/\n\n\n+/g, '\n\n').trim();
      
      if (updatedContent !== existingContent) {
        if (updatedContent.length > 0) {
          await fs.writeFile(claudeRulesPath, updatedContent, 'utf-8');
          console.log('✅ Removed cerebras-mcp rules from Claude rules file');
        } else {
          await fs.unlink(claudeRulesPath);
          console.log('✅ Removed empty Claude rules file');
        }
      } else {
        console.log('ℹ️  No cerebras-mcp rules found in Claude rules file');
      }
    } catch (error) {
      console.log(`⚠️  Could not clean up Claude rules file: ${error.message}`);
    }
    
    console.log('\n✅ Claude Code cleanup completed!');
  } catch (error) {
    console.log(`❌ Failed to remove Claude setup: ${error.message}`);
  }
}

// Remove Cursor setup
async function removeCursorSetup() {
  try {
    console.log('\n🧹 Removing Cursor setup...');
    
    const homeDirectory = process.platform === 'win32' ? process.env.USERPROFILE : process.env.HOME;
    const configPath = path.join(homeDirectory, '.cursor', 'mcp.json');
    
    try {
      const existingContent = await fs.readFile(configPath, 'utf-8');
      const existingConfig = JSON.parse(existingContent);
      
      let hasChanges = false;
      
      // Remove cerebras-mcp server
      if (existingConfig.mcpServers && existingConfig.mcpServers['cerebras-mcp']) {
        delete existingConfig.mcpServers['cerebras-mcp'];
        hasChanges = true;
      }
      
      // Also remove old cerebras-code server if it exists
      if (existingConfig.mcpServers && existingConfig.mcpServers['cerebras-code']) {
        delete existingConfig.mcpServers['cerebras-code'];
        hasChanges = true;
      }
      
      if (hasChanges) {
        // If no other servers, remove the whole mcpServers object
        if (Object.keys(existingConfig.mcpServers).length === 0) {
          delete existingConfig.mcpServers;
        }
        
        // If config is now empty, remove the file
        if (Object.keys(existingConfig).length === 0) {
          await fs.unlink(configPath);
          console.log('✅ Removed empty Cursor MCP configuration file');
        } else {
          await fs.writeFile(configPath, JSON.stringify(existingConfig, null, 2), 'utf-8');
          console.log('✅ Removed cerebras-mcp and old cerebras-code from Cursor MCP configuration');
        }
      } else {
        console.log('ℹ️  No cerebras servers found in Cursor configuration');
      }
    } catch (error) {
      console.log('ℹ️  No Cursor MCP configuration found (already removed or never configured)');
    }
    
    console.log('\n✅ Cursor cleanup completed!');
    console.log('📝 Don\'t forget to remove the cerebras-mcp rule from Cursor User Rules manually');
  } catch (error) {
    console.log(`❌ Failed to remove Cursor setup: ${error.message}`);
  }
}

// Remove Cline setup
async function removeClineSetup() {
  try {
    console.log('\n🧹 Removing Cline setup...');
    
    // Remove Cline rules file
    const clineRulesPath = getClineRulesPath();
    const rulesFilePath = path.join(clineRulesPath, 'cerebras-mcp-rules.md');
    
    try {
      await fs.unlink(rulesFilePath);
      console.log('✅ Removed Cline rules file');
    } catch (error) {
      console.log('ℹ️  Cline rules file not found (already removed or never created)');
    }
    
    // Remove from Cline MCP configuration
    const homeDirectory = process.platform === 'win32' ? process.env.USERPROFILE : process.env.HOME;
    let clineConfigPath;
    
    if (process.platform === 'win32') {
      clineConfigPath = path.join(homeDirectory, 'AppData', 'Roaming', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'settings', 'cline_mcp_settings.json');
    } else {
      clineConfigPath = path.join(homeDirectory, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'settings', 'cline_mcp_settings.json');
    }
    
    try {
      const existingContent = await fs.readFile(clineConfigPath, 'utf-8');
      const existingConfig = JSON.parse(existingContent);
      
      let hasChanges = false;
      
      // Remove cerebras-mcp server
      if (existingConfig.mcpServers && existingConfig.mcpServers['cerebras-mcp']) {
        delete existingConfig.mcpServers['cerebras-mcp'];
        hasChanges = true;
      }
      
      // Also remove old cerebras-code server if it exists
      if (existingConfig.mcpServers && existingConfig.mcpServers['cerebras-code']) {
        delete existingConfig.mcpServers['cerebras-code'];
        hasChanges = true;
      }
      
      if (hasChanges) {
        // If no other servers, remove the whole mcpServers object
        if (Object.keys(existingConfig.mcpServers).length === 0) {
          delete existingConfig.mcpServers;
        }
        
        // If config is now empty, remove the file
        if (Object.keys(existingConfig).length === 0) {
          await fs.unlink(clineConfigPath);
          console.log('✅ Removed empty Cline MCP configuration file');
        } else {
          await fs.writeFile(clineConfigPath, JSON.stringify(existingConfig, null, 2), 'utf-8');
          console.log('✅ Removed cerebras-mcp and old cerebras-code from Cline MCP configuration');
        }
      } else {
        console.log('ℹ️  No cerebras servers found in Cline configuration');
      }
    } catch (error) {
      console.log('ℹ️  No Cline MCP configuration found (already removed or never configured)');
    }
    
    console.log('\n✅ Cline cleanup completed!');
  } catch (error) {
    console.log(`❌ Failed to remove Cline setup: ${error.message}`);
  }
}

// Remove VS Code setup
async function removeVSCodeSetup() {
  try {
    console.log('\n🧹 Removing VS Code setup...');
    
     const homeDirectory = process.platform === 'win32' ? process.env.USERPROFILE : process.env.HOME;
     let vscodeMcpPath, vscodeInstructionsPath;
     if (process.platform === 'win32') {
       vscodeMcpPath = path.join(process.env.APPDATA, 'Code', 'User', 'mcp.json');
       vscodeInstructionsPath = path.join(process.env.APPDATA, 'Code', 'User', 'instructions', 'cerebras-mcp.instructions.md');
     } else if (process.platform === 'darwin') {
       vscodeMcpPath = path.join(homeDirectory, 'Library', 'Application Support', 'Code', 'User', 'mcp.json');
       vscodeInstructionsPath = path.join(homeDirectory, 'Library', 'Application Support', 'Code', 'User', 'instructions', 'cerebras-mcp.instructions.md');
     } else {
       vscodeMcpPath = path.join(homeDirectory, '.config', 'Code', 'User', 'mcp.json');
       vscodeInstructionsPath = path.join(homeDirectory, '.config', 'Code', 'User', 'instructions', 'cerebras-mcp.instructions.md');
     }
     
     // Note: We don't create universal instructions files for VS Code since there's no official support
     
     // Remove from VS Code MCP configuration
     try {
       const existingContent = await fs.readFile(vscodeMcpPath, 'utf-8');
       const existingMcpConfig = JSON.parse(existingContent);
       
       let hasChanges = false;
       
       // Remove cerebras-mcp server
       if (existingMcpConfig.servers && existingMcpConfig.servers['cerebras-mcp']) {
         delete existingMcpConfig.servers['cerebras-mcp'];
         hasChanges = true;
       }
       
       // Also remove old cerebras-code server if it exists
       if (existingMcpConfig.servers && existingMcpConfig.servers['cerebras-code']) {
         delete existingMcpConfig.servers['cerebras-code'];
         hasChanges = true;
       }
       
       if (hasChanges) {
         // If no other MCP servers, remove the whole file
         if (existingMcpConfig.servers && Object.keys(existingMcpConfig.servers).length === 0) {
           await fs.unlink(vscodeMcpPath);
           console.log('✅ Removed empty VS Code MCP configuration file');
         } else {
           await fs.writeFile(vscodeMcpPath, JSON.stringify(existingMcpConfig, null, 2), 'utf-8');
           console.log('✅ Removed cerebras-mcp and old cerebras-code from VS Code MCP config');
         }
       } else {
         console.log('ℹ️  No cerebras servers found in VS Code MCP config');
       }
     } catch (error) {
       console.log('ℹ️  No VS Code MCP configuration found (already removed or never configured)');
     }
     
     // Note: We don't create workspace instructions for VS Code since there's no official support
    
    console.log('\n✅ VS Code cleanup completed!');
  } catch (error) {
    console.log(`❌ Failed to remove VS Code setup: ${error.message}`);
  }
}

// Remove Crush setup
async function removeCrushSetup() {
  try {
    console.log('\n🧹 Removing Crush setup...');
    
    const homeDirectory = process.platform === 'win32' ? process.env.USERPROFILE : process.env.HOME;
    let crushConfigPath;
    
    if (process.platform === 'win32') {
      crushConfigPath = path.join(homeDirectory, 'AppData', 'Local', 'crush', 'crush.json');
    } else {
      crushConfigPath = path.join(homeDirectory, '.config', 'crush', 'crush.json');
    }
    
    // Remove from Crush MCP configuration
    try {
      const existingContent = await fs.readFile(crushConfigPath, 'utf-8');
      const existingConfig = JSON.parse(existingContent);
      
      let removed = false;
      
      // Remove cerebras-mcp and old cerebras-code servers
      if (existingConfig.mcp) {
        if (existingConfig.mcp['cerebras-mcp']) {
          delete existingConfig.mcp['cerebras-mcp'];
          removed = true;
        }
        if (existingConfig.mcp['cerebras-code']) {
          delete existingConfig.mcp['cerebras-code'];
          removed = true;
        }
        
        // If no more MCP servers, remove the mcp section
        if (Object.keys(existingConfig.mcp).length === 0) {
          delete existingConfig.mcp;
        }
      }
      
      // Remove tool permissions if they were set for cerebras
      if (existingConfig.permissions && existingConfig.permissions.allowed_tools) {
        // Only remove if it was set to wildcard (our configuration)
        if (JSON.stringify(existingConfig.permissions.allowed_tools) === JSON.stringify(['*'])) {
          delete existingConfig.permissions;
          removed = true;
        }
      }
      
      if (removed) {
        // If config is now empty, remove the file
        if (Object.keys(existingConfig).length === 0) {
          await fs.unlink(crushConfigPath);
          console.log('✅ Removed empty Crush configuration file');
        } else {
          await fs.writeFile(crushConfigPath, JSON.stringify(existingConfig, null, 2), 'utf-8');
          console.log('✅ Removed cerebras-mcp and old cerebras-code from Crush configuration');
        }
      } else {
        console.log('ℹ️  No cerebras servers found in Crush configuration');
      }
    } catch (error) {
      console.log('ℹ️  No Crush configuration found (already removed or never configured)');
    }
    
    console.log('\n✅ Crush cleanup completed!');
  } catch (error) {
    console.log(`❌ Failed to remove Crush setup: ${error.message}`);
  }
}

// Remove all setups
async function removeAllSetups() {
  console.log('\n🧹 Removing ALL cerebras-mcp setups...');
  console.log('This will clean up Claude Code, Cursor, Cline, VS Code, and Crush configurations.\n');
  
  await removeClaudeSetup();
  await removeCursorSetup();
  await removeClineSetup();
  await removeVSCodeSetup();
  await removeCrushSetup();
  
  console.log('\n🎉 Complete cleanup finished!');
  console.log('All cerebras-mcp configurations have been removed from all IDEs.');
}

// Separate removal wizard
export async function removalWizard() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (query) => new Promise((resolve) => rl.question(query, resolve));

  try {
    console.log('Cerebras MCP Removal/Cleanup Wizard');
    console.log('===================================\n');
    
    await handleRemoval(question);
    
  } catch (error) {
    console.error('Removal wizard failed:', error.message);
  } finally {
    rl.close();
  }
}

// Interactive configuration setup
export async function interactiveConfig() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (query) => new Promise((resolve) => rl.question(query, resolve));

  const questionPassword = (query) => new Promise((resolve) => {
    process.stdout.write(query);
    
    let password = '';
    const stdin = process.stdin;
    
    // Store original state
    const wasRaw = stdin.isRaw;
    const listeners = stdin.listeners('data');
    
    // Remove existing listeners temporarily
    listeners.forEach(listener => stdin.removeListener('data', listener));
    
    // Set up password input
    if (stdin.isTTY) {
      stdin.setRawMode(true);
    }
    
    const cleanup = () => {
      if (stdin.isTTY) {
        stdin.setRawMode(wasRaw);
      }
      stdin.removeListener('data', onData);
      // Restore original listeners
      listeners.forEach(listener => stdin.addListener('data', listener));
    };
    
    const onData = (data) => {
      const str = data.toString();
      
      for (let i = 0; i < str.length; i++) {
        const char = str[i];
        const code = str.charCodeAt(i);
        
        if (code === 13 || code === 10) { // Enter
          cleanup();
          process.stdout.write('\n');
          resolve(password);
          return;
        } else if (code === 3) { // Ctrl+C
          cleanup();
          process.stdout.write('\n');
          process.exit(0);
        } else if (code === 8 || code === 127) { // Backspace
          if (password.length > 0) {
            password = password.slice(0, -1);
          }
        } else if (code >= 32 && code < 127) { // Printable characters
          password += char;
        }
        // All other characters are ignored (no echo)
      }
    };
    
    stdin.on('data', onData);
  });

  try {
    console.log('Cerebras Code MCP Configuration Setup');
    console.log('=====================================\n');

    // Ask for service
    const service = await question('Which service are you using?\n1. Claude Code\n2. Cursor\n3. Cline\n4. VS Code\n5. Crush (Terminal AI)\nEnter choice (1, 2, 3, 4, or 5): ');
    
    if (!validateMenuChoice(service, 5)) {
      console.log('❌ Invalid choice. Please enter 1, 2, 3, 4, or 5.');
      return;
    }
    
    let serviceName = '';
    if (service === '1') {
      serviceName = 'Claude Code';
    } else if (service === '2') {
      serviceName = 'Cursor';
    } else if (service === '3') {
      serviceName = 'Cline';
    } else if (service === '4') {
      serviceName = 'VS Code';
    } else if (service === '5') {
      serviceName = 'Crush';
    } else {
      console.log('❌ Invalid choice. Using default: Claude Code');
      serviceName = 'Claude Code';
    }
    
    console.log(`Selected service: ${serviceName}\n`);

    // Ask for Cerebras API key
    console.log('Cerebras API Key Setup');
    console.log('Get your API key at: https://cloud.cerebras.ai');
    const cerebrasKey = await questionPassword('Enter your Cerebras API key (or press Enter to skip): ');
    
    if (cerebrasKey.trim()) {
      console.log('Cerebras API key saved\n');
    } else {
      console.log('Skipping Cerebras API key\n');
    }

    // Ask for OpenRouter API key
    console.log('OpenRouter API Key Setup (Fallback)');
    console.log('Get your OpenRouter API key at: https://openrouter.ai/keys');
    const openRouterKey = await questionPassword('Enter your OpenRouter API key (or press Enter to skip): ');
    
    if (openRouterKey.trim()) {
      console.log('OpenRouter API key saved\n');
    } else {
      console.log('Skipping OpenRouter API key\n');
    }
    
    // Validate API keys
    if (!cerebrasKey.trim() && !openRouterKey.trim()) {
      console.log('❌ At least one API key is required. Please run the setup again.');
      return;
    }
    
    if (cerebrasKey.trim() && !validateApiKey(cerebrasKey)) {
      console.log('❌ Invalid Cerebras API key format. Please check and try again.');
      return;
    }
    
    if (openRouterKey.trim() && !validateApiKey(openRouterKey)) {
      console.log('❌ Invalid OpenRouter API key format. Please check and try again.');
      return;
    }
    
    if (cerebrasKey.trim() && !cerebrasKey.trim().startsWith('csk-')) {
      console.log('⚠️  Warning: Cerebras API keys typically start with "csk-"');
      console.log('   Please verify your API key is correct.');
    }
    
    if (serviceName === 'Cursor') {
      // Execute Cursor MCP setup
      try {
        const homeDirectory = process.platform === 'win32' ? process.env.USERPROFILE : process.env.HOME;
        const configPath = path.join(homeDirectory, '.cursor', 'mcp.json');
        
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
        
        // Clean up old cerebras-code server if it exists
        if (existingConfig.mcpServers['cerebras-code']) {
          console.log('🧹 Removing old cerebras-code MCP server configuration...');
          delete existingConfig.mcpServers['cerebras-code'];
          console.log('✅ Old cerebras-code configuration removed');
        }
        
        // Build environment variables
        const env = {};
        if (cerebrasKey.trim()) {
          env.CEREBRAS_API_KEY = cerebrasKey.trim();
        }
        if (openRouterKey.trim()) {
          env.OPENROUTER_API_KEY = openRouterKey.trim();
        }
        // Add IDE identification
        env.CEREBRAS_MCP_IDE = "cursor";
        
        // Update or add cerebras-mcp server
        existingConfig.mcpServers["cerebras-mcp"] = {
          command: "cerebras-mcp",
          env: env
        };
        
        // Write the updated config
        await fs.writeFile(configPath, JSON.stringify(existingConfig, null, 2), 'utf-8');
        
        // Instruct user on how to add Global AI Rule
        console.log('\n\n🚨 IMPORTANT STEP REQUIRED FOR CURSOR 🚨');
        console.log('To ensure the MCP tool is always used, please add a global rule in Cursor:');
        console.log('  1. Open Cursor Settings (Cmd+, or Ctrl+,)');
        console.log('  2. Go to `Rules & Memories` -> `User Rules`');
        console.log('  3. Click `Add User Rule` and paste the following:');
        console.log('\n--------------------------------------------------');
        console.log(CEREBRAS_MCP_RULES.comment);
        console.log('--------------------------------------------------\n');
        console.log('🔄 Please restart Cursor to use the new MCP server.');
        
      } catch (error) {
        console.log(`Failed to setup Cursor MCP: ${error.message}`);
        console.log('Please check the error and try again.');
      }
      
    } else if (serviceName === 'Cline') {
      // Execute Cline setup
      try {
        // Setup Cline Rules
        const clineRulesPath = getClineRulesPath();
        const rulesFilePath = path.join(clineRulesPath, 'cerebras-mcp-rules.md');
        
        // Ensure directory exists
        await fs.mkdir(clineRulesPath, { recursive: true });
        
        // Create the rules file content
        const rulesContent = CEREBRAS_MCP_RULES.markdown;

        // Write the rules file (overwrite if exists to ensure latest rules)
        await fs.writeFile(rulesFilePath, rulesContent, 'utf-8');
        
        // Setup Cline MCP Server Configuration
        const homeDirectory = process.platform === 'win32' ? process.env.USERPROFILE : process.env.HOME;
        let clineConfigPath;
        
        if (process.platform === 'win32') {
          clineConfigPath = path.join(homeDirectory, 'AppData', 'Roaming', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'settings', 'cline_mcp_settings.json');
        } else {
          clineConfigPath = path.join(homeDirectory, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'settings', 'cline_mcp_settings.json');
        }
        
        // Ensure directory exists
        await fs.mkdir(path.dirname(clineConfigPath), { recursive: true });
        
        // Read existing config or create new one
        let existingConfig = {};
        try {
          const existingContent = await fs.readFile(clineConfigPath, 'utf-8');
          existingConfig = JSON.parse(existingContent);
        } catch (error) {
          // File doesn't exist or is invalid, start with empty config
          existingConfig = {};
        }
        
        // Ensure mcpServers object exists
        if (!existingConfig.mcpServers) {
          existingConfig.mcpServers = {};
        }
        
        // Clean up old cerebras-code server if it exists
        if (existingConfig.mcpServers['cerebras-code']) {
          console.log('🧹 Removing old cerebras-code MCP server configuration...');
          delete existingConfig.mcpServers['cerebras-code'];
          console.log('✅ Old cerebras-code configuration removed');
        }
        
        // Build environment variables
        const env = {};
        if (cerebrasKey.trim()) {
          env.CEREBRAS_API_KEY = cerebrasKey.trim();
        }
        if (openRouterKey.trim()) {
          env.OPENROUTER_API_KEY = openRouterKey.trim();
        }
        // Add IDE identification
        env.CEREBRAS_MCP_IDE = "cline";
        
        // Update or add cerebras-mcp server
        existingConfig.mcpServers["cerebras-mcp"] = {
          command: "cerebras-mcp",
          env: env
        };
        
        // Write the updated config
        await fs.writeFile(clineConfigPath, JSON.stringify(existingConfig, null, 2), 'utf-8');
        
        console.log('\n✅ Cline MCP server and global rules configured successfully!');
        console.log(`Rules file created at: ${rulesFilePath}`);
        console.log(`MCP config updated at: ${clineConfigPath}`);
        console.log('\n📝 The global rules and MCP server have been automatically configured.');
        console.log('🔄 Please restart VSCode to use the new MCP server.');
        
      } catch (error) {
        console.log(`Failed to setup Cline: ${error.message}`);
        console.log('Please check the error and try again.');
      }
      
    } else if (serviceName === 'VS Code') {
      // Execute VS Code setup
      try {
        console.log('\n🔧 Setting up VS Code integration...');
        
         // Create VS Code MCP configuration using native VS Code MCP support
         const homeDirectory = process.platform === 'win32' ? process.env.USERPROFILE : process.env.HOME;
         let vscodeMcpPath;
         if (process.platform === 'win32') {
           vscodeMcpPath = path.join(process.env.APPDATA, 'Code', 'User', 'mcp.json');
         } else if (process.platform === 'darwin') {
           vscodeMcpPath = path.join(homeDirectory, 'Library', 'Application Support', 'Code', 'User', 'mcp.json');
         } else {
           vscodeMcpPath = path.join(homeDirectory, '.config', 'Code', 'User', 'mcp.json');
         }
         
         // Ensure directory exists
         await fs.mkdir(path.dirname(vscodeMcpPath), { recursive: true });
         
         // Read existing MCP configuration or create new one
         let existingMcpConfig = { servers: {} };
         try {
           const existingContent = await fs.readFile(vscodeMcpPath, 'utf-8');
           existingMcpConfig = JSON.parse(existingContent);
           if (!existingMcpConfig.servers) {
             existingMcpConfig.servers = {};
           }
         } catch (error) {
           // File doesn't exist or is invalid, start with empty config
           existingMcpConfig = { servers: {} };
         }
         
         // Clean up old cerebras-code server if it exists
         if (existingMcpConfig.servers['cerebras-code']) {
           console.log('🧹 Removing old cerebras-code MCP server configuration...');
           delete existingMcpConfig.servers['cerebras-code'];
           console.log('✅ Old cerebras-code configuration removed');
         }
         
         // Build environment variables
         const env = {};
         if (cerebrasKey.trim()) {
           env.CEREBRAS_API_KEY = cerebrasKey.trim();
         }
         if (openRouterKey.trim()) {
           env.OPENROUTER_API_KEY = openRouterKey.trim();
         }
         // Add IDE identification
         env.CEREBRAS_MCP_IDE = "vscode";
         
         // Add cerebras-mcp server using VS Code's native MCP format
         existingMcpConfig.servers['cerebras-mcp'] = {
           command: "cerebras-mcp",
           env: env
         };
         
         // Write the updated MCP configuration
         await fs.writeFile(vscodeMcpPath, JSON.stringify(existingMcpConfig, null, 2), 'utf-8');
        
        // Note: VS Code doesn't have a documented universal instructions system like Claude/Cursor
        // We'll focus only on the MCP server configuration which is officially supported
        
         console.log('\n✅ VS Code MCP server configured successfully!');
         console.log(`MCP config updated at: ${vscodeMcpPath}`);
         console.log('\n📝 The MCP server has been automatically configured.');
         console.log('🔄 Please restart VS Code to use the new MCP server.');
         console.log('\n💡 To enable MCP tools in Copilot:');
         console.log('   1. Open Copilot chat interface');
         console.log('   2. Click the "Tools" button');
         console.log('   3. Enable cerebras-mcp tools');
        
      } catch (error) {
        console.log(`Failed to setup VS Code: ${error.message}`);
        console.log('Please check the error and try again.');
      }
      
    } else if (serviceName === 'Crush') {
      // Execute Crush setup
      try {
        const homeDirectory = process.platform === 'win32' ? process.env.USERPROFILE : process.env.HOME;
        let crushConfigPath;
        
        if (process.platform === 'win32') {
          crushConfigPath = path.join(homeDirectory, 'AppData', 'Local', 'crush', 'crush.json');
        } else {
          crushConfigPath = path.join(homeDirectory, '.config', 'crush', 'crush.json');
        }
        
        // Ensure directory exists
        const crushConfigDir = path.dirname(crushConfigPath);
        await fs.mkdir(crushConfigDir, { recursive: true });
        
        // Read existing config or create new one
        let existingConfig = {};
        try {
          const existingContent = await fs.readFile(crushConfigPath, 'utf-8');
          existingConfig = JSON.parse(existingContent);
        } catch (error) {
          // File doesn't exist, start with empty config
          existingConfig = {
            "$schema": "https://charm.land/crush.json"
          };
        }
        
        // Ensure mcp section exists
        if (!existingConfig.mcp) {
          existingConfig.mcp = {};
        }
        
        // Remove old cerebras-code server if it exists
        if (existingConfig.mcp['cerebras-code']) {
          delete existingConfig.mcp['cerebras-code'];
        }
        
        // Prepare environment variables
        const env = {};
        if (cerebrasKey.trim()) {
          env.CEREBRAS_API_KEY = cerebrasKey.trim();
        }
        if (openRouterKey.trim()) {
          env.OPENROUTER_API_KEY = openRouterKey.trim();
        }
        // Add IDE identification
        env.CEREBRAS_MCP_IDE = 'crush';
        
        // Add cerebras-mcp server configuration
        existingConfig.mcp['cerebras-mcp'] = {
          type: "stdio",
          command: "cerebras-mcp",
          env: env
        };
        
        // Add permissions to allow all tools without prompting
        existingConfig.permissions = {
          allowed_tools: ["*"]
        };
        
        // Write the updated config
        await fs.writeFile(crushConfigPath, JSON.stringify(existingConfig, null, 2), 'utf-8');
        
        console.log('\n✅ Crush MCP server configured successfully!');
        console.log(`Config updated at: ${crushConfigPath}`);
        console.log('\n📝 The MCP server has been automatically configured with:');
        console.log('   • cerebras-mcp server with stdio transport');
        console.log('   • All MCP tools pre-approved (no prompting)');
        console.log('   • Environment variables for API keys');
        console.log('\n🔄 Please restart Crush to use the new MCP server.');
        console.log('\n💡 Usage in Crush:');
        console.log('   • The write tool will be available automatically');
        console.log('   • Ask Crush to create or edit files');
        console.log('   • Crush will use the MCP write tool for all code operations');
        
      } catch (error) {
        console.log(`Failed to setup Crush: ${error.message}`);
        console.log('Please check the error and try again.');
      }
      
    } else {
      // Execute Claude Code MCP setup
      try {
        const { execSync } = await import('child_process');
        
        // Uninstall existing servers to ensure clean installation
        try {
          execSync('claude mcp remove cerebras-mcp', { stdio: 'inherit' });
        } catch (error) {
          // Ignore if it fails (e.g., not installed)
        }
        
        // Also remove old cerebras-code server if it exists
        try {
          execSync('claude mcp remove cerebras-code', { stdio: 'inherit' });
        } catch (error) {
          // Ignore if it fails (e.g., not installed)
        }

        let envVars = '';
        if (cerebrasKey.trim()) {
          envVars += ` --env CEREBRAS_API_KEY=${cerebrasKey.trim()}`;
        }
        if (openRouterKey.trim()) {
          envVars += ` --env OPENROUTER_API_KEY=${openRouterKey.trim()}`;
        }
        // Add IDE identification
        envVars += ` --env CEREBRAS_MCP_IDE=claude`;
        
        const command = `claude mcp add cerebras-mcp cerebras-mcp${envVars}`;
        
        execSync(command, { stdio: 'inherit' });
        
        // Verify installation
        console.log('Verifying installation...');
        const listOutput = execSync('claude mcp list').toString();
        if (listOutput.includes('cerebras-mcp')) {
            console.log('✅ Claude Code MCP server configured successfully!');
        } else {
            console.log('❌ Verification failed: cerebras-mcp not found in claude mcp list.');
            throw new Error('Installation verification failed.');
        }

        // Automatically create or append to the global CLAUDE.md rule file
        try {
          const claudeRulesPath = path.join(process.env.HOME, '.claude', 'CLAUDE.md');

          await fs.mkdir(path.dirname(claudeRulesPath), { recursive: true });

          let existingContent = '';
          try {
            existingContent = await fs.readFile(claudeRulesPath, 'utf-8');
          } catch (readError) {
            // File doesn't exist, which is fine.
          }

          if (!existingContent.includes(CEREBRAS_MCP_RULES.comment)) {
            const newContent = existingContent
              ? `${existingContent}\\n\\n${CEREBRAS_MCP_RULES.comment}`
              : CEREBRAS_MCP_RULES.comment;
            await fs.writeFile(claudeRulesPath, newContent, 'utf-8');
          }
        } catch (e) {
            console.log(`⚠️ Could not create or update Claude Code global rules file: ${e.message}`);
        }
        
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
