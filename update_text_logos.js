const fs = require('fs');
const path = require('path');

const updates = [
  {
    file: 'apps/web/src/components/signup-form.tsx',
    regex: /<h1 className="text-\[21px\] font-semibold leading-8 tracking-\[-0\.01em\] text-zinc-50">DeltCRM<\/h1>/,
    replacement: '<img src="/logo-horizontal.png" alt="DeltCRM Logo" className="h-8 w-auto invert brightness-0" />'
    // invert brightness-0 makes it white, since text-zinc-50 was white and this is probably on a dark bg!
  },
  {
    file: 'apps/web/src/components/password-reset-form.tsx',
    regex: /<h2 className="text-\[30px\] font-bold leading-\[38px\] tracking-\[-0\.02em\] text-primary">DeltCRM<\/h2>/,
    replacement: '<img src="/logo-horizontal.png" alt="DeltCRM Logo" className="h-9 w-auto" />'
  },
  {
    file: 'apps/web/src/components/verify-email-form.tsx',
    regex: /<span className="text-\[20px\] font-semibold leading-7 tracking-\[-0\.01em\] text-primary">DeltCRM<\/span>/,
    replacement: '<img src="/logo-horizontal.png" alt="DeltCRM Logo" className="h-7 w-auto" />'
  },
  {
    file: 'apps/web/src/app/accept-invitation/page.tsx',
    regex: /<p className="mt-3 text-lg font-bold text-on-surface">DeltCRM<\/p>/,
    replacement: '<img src="/logo-horizontal.png" alt="DeltCRM Logo" className="mt-3 h-7 w-auto" />'
  }
];

updates.forEach(u => {
  const fullPath = path.join(__dirname, u.file);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    if (u.regex.test(content)) {
      content = content.replace(u.regex, u.replacement);
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`Updated text logo in ${u.file}`);
    }
  }
});

