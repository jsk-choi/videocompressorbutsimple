import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchDirectory } from "../api";
import { FileEntry } from "../types";

export interface FlatEntry {
  entry: FileEntry;
  depth: number;
}

export interface UseFileTreeReturn {
  rootEntries: FileEntry[];
  expanded: Set<string>;
  childrenMap: Map<string, FileEntry[]>;
  entryMap: Map<string, FileEntry>;
  loadingDirs: Set<string>;
  selected: Set<string>;
  error: string | null;
  toggleExpand: (entry: FileEntry) => void;
  onRowClick: (entry: FileEntry, e: React.MouseEvent) => void;
  onCheckboxToggle: (entry: FileEntry) => void;
  clearSelection: () => void;
}

function flattenVisible(
  entries: FileEntry[],
  expanded: Set<string>,
  childrenMap: Map<string, FileEntry[]>,
  depth = 0
): FlatEntry[] {
  const result: FlatEntry[] = [];
  for (const entry of entries) {
    result.push({ entry, depth });
    if (entry.type === "directory" && expanded.has(entry.path)) {
      result.push(
        ...flattenVisible(childrenMap.get(entry.path) ?? [], expanded, childrenMap, depth + 1)
      );
    }
  }
  return result;
}

export function useFileTree(): UseFileTreeReturn {
  const [rootEntries, setRootEntries] = useState<FileEntry[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [childrenMap, setChildrenMap] = useState<Map<string, FileEntry[]>>(new Map());
  const [loadingDirs, setLoadingDirs] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [lastClicked, setLastClicked] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDirectory("")
      .then((data) => setRootEntries(data.entries))
      .catch((e: Error) => setError(e.message));
  }, []);

  const loadDirectory = useCallback(
    async (path: string) => {
      if (childrenMap.has(path)) return;
      setLoadingDirs((prev) => new Set(prev).add(path));
      try {
        const data = await fetchDirectory(path);
        setChildrenMap((prev) => new Map(prev).set(path, data.entries));
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoadingDirs((prev) => {
          const next = new Set(prev);
          next.delete(path);
          return next;
        });
      }
    },
    [childrenMap]
  );

  const toggleExpand = useCallback(
    (entry: FileEntry) => {
      if (entry.type !== "directory") return;
      const { path } = entry;
      if (expanded.has(path)) {
        setExpanded((prev) => {
          const next = new Set(prev);
          next.delete(path);
          return next;
        });
      } else {
        loadDirectory(path);
        setExpanded((prev) => new Set(prev).add(path));
      }
    },
    [expanded, loadDirectory]
  );

  const getFlat = useCallback(
    () => flattenVisible(rootEntries, expanded, childrenMap),
    [rootEntries, expanded, childrenMap]
  );

  const onRowClick = useCallback(
    (entry: FileEntry, e: React.MouseEvent) => {
      const { path } = entry;

      if (e.shiftKey && lastClicked) {
        const flat = getFlat();
        const paths = flat.map((f) => f.entry.path);
        const a = paths.indexOf(lastClicked);
        const b = paths.indexOf(path);
        if (a !== -1 && b !== -1) {
          const [lo, hi] = a < b ? [a, b] : [b, a];
          const range = new Set(paths.slice(lo, hi + 1));
          setSelected((prev) => new Set([...prev, ...range]));
          return;
        }
      }

      if (e.ctrlKey || e.metaKey) {
        setSelected((prev) => {
          const next = new Set(prev);
          next.has(path) ? next.delete(path) : next.add(path);
          return next;
        });
      } else {
        setSelected(new Set([path]));
      }

      setLastClicked(path);
    },
    [lastClicked, getFlat]
  );

  const onCheckboxToggle = useCallback((entry: FileEntry) => {
    const { path } = entry;
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });
    setLastClicked(path);
  }, []);

  const clearSelection = useCallback(() => {
    setSelected(new Set());
    setLastClicked(null);
  }, []);

  const entryMap = useMemo(() => {
    const map = new Map<string, FileEntry>();
    for (const e of rootEntries) map.set(e.path, e);
    for (const entries of childrenMap.values()) {
      for (const e of entries) map.set(e.path, e);
    }
    return map;
  }, [rootEntries, childrenMap]);

  return {
    rootEntries,
    expanded,
    childrenMap,
    entryMap,
    loadingDirs,
    selected,
    error,
    toggleExpand,
    onRowClick,
    onCheckboxToggle,
    clearSelection,
  };
}
