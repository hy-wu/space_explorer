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
  references: string[]; // List of potential symbol names used in this file
};

export interface CodeParserAdapter {
  supports(filePath: string): boolean;
  parseModule(filePath: string, source: string): Promise<ParsedModule>;
}
