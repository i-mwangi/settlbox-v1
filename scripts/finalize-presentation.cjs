const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
function files(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(path.join(directory, entry.name)) : [path.join(directory, entry.name)]);
}
for (const file of files("presentation").filter(file => /\.[jt]sx?$/.test(file))) {
  const parsed = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
  const transformed = ts.transform(parsed, [context => {
    function visit(node) {
      if (ts.isFunctionDeclaration(node) && !node.type && node.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.AsyncKeyword) && node.body?.statements.length === 1 && ts.isThrowStatement(node.body.statements[0])) {
        return ts.factory.updateFunctionDeclaration(node, node.modifiers, node.asteriskToken, node.name, node.typeParameters, node.parameters, ts.factory.createTypeReferenceNode("Promise", [ts.factory.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword)]), node.body);
      }
      return ts.visitEachChild(node, visit, context);
    }
    return node => ts.visitNode(node, visit);
  }]);
  fs.writeFileSync(file, ts.createPrinter({ removeComments: true }).printFile(transformed.transformed[0]));
  transformed.dispose();
}
