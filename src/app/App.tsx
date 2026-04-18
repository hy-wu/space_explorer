import { lazy, Suspense } from "react";
import { InspectorPanel } from "@/features/inspector/InspectorPanel";
import { SearchPanel } from "@/features/search/SearchPanel";
import { SearchResultsPanel } from "@/features/search/SearchResultsPanel";
import { WorkspaceSidebar } from "@/features/workspace/WorkspaceSidebar";
import { useWorkspaceStore } from "@/store/workspaceStore";

const GraphScene = lazy(() =>
  import("@/features/graph/GraphScene").then((module) => ({
    default: module.GraphScene,
  })),
);

export function App() {
  const selectedNode = useWorkspaceStore((state) => state.selectedNodeId);

  return (
    <div className="shell">
      <aside className="shell__left">
        <WorkspaceSidebar />
        <p/>
        <InspectorPanel selectedNodeId={selectedNode} />
      </aside>
      <main className="shell__main">
        <header className="topbar">
          <div>
            <p className="eyebrow">Graph-first browser / OS / IDE</p>
            <h1>Graph Workspace</h1>
            <p className="sub_note">On blank: Left-click: rotate, Right-click: pan. On web node: Right-click: open, Double-left-click: search.</p>
          </div>
          <SearchPanel />
        </header>
        <section className="canvas-card">
          <Suspense fallback={<div className="canvas-loading">Loading graph engine...</div>}>
            <GraphScene />
          </Suspense>
        </section>
      </main>
      <aside className="shell__right">
        <SearchResultsPanel />
      </aside>
    </div>
  );
}
