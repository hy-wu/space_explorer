export type SymbolInfo = {
  id: string;
  name: string;
  kind: "function" | "class" | "interface" | "variable" | "type" | "module";
  exported?: boolean;
};

export type ParsedModule = {
  filePath: string;
  imports: string[];
  symbols: SymbolInfo[];
};

export interface CodeParserAdapter {
  supports(filePath: string): boolean;
  parseModule(filePath: string, source: string): Promise<ParsedModule>;
}
