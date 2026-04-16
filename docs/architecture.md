# Architecture

## Vision

Build a graph-native workspace where browsing, file management, coding, note-taking, reading, and AI search all happen inside the same spatial interface.

The key idea is:

- everything is a node
- every useful relationship is an edge
- layout carries meaning
- AI helps create and refine the graph, but the user stays in control

## Design Principles

### 1. Local-first

User data, graph layouts, metadata, and indexes should live locally by default.

### 2. One domain model

Tabs, files, notes, code symbols, papers, and AI answers use the same entity and relation model.

### 3. Progressive capability

The app should work as:

1. a graph browser for documents and tabs
2. a personal knowledge workspace
3. an IDE with code graph views
4. an AI-native search and synthesis surface

### 4. Reuse existing wheels

Avoid building custom engines when mature libraries already exist:

- graph rendering: `react-force-graph-3d`
- editor: `Monaco Editor`
- persistence: `Dexie`
- desktop permission bridge: `Tauri`
- parsing: `tree-sitter` or language-specific analyzers like `ts-morph`
- vector search: `sqlite + sqlite-vec` or a light embedding service later

## Recommended MVP Stack

### Frontend

- `React`
- `TypeScript`
- `Vite`
- `Zustand`
- `react-force-graph-3d`

### Desktop shell

- `Tauri`

Why not build directly as a browser extension first:

- you want folder access, IDE-like flows, and OS-level orchestration
- desktop packaging is the cleaner long-term base
- the UI can still stay web-tech based

### Data and storage

- `Dexie` for local structured metadata
- file contents from disk through an adapter
- optional `sqlite` later for stronger indexing and vector search

## Layered Architecture

```text
UI Layer
  Graph canvas / editor / inspector / search / workspace chrome

Application Layer
  Commands, queries, orchestration, layout logic, search actions

Domain Layer
  Node/edge model, entity types, graph policies, ranking contracts

Infrastructure Layer
  File system adapter, parser adapter, AI adapter, storage adapter
```

## Core Modules

### 1. Graph Engine

Responsible for:

- storing visible nodes and edges
- applying layout strategies
- pinning user-moved nodes
- clustering and filtering
- translating search/code/file results into graph coordinates

Important rule:

User layout edits override automatic layout for pinned nodes.

### 2. Workspace Registry

Responsible for:

- tracking opened folders
- syncing file system entities into graph entities
- mapping resources to viewers/editors
- remembering recent sessions

### 3. Search Orchestrator

Responsible for:

- lexical search
- semantic search
- AI answer generation
- projecting results into graph space

Search visualization policy:

- the query becomes a central anchor node
- higher relevance means smaller radius to the query
- higher mutual similarity means stronger attraction between result nodes
- user adjustments are persisted as graph layout hints

### 4. Code Intelligence

Responsible for:

- parsing source files
- extracting symbols, imports, references, and ownership
- generating code graph nodes and edges
- powering IDE inspector panels

MVP recommendation:

- support `TypeScript/JavaScript` first with `ts-morph`
- add `tree-sitter` later for multi-language support

### 5. Content Adapters

Each content type gets a lightweight adapter:

- `file`
- `folder`
- `tab`
- `note`
- `paper`
- `tutorial`
- `symbol`
- `search_result`
- `ai_answer`

Each adapter provides:

- metadata extraction
- preview rendering
- relation extraction
- optional open/edit behavior

### 6. AI Adapter

Responsible for:

- embedding requests
- search answer generation
- summarization
- relation suggestion
- optional auto-tagging

This layer must stay provider-agnostic.

## Domain Model

### Node

```ts
type EntityKind =
  | "workspace"
  | "folder"
  | "file"
  | "tab"
  | "note"
  | "paper"
  | "tutorial"
  | "symbol"
  | "search_query"
  | "search_result"
  | "ai_answer";
```

```ts
type GraphNode = {
  id: string;
  kind: EntityKind;
  title: string;
  uri?: string;
  tags: string[];
  score?: number;
  pinned?: boolean;
  position?: { x: number; y: number; z: number };
  meta: Record<string, unknown>;
};
```

### Edge

```ts
type RelationKind =
  | "contains"
  | "references"
  | "imports"
  | "similar_to"
  | "related_to"
  | "opened_with"
  | "generated_from"
  | "answers";
```

```ts
type GraphEdge = {
  id: string;
  source: string;
  target: string;
  kind: RelationKind;
  weight?: number;
  directed?: boolean;
  meta: Record<string, unknown>;
};
```

## Data Flow

### Folder indexing

1. user grants folder access
2. file adapter enumerates files
3. metadata extractor creates file nodes
4. parser extracts symbols and relations for supported files
5. store persists nodes, edges, and layout hints
6. graph canvas renders the workspace graph

### AI search

1. user submits a query
2. search orchestrator creates a `search_query` node
3. lexical and semantic retrieval return candidate resources
4. AI synthesizer optionally creates an `ai_answer` node
5. layout engine positions nodes by relevance and similarity
6. user drags nodes to refine the map
7. positions are saved as user intent

## Layout Strategy

Use mixed layout modes instead of one universal algorithm.

### Mode 1: Force layout

Good for:

- general exploration
- mixed-content workspaces
- search result maps

### Mode 2: Hierarchical layout

Good for:

- folders
- code ownership
- AST/module structure

### Mode 3: Radial query layout

Good for:

- search result visualization
- topic-centered reading clusters

Recommendation:

Start with one 3D force graph, but keep layout mode as a pluggable strategy.

## File System Permissions

### Browser-compatible MVP

Use File System Access API when available:

- fastest path for a prototype
- easiest way to validate product feel

### Desktop target

Use Tauri commands for:

- folder picking
- recursive file listing
- reading file contents
- file watching
- opening files externally if needed

Keep permission logic inside an adapter interface so the frontend does not care whether the source is browser-native or Tauri-native.

## Code Graph for IDE Use

The code graph should not start as a full-blown language server replacement.

MVP:

- file node
- symbol nodes for exported items
- import edges between files
- contains edges from file to symbol
- references from symbol to symbol when cheap to derive

Views:

- graph view for modules
- outline panel for current file
- Monaco editor for text
- inspector panel for selected node metadata

## Suggested Monorepo Shape

```text
/
  docs/
  src/
    app/
    components/
    domain/
    features/
      graph/
      workspace/
      search/
      editor/
      inspector/
    infrastructure/
      ai/
      fs/
      parser/
      storage/
    store/
    styles/
  src-tauri/
```

## Implementation Roadmap

### Phase 1: Graph workspace shell

- graph canvas
- sample entities
- node selection
- inspector
- persistent layout

### Phase 2: Folder workspace

- folder picker
- local file scan
- file nodes and folder nodes
- content preview

### Phase 3: IDE graph

- TypeScript parsing
- import graph
- symbol graph
- file-to-editor linking

### Phase 4: AI search map

- query node
- search results as nodes
- answer node
- semantic similarity edges

### Phase 5: Mixed workspace

- tabs, notes, papers, tutorials in one graph
- saved workspaces
- cross-source relations

## Why This Is A Good First Vibe-Coding Project

Because the product is ambitious, but the MVP can still be very small and satisfying:

- a graph canvas with draggable nodes
- a folder importer
- a code outline
- a search map

That is enough to feel the core product idea without getting trapped building a full browser or full IDE too early.
