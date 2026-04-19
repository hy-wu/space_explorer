import type { CodeParserAdapter, ParsedModule, SymbolInfo } from "./codeParserAdapter";

export class SimpleCodeParserAdapter implements CodeParserAdapter {
  supports(filePath: string): boolean {
    return /\.(ts|tsx|js|jsx|py|c|cpp|cc|cxx|h|hpp|cu|cuh)$/i.test(filePath);
  }

  async parseModule(filePath: string, source: string): Promise<ParsedModule> {
    const imports: string[] = [];
    const symbols: SymbolInfo[] = [];

    const ext = filePath.split(".").pop()?.toLowerCase() || "";
    const isPython = ext === "py";
    const isCpp = ["c", "cpp", "cc", "cxx", "h", "hpp", "cu", "cuh"].includes(ext);

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
    } else if (isCpp) {
      // Extract C/C++/CUDA includes
      const includeRegex = /#include\s+["<]([^">]+)[">]/g;
      let match;
      while ((match = includeRegex.exec(source)) !== null) {
        if (match[1]) {
          // Remove extension for matching file nodes in graph
          imports.push(match[1].replace(/\.(h|hpp|cuh)$/, ""));
        }
      }

      // Extract C++ Classes/Structs
      const classRegex = /^(?:class|struct)\s+([a-zA-Z0-9_]+)/gm;
      while ((match = classRegex.exec(source)) !== null) {
        if (match[1]) {
          symbols.push({
            id: `${filePath}:${match[1]}`,
            name: match[1],
            kind: "class",
            exported: true,
          });
        }
      }

      // Extract Functions (including CUDA kernels)
      // Matches: void func(, int func(, __global__ void kernel(
      const funcRegex = /^(?:[\w:*&]+\s+){0,3}(?:__global__|__device__|__host__)?\s*[\w:*&]+\s+([\w]+)\s*\(/gm;
      while ((match = funcRegex.exec(source)) !== null) {
        const name = match[1];
        if (name && !["if", "while", "for", "switch", "return"].includes(name)) {
          symbols.push({
            id: `${filePath}:${name}`,
            name,
            kind: "function",
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
