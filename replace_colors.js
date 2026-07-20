const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'apps/web/src');

const replacements = {
  '\\[#3525cd\\]': 'primary',
  '\\[#4f46e5\\]': 'primary-container',
  '\\[#fcf8ff\\]': 'surface',
  '\\[#1c1b1f\\]': 'on-surface',
  '\\[#e4e1ee\\]': 'surface-variant',
  '\\[#464555\\]': 'on-surface-variant',
  '\\[#eae6f4\\]': 'surface-container-high',
  '\\[#777587\\]': 'outline',
  '\\[#c8c5d0\\]': 'outline-variant',
  '\\[#ba1a1a\\]': 'error',
  '\\[#ffdad6\\]': 'error-container',
  '\\[#93000a\\]': 'on-error-container',
  '\\[#f0edff\\]': 'surface-variant',
  '\\[#2b1fb0\\]': 'primary/90',
  '\\[#ded9eb\\]': 'outline-variant',
  '\\[#646273\\]': 'on-surface-variant',
  'rgba\\(53,37,205,.12\\)': 'rgba(0,0,0,.08)'
};

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let originalContent = content;
      
      for (const [search, replace] of Object.entries(replacements)) {
        const regex = new RegExp(search, 'g');
        content = content.replace(regex, replace);
      }
      
      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

walkDir(directoryPath);
console.log("Done replacing colors!");
