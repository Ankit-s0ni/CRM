import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const sourceRoot = new URL("../src/", import.meta.url);
const violations = [];

for (const file of await sourceFiles(sourceRoot.pathname)) {
  const source = await readFile(file, "utf8");
  if (!/["'`]\/app(?:\/|\?|["'`])/.test(source)) continue;

  if (/from\s+["']next\/link["']/.test(source)) {
    violations.push(
      `${relative(sourceRoot.pathname, file)} imports next/link for tenant navigation`,
    );
  }
  if (/<a\b[^>]*\bhref=["']\/app(?:\/|["'])/s.test(source)) {
    violations.push(
      `${relative(sourceRoot.pathname, file)} uses a raw anchor for tenant navigation`,
    );
  }
  for (const match of source.matchAll(
    /import\s*\{([^}]*)\}\s*from\s*["']next\/navigation["']/gs,
  )) {
    const imports = match[1]
      .split(",")
      .map((value) => value.trim().split(/\s+as\s+/)[0]);
    if (imports.includes("useRouter") || imports.includes("usePathname")) {
      violations.push(
        `${relative(sourceRoot.pathname, file)} imports a non-localized tenant router`,
      );
    }
  }
}

if (violations.length) {
  console.error(violations.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Tenant navigation uses the locale-aware routing adapter.");
}

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return sourceFiles(path);
      return [".ts", ".tsx"].includes(extname(entry.name)) ? [path] : [];
    }),
  );
  return files.flat();
}
