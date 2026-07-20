const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'apps');

const replacements = {
  '#3525cd': '#27272a',
  '#4f46e5': '#3f3f46',
  '#fcf8ff': '#ffffff',
  '#e4e1ee': '#f4f4f5',
  '#eae6f4': '#e4e4e7',
  '#777587': '#a1a1aa',
  '#c8c5d0': '#d4d4d8',
  '#ba1a1a': '#ef4444',
  '#ffdad6': '#fee2e2',
  '#93000a': '#991b1b',
  '#f0edff': '#f4f4f5',
  '#2b1fb0': '#18181b',
  '#ded9eb': '#d4d4d8',
  // Uppercase versions too just in case
  '#3525CD': '#27272a',
  '#4F46E5': '#3f3f46'
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
        console.log(`Updated hex in ${fullPath}`);
      }
    }
  }
}

walkDir(directoryPath);
console.log("Done replacing all hex codes!");
