import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(import.meta.dirname, "..");
const require = createRequire(resolve(root, "apps/web/package.json"));
const ts = require("typescript");
const sourceRoot = resolve(root, "apps/web/src");
const scanRoots = [
  "app/[lang]/app",
  "features/platform/organization",
  "features/platform/workspace-settings",
  "features/products/attendance",
  "shared/components",
  "shared/layouts",
];
const translatableAttributes = new Set([
  "alt",
  "aria-label",
  "body",
  "caption",
  "content",
  "description",
  "emptyMessage",
  "errorMessage",
  "heading",
  "helperText",
  "label",
  "message",
  "placeholder",
  "subtitle",
  "successMessage",
  "title",
]);
const translatableProperties = new Set([
  "actionLabel",
  "body",
  "caption",
  "description",
  "emptyMessage",
  "errorMessage",
  "heading",
  "helperText",
  "label",
  "message",
  "name",
  "placeholder",
  "subtitle",
  "successMessage",
  "title",
]);
const translatableCalls = new Set([
  "alert",
  "confirm",
  "setError",
  "setErrorMessage",
  "setMessage",
  "setNotice",
  "setSuccess",
  "setSuccessMessage",
]);
const ignoredFiles = new Set([
  "features/platform/workspace-settings/localization-settings-view.tsx",
  "shared/components/theme-switcher.tsx",
]);

const findings = [];
const localizedFindings = [];
for (const scanRoot of scanRoots) {
  for (const file of sourceFiles(resolve(sourceRoot, scanRoot))) {
    const sourcePath = relative(sourceRoot, file);
    if (ignoredFiles.has(sourcePath)) continue;
    inspectFile(file, sourcePath);
  }
}

const unique = new Map();
for (const finding of findings) {
  const identity = `${finding.file}:${finding.line}:${finding.text}`;
  unique.set(identity, finding);
}
const result = [...unique.values()].sort(
  (left, right) =>
    left.file.localeCompare(right.file) || left.line - right.line,
);
const localizedResult = localizedFindings.sort(
  (left, right) =>
    left.file.localeCompare(right.file) || left.line - right.line,
);
const summary = {
  filesWithHardcodedText: new Set(result.map(({ file }) => file)).size,
  hardcodedOccurrences: result.length,
  uniqueEnglishMessages: new Set(result.map(({ text }) => text)).size,
};

export const tenantLocalizationAudit = {
  summary,
  findings: result,
  catalogFindings: [...result, ...localizedResult],
};

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  if (process.argv.includes("--json")) {
    process.stdout.write(
      `${JSON.stringify(tenantLocalizationAudit, null, 2)}\n`,
    );
  } else {
    console.log(
      `Tenant localization audit: ${summary.hardcodedOccurrences} hardcoded occurrences ` +
        `across ${summary.filesWithHardcodedText} files ` +
        `(${summary.uniqueEnglishMessages} unique messages).`,
    );
    for (const finding of result) {
      console.log(
        `${finding.file}:${finding.line} [${finding.kind}] ${finding.key} = ${JSON.stringify(finding.text)}`,
      );
    }
  }

  if (process.argv.includes("--strict") && result.length > 0) {
    process.exitCode = 1;
  }
}

