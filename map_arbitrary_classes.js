const fs = require('fs');
const path = require('path');

const replacements = {
  '\\[#f9f9f9\\]': 'zinc-50',
  '\\[#f8f8f8\\]': 'zinc-50',
  '\\[#f7f7f7\\]': 'zinc-50',
  '\\[#f6f6f6\\]': 'zinc-50',
  '\\[#f5f5f5\\]': 'zinc-50',
  '\\[#f4f4f4\\]': 'zinc-50',
  '\\[#f3f3f3\\]': 'zinc-50',
  '\\[#fdfdfd\\]': 'zinc-50',
  '\\[#fcfcfc\\]': 'zinc-50',
  '\\[#fbfbfb\\]': 'zinc-50',
  '\\[#fafafa\\]': 'zinc-50',
  
  '\\[#efefef\\]': 'zinc-100',
  '\\[#eeeeee\\]': 'zinc-100',
  '\\[#ededed\\]': 'zinc-100',
  '\\[#ececec\\]': 'zinc-100',
  '\\[#ebebeb\\]': 'zinc-100',
  '\\[#eaeaea\\]': 'zinc-200',
  '\\[#e9e9e9\\]': 'zinc-200',
  '\\[#e8e8e8\\]': 'zinc-200',
  '\\[#e4e4e4\\]': 'zinc-200',
  '\\[#e2e2e2\\]': 'zinc-200',
  '\\[#e1e1e1\\]': 'zinc-200',
  '\\[#e0e0e0\\]': 'zinc-200',
  
  '\\[#dddddd\\]': 'zinc-300',
  '\\[#dbdbdb\\]': 'zinc-300',
  '\\[#dcdcdc\\]': 'zinc-300',
  '\\[#dadada\\]': 'zinc-300',
  '\\[#d5d5d5\\]': 'zinc-300',
  '\\[#cfcfcf\\]': 'zinc-300',
  '\\[#cecece\\]': 'zinc-300',
  
  '\\[#a8a8a8\\]': 'zinc-400',
  '\\[#a6a6a6\\]': 'zinc-400',
  '\\[#9f9f9f\\]': 'zinc-400',
  '\\[#9e9e9e\\]': 'zinc-400',
  
  '\\[#8e8e8e\\]': 'zinc-500',
  '\\[#787878\\]': 'zinc-500',
  '\\[#6d6d6d\\]': 'zinc-500',
  '\\[#696969\\]': 'zinc-500',
  '\\[#646464\\]': 'zinc-500',
  '\\[#626262\\]': 'zinc-500',
  
  '\\[#5c5c5c\\]': 'zinc-600',
  '\\[#5b5b5b\\]': 'zinc-600',
  '\\[#595959\\]': 'zinc-600',
  
  '\\[#343434\\]': 'zinc-700',
  '\\[#303030\\]': 'zinc-700',
  
  '\\[#282828\\]': 'zinc-800',
  '\\[#272727\\]': 'zinc-800',
  '\\[#242424\\]': 'zinc-800',
  '\\[#232323\\]': 'zinc-800',
  
  '\\[#202020\\]': 'zinc-900',
  '\\[#1a1a1a\\]': 'zinc-900',
  
  '\\[#f1fbf4\\]': 'emerald-50',
  '\\[#e9f8ef\\]': 'emerald-50',
  '\\[#e8f8ed\\]': 'emerald-50',
  '\\[#d9f8df\\]': 'emerald-50',
  '\\[#dff8e5\\]': 'emerald-50',
  '\\[#d8f8df\\]': 'emerald-100',
  '\\[#d9f5e7\\]': 'emerald-100',
  '\\[#bce9ca\\]': 'emerald-200',
  '\\[#7cf994\\]': 'emerald-300',
  '\\[#7ffc97\\]': 'emerald-300',
  '\\[#3ef08b\\]': 'emerald-400',
  '\\[#00a642\\]': 'emerald-600',
  '\\[#138a55\\]': 'emerald-700',
  '\\[#146c2e\\]': 'emerald-800',
  '\\[#006e2d\\]': 'emerald-800',
  '\\[#005320\\]': 'emerald-900',
  '\\[#0f5132\\]': 'emerald-900',
  '\\[#43614d\\]': 'emerald-900',
  
  '\\[#fffaf0\\]': 'amber-50',
  '\\[#fff9ed\\]': 'amber-50',
  '\\[#fff8eb\\]': 'amber-50',
  '\\[#fff8df\\]': 'amber-50',
  '\\[#fff7e8\\]': 'amber-50',
  '\\[#fff7e7\\]': 'amber-50',
  '\\[#fff3df\\]': 'amber-100',
  '\\[#fff1d6\\]': 'amber-100',
  '\\[#fff1c2\\]': 'amber-100',
  '\\[#fff0d4\\]': 'amber-100',
  '\\[#fff0dc\\]': 'amber-100',
  '\\[#ffddb0\\]': 'amber-200',
  '\\[#ffdcc3\\]': 'amber-200',
  '\\[#f4e4bd\\]': 'amber-200',
  '\\[#f2d29e\\]': 'amber-300',
  '\\[#f1c57d\\]': 'amber-300',
  '\\[#eadcae\\]': 'amber-300',
  '\\[#e1a84b\\]': 'amber-400',
  '\\[#ef9d00\\]': 'amber-500',
  '\\[#d97706\\]': 'amber-600',
  '\\[#c58b00\\]': 'amber-600',
  '\\[#c06b18\\]': 'amber-600',
  '\\[#a14f00\\]': 'amber-700',
  '\\[#9a5c00\\]': 'amber-700',
  '\\[#a65712\\]': 'amber-700',
  '\\[#895100\\]': 'amber-800',
  '\\[#8a4f00\\]': 'amber-800',
  '\\[#703a00\\]': 'amber-900',
  '\\[#6e3900\\]': 'amber-900',
  '\\[#654500\\]': 'amber-900',
  '\\[#6d4600\\]': 'amber-900',
  '\\[#7a4d00\\]': 'amber-900',
  '\\[#705300\\]': 'amber-900',
  '\\[#705f2a\\]': 'amber-900',
  '\\[#604100\\]': 'amber-900',
  '\\[#5d480e\\]': 'amber-900',
  '\\[#5d3f00\\]': 'amber-900',
  
  '\\[#fff7f7\\]': 'red-50',
  '\\[#fff4f2\\]': 'red-50',
  '\\[#fff0ee\\]': 'red-50',
  '\\[#ffd9d5\\]': 'red-100',
  '\\[#ffc8c2\\]': 'red-200',
  '\\[#ffb4ab\\]': 'red-300',
  '\\[#f0b7b2\\]': 'red-300',
  '\\[#d32f2f\\]': 'red-600',
  '\\[#b42318\\]': 'red-700',
  '\\[#9f1111\\]': 'red-800',
  '\\[#a23063\\]': 'rose-700',
  
  '\\[#e4f2ff\\]': 'sky-50',
  '\\[#d9f1ff\\]': 'sky-100',
  '\\[#cbe6ff\\]': 'sky-200',
  '\\[#0091b3\\]': 'cyan-600',
  '\\[#0086c4\\]': 'sky-600',
  '\\[#006492\\]': 'sky-700',
  '\\[#005f8d\\]': 'sky-800',
  '\\[#005f79\\]': 'cyan-800',
  '\\[#0d6e78\\]': 'cyan-700',
  
  '\\[#ebe8e3\\]': 'stone-200',
  '\\[#aaa7a1\\]': 'stone-400',
  '\\[#b8b8b8\\]': 'zinc-400',
  '\\[#f0f0f0\\]': 'zinc-100',
  '\\[#f1f1f1\\]': 'zinc-100',
  '\\[#cecece\\]': 'zinc-300'
};

