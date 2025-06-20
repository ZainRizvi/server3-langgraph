import fs from 'fs';
import path from 'path';

const agentsDir = path.resolve(process.cwd(), 'src/agents');
const packageJsonPath = path.resolve(process.cwd(), 'package.json');

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

const graphFiles = findGraphFiles(agentsDir);
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

const exportsMap = {
  '.': './src/index.ts',
  './package.json': './package.json',
};

for (const [importName, filePath] of graphFiles) {
    const finalImportName = importName.replace('/graph', '');
    exportsMap[finalImportName] = `${filePath}`;
}

packageJson.exports = exportsMap;

fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

console.log('Successfully generated agent exports in package.json'); 