import { FileEntry } from "../types";
import { UseFileTreeReturn } from "../hooks/useFileTree";
import { FileNode } from "./FileNode";

type Props = Omit<UseFileTreeReturn, "clearSelection" | "error">;

function renderEntries(
  entries: FileEntry[],
  depth: number,
  props: Props
): React.ReactNode {
  const { expanded, childrenMap, loadingDirs, selected, toggleExpand, onRowClick, onCheckboxToggle } = props;

  return entries.map((entry) => {
    const isExpanded = expanded.has(entry.path);
    const isLoading = loadingDirs.has(entry.path);
    const children = childrenMap.get(entry.path) ?? [];

    return (
      <FileNode
        key={entry.path}
        entry={entry}
        depth={depth}
        isExpanded={isExpanded}
        isLoading={isLoading}
        isSelected={selected.has(entry.path)}
        onToggleExpand={() => toggleExpand(entry)}
        onRowClick={(e) => onRowClick(entry, e)}
        onCheckboxToggle={() => onCheckboxToggle(entry)}
      >
        {isExpanded && !isLoading
          ? renderEntries(children, depth + 1, props)
          : null}
      </FileNode>
    );
  });
}

export function FileTree(props: Props) {
  return (
    <div className="file-tree" role="tree">
      {renderEntries(props.rootEntries, 0, props)}
    </div>
  );
}