const directoryPath = path.join(__dirname, 'apps/web/src');

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.next') {
        walkDir(fullPath);
      }
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let originalContent = content;
      
      for (const [search, replace] of Object.entries(replacements)) {
        // Find bg-[#hex], text-[#hex], border-[#hex], from-[#hex], to-[#hex]
        const regexes = [
          new RegExp(`bg-${search}`, 'g'),
          new RegExp(`text-${search}`, 'g'),
          new RegExp(`border-${search}`, 'g'),
          new RegExp(`from-${search}`, 'g'),
          new RegExp(`to-${search}`, 'g'),
          new RegExp(`via-${search}`, 'g'),
          new RegExp(`ring-${search}`, 'g'),
          new RegExp(`divide-${search}`, 'g'),
          new RegExp(`stroke-${search}`, 'g'),
          new RegExp(`fill-${search}`, 'g')
        ];
        
        regexes.forEach((regex, index) => {
          const prefixes = ['bg-', 'text-', 'border-', 'from-', 'to-', 'via-', 'ring-', 'divide-', 'stroke-', 'fill-'];
          const prefix = prefixes[index];
          content = content.replace(regex, `${prefix}${replace}`);
        });
      }
      
      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Mapped classes in ${fullPath}`);
      }
    }
  }
}

walkDir(directoryPath);
console.log("Done mapping classes!");