function inspectFile(file, sourcePath) {
  const source = readFileSync(file, "utf8");
  const sourceFile = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  visit(sourceFile);

  function visit(node) {
    if (ts.isJsxText(node)) {
      if (!isStyleElement(node.parent)) {
        addFinding(node, normalize(node.text), "jsx-text");
      }
    }
    if (ts.isJsxAttribute(node)) {
      const name = node.name.getText(sourceFile);
      if (
        translatableAttributes.has(name) &&
        node.initializer &&
        ts.isStringLiteral(node.initializer)
      ) {
        addFinding(node, normalize(node.initializer.text), `attribute:${name}`);
      }
    }
    if (
      ts.isPropertyAssignment(node) &&
      translatableProperties.has(propertyName(node.name)) &&
      ts.isStringLiteralLike(node.initializer)
    ) {
      addFinding(
        node,
        normalize(node.initializer.text),
        `property:${propertyName(node.name)}`,
      );
    }
    if (ts.isCallExpression(node)) {
      const callName = node.expression.getText(sourceFile).split(".").at(-1);
      const firstArgument = node.arguments[0];
      if (
        (callName === "tText" || callName === "tenantMessage") &&
        firstArgument &&
        ts.isStringLiteralLike(firstArgument)
      ) {
        addLocalizedFinding(
          node,
          normalize(firstArgument.text),
          `call:${callName}`,
        );
      }
      if (
        translatableCalls.has(callName) &&
        firstArgument &&
        ts.isStringLiteralLike(firstArgument)
      ) {
        addFinding(node, normalize(firstArgument.text), `call:${callName}`);
      }
    }
    if (
      ts.isJsxExpression(node) &&
      !isStyleElement(node.parent) &&
      node.expression &&
      ts.isStringLiteralLike(node.expression)
    ) {
      addFinding(node, normalize(node.expression.text), "jsx-expression");
    }
    if (
      ts.isStringLiteralLike(node) &&
      isNestedDisplayExpression(node) &&
      !isInsideLocalizationCall(node)
    ) {
      addFinding(node, normalize(node.text), "nested-jsx-string");
    }
    ts.forEachChild(node, visit);
  }

  function isNestedDisplayExpression(node) {
    let current = node.parent;
    while (current) {
      if (ts.isJsxAttribute(current)) return false;
      if (ts.isJsxExpression(current)) {
        return (
          current.expression !== node &&
          !ts.isJsxAttribute(current.parent)
        );
      }
      if (ts.isCallExpression(current)) return false;
      if (ts.isConditionalExpression(current)) {
        if (current.condition === node || contains(current.condition, node)) {
          return false;
        }
      }
      if (ts.isBinaryExpression(current)) {
        const operator = current.operatorToken.kind;
        const renderedOperators = new Set([
          ts.SyntaxKind.PlusToken,
          ts.SyntaxKind.QuestionQuestionToken,
          ts.SyntaxKind.BarBarToken,
          ts.SyntaxKind.AmpersandAmpersandToken,
        ]);
        if (!renderedOperators.has(operator)) return false;
        if (
          (operator === ts.SyntaxKind.BarBarToken ||
            operator === ts.SyntaxKind.AmpersandAmpersandToken) &&
          (current.left === node || contains(current.left, node))
        ) {
          return false;
        }
      }
      if (
        ts.isJsxElement(current) ||
        ts.isJsxSelfClosingElement(current) ||
        ts.isSourceFile(current)
      ) {
        return false;
      }
      current = current.parent;
    }
    return false;
  }

  function contains(parent, child) {
    return (
      child.getStart(sourceFile) >= parent.getStart(sourceFile) &&
      child.getEnd() <= parent.getEnd()
    );
  }

  function isInsideLocalizationCall(node) {
    let current = node.parent;
    while (current) {
      if (
        ts.isCallExpression(current) &&
        ["t", "tText", "tenantMessage"].includes(
          current.expression.getText(sourceFile).split(".").at(-1),
        )
      ) {
        return true;
      }
      if (ts.isJsxExpression(current) || ts.isSourceFile(current)) return false;
      current = current.parent;
    }
    return false;
  }

  function addLocalizedFinding(node, text, kind) {
    if (!looksUserFacing(text)) return;
    const line =
      sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line +
      1;
    localizedFindings.push({
      file: sourcePath,
      line,
      kind,
      key: suggestedKey(sourcePath, text),
      text,
    });
  }

  function addFinding(node, text, kind) {
    if (!looksUserFacing(text)) return;
    const line =
      sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line +
      1;
    findings.push({
      file: sourcePath,
      line,
      kind,
      key: suggestedKey(sourcePath, text),
      text,
    });
  }
}

function sourceFiles(directory) {
  if (!statSafe(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(tsx?|jsx?)$/.test(entry.name) ? [path] : [];
  });
}

function statSafe(path) {
  try {
    return statSync(path);
  } catch {
    return null;
  }
}

function normalize(value) {
  return value.replace(/\s+/g, " ").trim();
}

function propertyName(node) {
  if (ts.isIdentifier(node) || ts.isStringLiteralLike(node)) return node.text;
  return "";
}

function isStyleElement(node) {
  return (
    ts.isJsxElement(node) &&
    node.openingElement.tagName.getText().toLowerCase() === "style"
  );
}

function looksUserFacing(value) {
  if (!value || value.length < 2 || !/[A-Za-z]/.test(value)) return false;
  if (/^(https?:|\/|[A-Z0-9_]+)$/.test(value)) return false;
  if (/^[a-z][a-zA-Z0-9]*(\.[a-zA-Z0-9]+)+$/.test(value)) return false;
  if (
    /\b(?:bg|border|flex|grid|hover|items|justify|leading|m[trblxy]?|p[trblxy]?|rounded|shadow|size|space|text|tracking|transition|w|h)-/.test(
      value,
    )
  ) {
    return false;
  }
  return true;
}

function suggestedKey(file, text) {
  const area = file
    .replace(/\.(tsx?|jsx?)$/, "")
    .replaceAll(/[^a-zA-Z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .toLowerCase();
  const digest = createHash("sha1").update(text).digest("hex").slice(0, 10);
  return `tenant.${area}.${digest}`;
}
