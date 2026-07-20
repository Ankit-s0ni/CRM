const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'apps/web/src');
const foundClasses = new Set();

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      const matches = content.match(/[a-z]+-\[#[a-f0-9]{6}\]/gi);
      if (matches) {
        matches.forEach(m => foundClasses.add(m));
      }
    }
  }
}

walkDir(directoryPath);
console.log(Array.from(foundClasses).join('\n'));
