const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'apps');

const replacements = {
  '\\[#f2eff8\\]': 'surface-variant',
  '\\[#ece8fa\\]': 'surface-variant',
  '\\[#f3eff8\\]': 'surface-variant',
  '\\[#fbf9ff\\]': 'surface-variant',
  '\\[#e6e2ec\\]': 'surface-container-high',
  '\\[#faf8fc\\]': 'surface',
  '\\[#f8f5fb\\]': 'surface',
  '\\[#d7d2df\\]': 'outline-variant',
  '\\[#eeeaf3\\]': 'outline-variant',
  '\\[#ddd9e8\\]': 'outline-variant',
  '\\[#f4f1ff\\]': 'surface-variant'
};

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.next' && file !== 'dist') {
        walkDir(fullPath);
      }
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts') || fullPath.endsWith('.css') || fullPath.endsWith('.dart')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let originalContent = content;
      
      for (const [search, replace] of Object.entries(replacements)) {
        // Regex with global flag, case-insensitive
        const regex = new RegExp(search, 'gi');
        content = content.replace(regex, replace);
      }
      
      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated light purples in ${fullPath}`);
      }
    }
  }
}

walkDir(directoryPath);
console.log("Done replacing light purples!");
