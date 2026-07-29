import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";

import { tenantLocalizationAudit } from "./audit-tenant-localization.mjs";

const root = resolve(import.meta.dirname, "..");
const sourceRoot = resolve(root, "apps/web/src");
const require = createRequire(resolve(root, "apps/web/package.json"));
const ts = require("typescript");
const findingsByFile = Map.groupBy(
  tenantLocalizationAudit.findings,
  ({ file }) => file,
);
let transformedMessages = 0;
let skippedMessages = 0;

for (const [sourcePath, findings] of findingsByFile) {
  const file = resolve(sourceRoot, sourcePath);
  const source = readFileSync(file, "utf8");
  const sourceFile = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    sourcePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const findingsByIdentity = new Map(
    findings.map((finding) => [
      `${finding.line}:${finding.kind}:${finding.text}`,
      finding,
    ]),
  );
  const replacements = [];
  const owners = new Set();
  let usesTenantMessage = false;

  visit(sourceFile);

  if (!replacements.length) {
    skippedMessages += findings.length;
    continue;
  }

  for (const owner of owners) {
    if (!owner.body || !ts.isBlock(owner.body)) continue;
    const bodyText = owner.body.getText(sourceFile);
    if (/\buseTenantLocalization\s*\(\s*\)/.test(bodyText)) continue;
    replacements.push({
      start: owner.body.getStart(sourceFile) + 1,
      end: owner.body.getStart(sourceFile) + 1,
      text: "\n  const { tText } = useTenantLocalization();",
    });
  }

  if (
    owners.size > 0 &&
    !source.includes(
      'from "@/lib/tenant-localization"',
    ) &&
    !source.includes(
      "from '@/lib/tenant-localization'",
    )
  ) {
    const importPosition = importInsertionPosition(sourceFile);
    replacements.push({
      start: importPosition,
      end: importPosition,
      text:
        '\nimport { useTenantLocalization } from "@/lib/tenant-localization";',
    });
  }
  if (
    usesTenantMessage &&
    !source.includes('from "@/i18n/tenant-message"') &&
    !source.includes("from '@/i18n/tenant-message'")
  ) {
    const importPosition = importInsertionPosition(sourceFile);
    replacements.push({
      start: importPosition,
      end: importPosition,
      text: '\nimport { tenantMessage } from "@/i18n/tenant-message";',
    });
  }

  const uniqueReplacements = [
    ...new Map(
      replacements.map((replacement) => [
        `${replacement.start}:${replacement.end}`,
        replacement,
      ]),
    ).values(),
  ].sort((left, right) => right.start - left.start);
  let output = source;
  for (const replacement of uniqueReplacements) {
    output =
      output.slice(0, replacement.start) +
      replacement.text +
      output.slice(replacement.end);
  }
  writeFileSync(file, output);

  function visit(node) {
    const candidate = findingForNode(node);
    if (candidate && !insideTText(node)) {
      const owner = componentOwner(node);
      if (owner?.body && ts.isBlock(owner.body)) {
        const replacement = replacementFor(node, candidate);
        if (replacement) {
          replacements.push(replacement);
          owners.add(owner);
          transformedMessages += 1;
        }
      } else {
        const replacement = staticReplacementFor(node, candidate);
        if (replacement) {
          replacements.push(replacement);
          usesTenantMessage = true;
          transformedMessages += 1;
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  function findingForNode(node) {
    const line =
      sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line +
      1;
    for (const [kind, text] of nodeCandidates(node)) {
      const finding = findingsByIdentity.get(`${line}:${kind}:${text}`);
      if (finding) return { ...finding, kind };
    }
    return null;
  }

  function replacementFor(node, finding) {
    const call = `tText(${JSON.stringify(finding.text)})`;
    if (ts.isJsxText(node)) {
      return {
        start: node.getStart(sourceFile),
        end: node.getEnd(),
        text: `{${call}}`,
      };
    }
    if (
      ts.isJsxAttribute(node) &&
      node.initializer &&
      ts.isStringLiteral(node.initializer)
    ) {
      return {
        start: node.initializer.getStart(sourceFile),
        end: node.initializer.getEnd(),
        text: `{${call}}`,
      };
    }
    if (
      ts.isPropertyAssignment(node) &&
      ts.isStringLiteralLike(node.initializer)
    ) {
      return {
        start: node.initializer.getStart(sourceFile),
        end: node.initializer.getEnd(),
        text: call,
      };
    }
    if (ts.isCallExpression(node) && node.arguments[0]) {
      return {
        start: node.arguments[0].getStart(sourceFile),
        end: node.arguments[0].getEnd(),
        text: call,
      };
    }
    if (
      ts.isJsxExpression(node) &&
      node.expression &&
      ts.isStringLiteralLike(node.expression)
    ) {
      return {
        start: node.expression.getStart(sourceFile),
        end: node.expression.getEnd(),
        text: call,
      };
    }
    if (
      finding.kind === "nested-jsx-string" &&
      ts.isStringLiteralLike(node)
    ) {
      return {
        start: node.getStart(sourceFile),
        end: node.getEnd(),
        text: call,
      };
    }
    return null;
  }

  function staticReplacementFor(node, finding) {
    const call = `tenantMessage(${JSON.stringify(finding.text)})`;
    if (
      ts.isPropertyAssignment(node) &&
      ts.isStringLiteralLike(node.initializer)
    ) {
      return {
        start: node.initializer.getStart(sourceFile),
        end: node.initializer.getEnd(),
        text: call,
      };
    }
    if (ts.isCallExpression(node) && node.arguments[0]) {
      return {
        start: node.arguments[0].getStart(sourceFile),
        end: node.arguments[0].getEnd(),
        text: call,
      };
    }
    return null;
  }

  function nodeCandidates(node) {
    if (ts.isJsxText(node) && !isStyleElement(node.parent)) {
      return [["jsx-text", normalize(node.text)]];
    }
    if (
      ts.isJsxAttribute(node) &&
      node.initializer &&
      ts.isStringLiteral(node.initializer)
    ) {
      const name = node.name.getText(sourceFile);
      return [[`attribute:${name}`, normalize(node.initializer.text)]];
    }
    if (
      ts.isPropertyAssignment(node) &&
      ts.isStringLiteralLike(node.initializer)
    ) {
      const name = propertyName(node.name);
      return [[`property:${name}`, normalize(node.initializer.text)]];
    }
    if (ts.isCallExpression(node) && node.arguments[0]) {
      const name = node.expression.getText(sourceFile).split(".").at(-1);
      const argument = node.arguments[0];
      if (ts.isStringLiteralLike(argument)) {
        return [[`call:${name}`, normalize(argument.text)]];
      }
    }
    if (
      ts.isJsxExpression(node) &&
      node.expression &&
      ts.isStringLiteralLike(node.expression)
    ) {
      return [["jsx-expression", normalize(node.expression.text)]];
    }
    if (
      ts.isStringLiteralLike(node) &&
      isNestedDisplayExpression(node)
    ) {
      return [["nested-jsx-string", normalize(node.text)]];
    }
    return [];
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
      if (
        ts.isConditionalExpression(current) &&
        contains(current.condition, node)
      ) {
        return false;
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
          contains(current.left, node)
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
}

console.log(
  `Connected ${transformedMessages} tenant messages to the localization runtime. ` +
    `${skippedMessages} module-level messages require explicit translation at their render boundary.`,
);

function componentOwner(node) {
  let current = node.parent;
  while (current) {
    if (ts.isFunctionLike(current)) {
      const name = functionName(current);
      if (name && /^[A-Z]/.test(name)) return current;
    }
    current = current.parent;
  }
  return null;
}

function functionName(node) {
  if (node.name) return node.name.getText();
  if (ts.isVariableDeclaration(node.parent)) return node.parent.name.getText();
  return "";
}

function insideTText(node) {
  let current = node.parent;
  while (current) {
    if (
      ts.isCallExpression(current) &&
      ["tText", "tenantMessage"].includes(
        current.expression.getText().split(".").at(-1),
      )
    ) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

function importInsertionPosition(sourceFile) {
  const imports = sourceFile.statements.filter(ts.isImportDeclaration);
  if (imports.length) return imports.at(-1).getEnd();
  const first = sourceFile.statements[0];
  return first?.getEnd() ?? 0;
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
