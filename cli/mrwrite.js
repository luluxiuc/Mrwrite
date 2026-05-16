#!/usr/bin/env node

const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const args = process.argv.slice(2);
let PORT = process.env.PORT || 3000;
let noBrowser = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--port' && args[i + 1]) {
    PORT = parseInt(args[i + 1]);
    i++;
  } else if (args[i] === '--no-browser') {
    noBrowser = true;
  } else if (args[i] === '--help' || args[i] === '-h') {
    console.log('MrWrite — AI Writing Studio');
    console.log('');
    console.log('Usage: mrwrite [options]');
    console.log('');
    console.log('Options:');
    console.log('  --port <port>    Server port (default: 3000)');
    console.log('  --no-browser     Do not open browser');
    console.log('  --help, -h       Show this help');
    process.exit(0);
  }
}

const PROJECT_DIR = path.resolve(__dirname, '..');
const ENV_FILE = path.join(PROJECT_DIR, '.env');

// Check .env exists
if (!fs.existsSync(ENV_FILE)) {
  const examplePath = path.join(PROJECT_DIR, '.env.example');
  if (fs.existsSync(examplePath)) {
    fs.copyFileSync(examplePath, ENV_FILE);
    console.log('  Created .env from .env.example');
    console.log('  Edit .env to configure your LLM API key\n');
  }
}

// Ensure data directories exist
const os = require('os');
const homeDir = os.homedir();
const dataDir = path.join(homeDir, 'mrwrite');
const dirs = [
  dataDir,
  path.join(dataDir, 'workspace'),
  path.join(dataDir, 'exports'),
  path.join(dataDir, 'skills')
];
dirs.forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

console.log(`\n  MrWrite — AI Writing Studio`);
console.log(`  http://localhost:${PORT}\n`);

// Start Next.js dev server
const nextProcess = spawn('npx', ['next', 'dev', '-p', String(PORT)], {
  cwd: PROJECT_DIR,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, PORT: String(PORT) },
});

// Open browser
if (!noBrowser) {
  setTimeout(() => {
    const url = `http://localhost:${PORT}`;
    const platform = process.platform;
    let openCmd;
    if (platform === 'win32') openCmd = `start "" "${url}"`;
    else if (platform === 'darwin') openCmd = `open "${url}"`;
    else openCmd = `xdg-open "${url}"`;
    exec(openCmd);
  }, 2500);
}

// Handle exit
process.on('SIGINT', () => {
  console.log('\n  Shutting down MrWrite...');
  nextProcess.kill();
  process.exit(0);
});
process.on('SIGTERM', () => {
  nextProcess.kill();
  process.exit(0);
});
