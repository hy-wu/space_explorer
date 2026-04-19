import type { CodeParserAdapter, ParsedModule, SymbolInfo } from "./codeParserAdapter";

const KEYWORDS = new Set([
  "if", "else", "for", "while", "do", "switch", "case", "default", "break", "continue",
  "return", "try", "catch", "finally", "throw", "async", "await", "yield", "let", "const",
  "var", "function", "class", "extends", "implements", "interface", "type", "export",
  "import", "from", "as", "default", "static", "public", "private", "protected",
  "void", "int", "float", "double", "char", "bool", "boolean", "string", "number",
  "struct", "namespace", "using", "include", "define", "ifdef", "endif",
  "def", "pass", "None", "True", "False", "lambda"
]);

export class SimpleCodeParserAdapter implements CodeParserAdapter {
  supports(filePath: string): boolean {
    return /\.(ts|tsx|js|jsx|py|c|cpp|cc|cxx|h|hpp|cu|cuh)$/i.test(filePath);
  }

  async parseModule(filePath: string, source: string): Promise<ParsedModule> {
    const imports: string[] = [];
    const symbols: SymbolInfo[] = [];
    const references = new Set<string>();

    const ext = filePath.split(".").pop()?.toLowerCase() || "";
    const isPython = ext === "py";
    const isCpp = ["c", "cpp", "cc", "cxx", "h", "hpp", "cu", "cuh"].includes(ext);

    if (isPython) {
      const pyImportRegex = /^from\s+([a-zA-Z0-9_.]+)\s+import|^import\s+([a-zA-Z0-9_.]+)/gm;
      let match;
      while ((match = pyImportRegex.exec(source)) !== null) {
        const moduleName = match[1] || match[2];
        if (moduleName) imports.push(moduleName.replace(/\./g, "/"));
      }

      const pySymbolRegex = /^(?:async\s+)?(?:def|class)\s+([a-zA-Z0-9_]+)/gm;
      while ((match = pySymbolRegex.exec(source)) !== null) {
        if (match[1]) {
          symbols.push({
            id: `${filePath}:${match[1]}`,
            name: match[1],
            kind: match[0].includes("class") ? "class" : "function",
            exported: true,
          });
        }
      }
    } else if (isCpp) {
      const includeRegex = /#include\s+["<]([^">]+)[">]/g;
      let match;
      while ((match = includeRegex.exec(source)) !== null) {
        if (match[1]) imports.push(match[1].replace(/\.(h|hpp|cuh)$/, ""));
      }

      const classRegex = /^(?:class|struct)\s+([a-zA-Z0-9_]+)/gm;
      while ((match = classRegex.exec(source)) !== null) {
        if (match[1]) {
          symbols.push({ id: `${filePath}:${match[1]}`, name: match[1], kind: "class", exported: true });
        }
      }

      const funcRegex = /^(?:[\w:*&]+\s+){0,3}(?:__global__|__device__|__host__)?\s*[\w:*&]+\s+([\w]+)\s*\(/gm;
      while ((match = funcRegex.exec(source)) !== null) {
        const name = match[1];
        if (name && !KEYWORDS.has(name)) {
          symbols.push({ id: `${filePath}:${name}`, name, kind: "function", exported: true });
        }
      }
    } else {
      const importRegex = /import\s+[\s\S]*?from\s+['"]([^'"]+)['"]/g;
      let match;
      while ((match = importRegex.exec(source)) !== null) {
        if (match[1]) imports.push(match[1]);
      }

      const exportRegex = /export\s+(?:async\s+)?(?:default\s+)?(function|const|let|var|class|interface|type)\s+([a-zA-Z0-9_]+)/g;
      while ((match = exportRegex.exec(source)) !== null) {
        const kindStr = match[1];
        const name = match[2];
        if (name) {
          let kind: SymbolInfo["kind"] = "variable";
          if (kindStr === "function") kind = "function";
          else if (kindStr === "class") kind = "class";
          else if (kindStr === "interface") kind = "interface";
          else if (kindStr === "type") kind = "type";
          symbols.push({ id: `${filePath}:${name}`, name, kind, exported: true });
        }
      }
    }

    const definedInFile = new Set(symbols.map(s => s.name));
    const words = source.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g) || [];
    for (const word of words) {
      if (!KEYWORDS.has(word) && !definedInFile.has(word)) {
        references.add(word);
      }
    }

    return { filePath, imports, symbols, references: Array.from(references) };
  }
}
