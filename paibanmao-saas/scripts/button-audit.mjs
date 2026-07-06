import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = path.resolve("src");
const files = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(filePath);
    } else if (entry.isFile() && filePath.endsWith(".tsx")) {
      files.push(filePath);
    }
  }
}

function tagName(node) {
  const tag = node.tagName;
  if (!tag) return "";
  if (ts.isIdentifier(tag)) return tag.text;
  if (ts.isPropertyAccessExpression(tag)) return tag.getText();
  return "";
}

function hasJsxAttribute(node, name) {
  return node.attributes.properties.some((property) => ts.isJsxAttribute(property) && property.name.text === name);
}

function lineOf(sourceFile, node) {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

function inspectJsxOpening(node, sourceFile, insideForm, issues) {
  const name = tagName(node);

  if (name === "button" && !hasJsxAttribute(node, "type")) {
    issues.push({
      file: path.relative(process.cwd(), sourceFile.fileName),
      line: lineOf(sourceFile, node),
      message: "原生 <button> 必须显式声明 type，避免误提交或提交失效。",
    });
  }

  if (name === "Button" && insideForm && !hasJsxAttribute(node, "type")) {
    issues.push({
      file: path.relative(process.cwd(), sourceFile.fileName),
      line: lineOf(sourceFile, node),
      message: "表单内 <Button> 必须显式声明 type=\"submit\" 或 type=\"button\"。",
    });
  }
}

function scanNode(node, sourceFile, insideForm, issues) {
  if (ts.isJsxElement(node)) {
    const name = tagName(node.openingElement);
    const nextInsideForm = insideForm || name === "form";
    inspectJsxOpening(node.openingElement, sourceFile, insideForm, issues);

    for (const child of node.children) {
      scanNode(child, sourceFile, nextInsideForm, issues);
    }
    return;
  }

  if (ts.isJsxSelfClosingElement(node)) {
    inspectJsxOpening(node, sourceFile, insideForm, issues);
    return;
  }

  ts.forEachChild(node, (child) => scanNode(child, sourceFile, insideForm, issues));
}

walk(root);

const issues = [];

for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  scanNode(sourceFile, sourceFile, false, issues);
}

if (issues.length) {
  console.error("按钮可靠性检查失败：");
  for (const issue of issues) {
    console.error(`- ${issue.file}:${issue.line} ${issue.message}`);
  }
  process.exit(1);
}

console.log("按钮可靠性检查通过。");
