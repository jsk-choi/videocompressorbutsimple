import { FileEntry } from "../types";

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

const IconChevronRight = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const IconChevronDown = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const IconFolder = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M10 4H2a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-10l-2-2z" />
  </svg>
);

const IconVideo = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
    <line x1="7" y1="2" x2="7" y2="22" />
    <line x1="17" y1="2" x2="17" y2="22" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <line x1="2" y1="7" x2="7" y2="7" />
    <line x1="2" y1="17" x2="7" y2="17" />
    <line x1="17" y1="17" x2="22" y2="17" />
    <line x1="17" y1="7" x2="22" y2="7" />
  </svg>
);

const IconFile = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
    <polyline points="13 2 13 9 20 9" />
  </svg>
);

interface Props {
  entry: FileEntry;
  depth: number;
  isExpanded: boolean;
  isLoading: boolean;
  isSelected: boolean;
  children?: React.ReactNode;
  onToggleExpand: () => void;
  onRowClick: (e: React.MouseEvent) => void;
  onCheckboxToggle: () => void;
}

export function FileNode({
  entry, depth, isExpanded, isLoading, isSelected,
  children, onToggleExpand, onRowClick, onCheckboxToggle,
}: Props) {
  const isDir = entry.type === "directory";

  return (
    <div className="file-node">
      <div
        className={`file-row${isSelected ? " selected" : ""}`}
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
        onClick={onRowClick}
      >
        {/* expand / collapse toggle */}
        <span
          className="expand-btn"
          onClick={(e) => { e.stopPropagation(); if (isDir) onToggleExpand(); }}
          aria-label={isDir ? (isExpanded ? "Collapse" : "Expand") : undefined}
        >
          {isDir ? (isExpanded ? <IconChevronDown /> : <IconChevronRight />) : null}
        </span>

        {/* checkbox */}
        <input
          type="checkbox"
          className="file-checkbox"
          checked={isSelected}
          onChange={onCheckboxToggle}
          onClick={(e) => e.stopPropagation()}
        />

        {/* icon */}
        <span className={`file-icon${isDir ? " is-dir" : entry.is_video ? " is-video" : ""}`}>
          {isDir ? <IconFolder /> : entry.is_video ? <IconVideo /> : <IconFile />}
        </span>

        {/* name */}
        <span className="file-name">{entry.name}</span>

        {/* size */}
        {entry.size !== null && (
          <span className="file-size">{formatSize(entry.size)}</span>
        )}
      </div>

      {isDir && isExpanded && (
        <div className="file-children">
          {isLoading
            ? <div className="loading-indicator">Loading…</div>
            : children ?? <div className="empty-dir">Empty folder</div>
          }
        </div>
      )}
    </div>
  );
}
