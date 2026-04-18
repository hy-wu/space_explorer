import type { CodeParserAdapter, ParsedModule, SymbolInfo } from "./codeParserAdapter";

export class SimpleCodeParserAdapter implements CodeParserAdapter {
  supports(filePath: string): boolean {
    return /\.(ts|tsx|js|jsx|py)$/i.test(filePath);
  }

  async parseModule(filePath: string, source: string): Promise<ParsedModule> {
    const imports: string[] = [];
    const symbols: SymbolInfo[] = [];

    const isPython = /\.py$/i.test(filePath);

    if (isPython) {
      // Extract python imports
      const pyImportRegex = /^from\s+([a-zA-Z0-9_.]+)\s+import|^import\s+([a-zA-Z0-9_.]+)/gm;
      let match;
      while ((match = pyImportRegex.exec(source)) !== null) {
        const moduleName = match[1] || match[2];
        if (moduleName) {
          imports.push(moduleName.replace(/\./g, "/"));
        }
      }

      // Extract python classes and functions
      const pySymbolRegex = /^(?:async\s+)?(?:def|class)\s+([a-zA-Z0-9_]+)/gm;
      while ((match = pySymbolRegex.exec(source)) !== null) {
        const name = match[1];
        if (name) {
          const kindStr = match[0].includes("class") ? "class" : "function";
          symbols.push({
            id: `${filePath}:${name}`,
            name,
            kind: kindStr,
            exported: true,
          });
        }
      }
    } else {
      // Extract JS/TS imports
      const importRegex = /import\s+[\s\S]*?from\s+['"]([^'"]+)['"]/g;
      let match;
      while ((match = importRegex.exec(source)) !== null) {
        if (match[1]) imports.push(match[1]);
      }

      // Extract JS/TS basic exports
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
          
          symbols.push({
            id: `${filePath}:${name}`,
            name,
            kind,
            exported: true,
          });
        }
      }
    }

    return { filePath, imports, symbols };
  }
}
