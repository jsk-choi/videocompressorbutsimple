import { useRef, useState } from "react";
import { useFileTree } from "./hooks/useFileTree";
import { useQueueResolution } from "./hooks/useQueueResolution";
import { FileTree } from "./components/FileTree";
import { QueuePanel } from "./components/QueuePanel";

const PANEL_KEY = "panel-left-pct";
const DEFAULT_PCT = 30;

export default function App() {
  const [leftPct, setLeftPct] = useState(() => {
    const saved = localStorage.getItem(PANEL_KEY);
    return saved ? Math.min(Math.max(Number(saved), 15), 70) : DEFAULT_PCT;
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const leftPctRef = useRef(leftPct);
  leftPctRef.current = leftPct;

  const { error, clearSelection, entryMap, ...treeProps } = useFileTree();
  const queue = useQueueResolution(treeProps.selected, entryMap);

  const onDividerMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMove = (ev: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((ev.clientX - rect.left) / rect.width) * 100;
      setLeftPct(Math.min(Math.max(pct, 15), 70));
    };

    const onUp = () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      localStorage.setItem(PANEL_KEY, String(leftPctRef.current));
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <div className="app">
      <header className="app-header">
        <span className="app-logo">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="23 7 16 12 23 17 23 7" />
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
          </svg>
        </span>
        <h1>videocompressorbutsimple</h1>
      </header>

      <div className="app-body" ref={containerRef}>
        <div className="panel panel-left" style={{ width: `${leftPct}%`, flex: "none" }}>
          <div className="panel-header">
            <span className="panel-title">Files</span>
          </div>
          <div className="panel-scroll">
            {error
              ? <div className="error-banner">Error: {error}</div>
              : <FileTree {...treeProps} />
            }
          </div>
        </div>

        <div className="panel-divider" onMouseDown={onDividerMouseDown} />

        <div className="panel panel-right">
          <QueuePanel {...queue} onClearSelection={clearSelection} />
        </div>
      </div>
    </div>
  );
}
