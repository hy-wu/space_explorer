# Graph Workspace

Graph Workspace is a graph-first desktop workspace for tabs, files, code, notes, papers, and AI search results.

This repository starts with an MVP architecture aimed at a first "vibe-coding" project:

- one graph to represent everything
- local-first data ownership
- visual search and clustering
- folder permission support
- code structure visualization for IDE scenarios

## Stack

- `React + TypeScript + Vite` for the UI shell
- `Zustand` for app state
- `react-force-graph-3d` for the graph canvas
- `Dexie` for local metadata/index storage
- `Monaco Editor` for code editing
- `Zod` for typed boundaries between modules
- `Tauri` as the planned desktop shell for file system and OS capabilities

The current codebase focuses on:

1. a clean architecture
2. a minimal UI shell
3. domain models that can scale from tabs to code graphs

## Product Direction

The app treats every resource as an entity in one shared graph:

- browser tabs
- files and folders
- notes
- code symbols
- papers and tutorials
- AI search results

Relations become first-class:

- `references`
- `imports`
- `contains`
- `similar_to`
- `opened_with`
- `generated_from`

## Run

Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

## Structure

- [`docs/architecture.md`](C:\Users\hy-wu.DESKTOP-G355NC5\Documents\New%20project\docs\architecture.md): product and system architecture
- [`src/domain`](C:\Users\hy-wu.DESKTOP-G355NC5\Documents\New%20project\src\domain): core graph entities and contracts
- [`src/features`](C:\Users\hy-wu.DESKTOP-G355NC5\Documents\New%20project\src\features): graph, workspace, search, inspector, editor
- [`src/store`](C:\Users\hy-wu.DESKTOP-G355NC5\Documents\New%20project\src\store): app state

## MVP Scope

The first usable version should support:

1. open a folder
2. index files into graph nodes
3. open notes/files/tabs as cards in the graph
4. visualize code structure for one file or module
5. show AI search results as nodes positioned by relevance and similarity
6. persist layout changes locally

## Next Milestones

1. add Tauri shell and folder permission bridge
2. add local indexing and embeddings pipeline
3. add code parsers for TypeScript first
4. add AI search orchestration
5. add multi-pane graph/editor workflow
