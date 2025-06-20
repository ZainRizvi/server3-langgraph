import fs from 'fs';
import path from 'path';

const agentsDir = path.resolve(process.cwd(), 'src/agents');
const packageJsonPath = path.resolve(process.cwd(), 'package.json');
const agentIndexPath = path.resolve(process.cwd(), 'src/agents/index.ts');
const agentMetadataPath = path.resolve(process.cwd(), 'src/agents/metadata.ts');

function findGraphFiles(dir, baseDir = dir) {
  let files = [];
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      files = files.concat(findGraphFiles(fullPath, baseDir));
    } else if (item === 'graph.ts') {
      const relativePath = path.relative(baseDir, fullPath);
      // Format for import path: ./agents/react-agent/graph -> ./src/agents/react-agent/graph.ts
      const importName = `./agents/${relativePath.replace(/\\/g, '/').replace(/\.ts$/, '')}`;
      // Format for file path: ./src/agents/react-agent/graph.ts
      const filePath = `./src/agents/${relativePath.replace(/\\/g, '/')}`;
      files.push([importName, filePath]);
    }
  }
  return files;
}

// Find all top-level agent directories
function findAgentDirectories(dir) {
  const agents = [];
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      // Check if this directory contains a graph.ts file (directly or in subdirectories)
      const hasGraphFile = fs.existsSync(path.join(fullPath, 'graph.ts')) || 
                          findGraphFiles(fullPath).length > 0;
      if (hasGraphFile) {
        agents.push(item);
      }
    }
  }
  return agents;
}

// Get agent metadata by reading README files or using agent names
function getAgentMetadata(agentDirs) {
  const metadata = {};
  agentDirs.forEach(agent => {
    const readmePath = path.join(agentsDir, agent, 'README.md');
    let description = '';
    
    // Try to extract description from README.md
    if (fs.existsSync(readmePath)) {
      try {
        const readmeContent = fs.readFileSync(readmePath, 'utf-8');
        // Look for first paragraph after title or first line that looks like a description
        const lines = readmeContent.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('!') && trimmed.length > 20) {
            description = trimmed;
            break;
          }
        }
      } catch (error) {
        console.warn(`Could not read README for ${agent}:`, error.message);
      }
    }
    
    // Create a human-readable name from the agent directory name
    const name = agent.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
    
    metadata[agent] = {
      name,
      description: description || `${name} implementation`
    };
  });
  
  return metadata;
}

// Generate the agent map file (server-side with full imports)
function generateAgentMapFile(agentDirs) {
  let fileContent = '// This file is auto-generated. Do not edit manually.\n';
  fileContent += '// Server-side agent map with full graph implementations\n\n';
  
  // Add imports
  agentDirs.forEach(agent => {
    // Convert agent name to camelCase for variable name (e.g., memory-agent -> memoryAgentGraph)
    const camelCaseName = agent.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
    
    // Check if there's a direct graph.ts file
    if (fs.existsSync(path.join(agentsDir, agent, 'graph.ts'))) {
      fileContent += `import { graph as ${camelCaseName}Graph } from './${agent}/graph';\n`;
    } else {
      // For more complex agents like research-agent, find the main graph file
      const graphFiles = findGraphFiles(path.join(agentsDir, agent));
      if (graphFiles.length > 0) {
        // For research-agent, use the retrieval-graph/graph.ts file
        if (agent === 'research-agent') {
          fileContent += `import { graph as ${camelCaseName}Graph } from './${agent}/retrieval-graph/graph';\n`;
        } else {
          // Use the first graph file found (assuming it's the main one)
          const relativePath = graphFiles[0][0].replace('./agents/', './');
          fileContent += `import { graph as ${camelCaseName}Graph } from '${relativePath}';\n`;
        }
      }
    }
  });
  
  fileContent += '\n// Map of agent names to their graph implementations\n';
  fileContent += 'export const agentMap = new Map<string, any>([\n';
  
  // Add map entries
  agentDirs.forEach(agent => {
    const camelCaseName = agent.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
    fileContent += `  ['${agent}', ${camelCaseName}Graph],\n`;
  });
  
  fileContent += ']);\n';
  
  // Write the file
  fs.writeFileSync(agentIndexPath, fileContent);
  console.log(`Successfully generated agent map at ${agentIndexPath}`);
}

// Generate the metadata file (client-safe, no implementations)
function generateAgentMetadataFile(agentDirs, metadata) {
  let fileContent = '// This file is auto-generated. Do not edit manually.\n';
  fileContent += '// Client-safe agent metadata without implementations\n\n';
  
  // Export agent metadata object
  fileContent += '// Agent metadata with names and descriptions\n';
  fileContent += '// Use Object.keys(agentMetadata) to get agent names\n';
  fileContent += 'export const agentMetadata: Record<string, { name: string; description?: string }> = {\n';
  agentDirs.forEach(agent => {
    const { name, description } = metadata[agent];
    fileContent += `  '${agent}': {\n`;
    fileContent += `    name: '${name}',\n`;
    fileContent += `    description: '${description.replace(/'/g, "\\'")}',\n`;
    fileContent += `  },\n`;
  });
  fileContent += '};\n';
  
  // Write the file
  fs.writeFileSync(agentMetadataPath, fileContent);
  console.log(`Successfully generated agent metadata at ${agentMetadataPath}`);
}

const graphFiles = findGraphFiles(agentsDir);
const agentDirs = findAgentDirectories(agentsDir);
const agentMetadata = getAgentMetadata(agentDirs);
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

// Generate both files
generateAgentMapFile(agentDirs);
generateAgentMetadataFile(agentDirs, agentMetadata);

// Update package.json exports
const exportsMap = {
  '.': './src/index.ts',
  './package.json': './package.json',
  './src/agents': './src/agents/index.ts',
  './src/agents/metadata': './src/agents/metadata.ts',
};

for (const [importName, filePath] of graphFiles) {
    const finalImportName = importName.replace('/graph', '');
    exportsMap[finalImportName] = `${filePath}`;
}

packageJson.exports = exportsMap;

fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

console.log('Successfully generated agent exports in package.json'); 