const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'apps/web/src/components/verify-email-form.tsx',
  'apps/web/src/components/signup-form.tsx',
  'apps/web/src/components/invitation-acceptance-form.tsx',
  'apps/web/src/components/password-reset-form.tsx',
  'apps/web/src/components/platform/platform-shell.tsx',
  'apps/web/src/components/platform/platform-login-form.tsx',
  'apps/web/src/components/tenant/tenant-shell.tsx',
  'apps/web/src/app/workspace-unavailable/page.tsx',
  'apps/web/src/components/tenant/attendance-workspace-nav.tsx' // Add any other if needed
];

for (const relPath of filesToUpdate) {
  const fullPath = path.join(__dirname, relPath);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    let original = content;

    // Pattern 1: <div className="..."><Building2 ... /></div>
    // We will replace this entire wrapper with an img tag.
    content = content.replace(
      /<div className="[^"]*grid size-10[^"]*"><Building2[^>]*><\/div>/g,
      '<img src="/logo-square.png" alt="DeltCRM Logo" className="size-10 object-contain" />'
    );
    
    content = content.replace(
      /<div className="[^"]*grid size-11[^"]*"><Building2[^>]*><\/div>/g,
      '<img src="/logo-square.png" alt="DeltCRM Logo" className="size-11 object-contain" />'
    );
    
    // Auth forms use something like:
    // <div className="mb-7 flex items-center gap-3"><div className="grid size-11 ..."><Building2 /></div>...</div>
    // Let's specifically target the auth forms if the regex above didn't catch them.
    content = content.replace(
      /<div className="grid size-11 place-items-center rounded-xl[^"]*"><Building2 \/><\/div>/g,
      '<img src="/logo-square.png" alt="DeltCRM Logo" className="size-11 object-contain" />'
    );

    if (content !== original) {
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`Replaced logo in ${relPath}`);
    }
  }
}
