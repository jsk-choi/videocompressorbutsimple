import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { resolveDirectory, probeFiles } from "../api";
import { FileEntry, QueueItem } from "../types";

export interface UseQueueResolutionReturn {
  queueItems: QueueItem[];
  excluded: Set<string>;
  toggleExclude: (path: string) => void;
  clearExcluded: () => void;
  resolving: boolean;
}

const PROBE_BATCH = 5;

export function useQueueResolution(
  selected: Set<string>,
  entryMap: Map<string, FileEntry>
): UseQueueResolutionReturn {
  const [resolvedMap, setResolvedMap] = useState<Map<string, FileEntry[]>>(new Map());
  const [resolvingCount, setResolvingCount] = useState(0);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [codecMap, setCodecMap] = useState<Map<string, string | null>>(new Map());

  const fetchedDirsRef = useRef<Set<string>>(new Set());
  const probedRef = useRef<Set<string>>(new Set());

  // Resolve selected directories → video file lists
  useEffect(() => {
    for (const path of selected) {
      const entry = entryMap.get(path);
      if (!entry || entry.type !== "directory") continue;
      if (fetchedDirsRef.current.has(path)) continue;

      fetchedDirsRef.current.add(path);
      setResolvingCount((c) => c + 1);

      resolveDirectory(path)
        .then((files) => setResolvedMap((prev) => new Map(prev).set(path, files)))
        .catch(console.error)
        .finally(() => setResolvingCount((c) => c - 1));
    }
  }, [selected, entryMap]);

  // Flat list of video files
  const baseItems = useMemo(() => {
    const items: FileEntry[] = [];
    const seen = new Set<string>();

    for (const path of selected) {
      const entry = entryMap.get(path);
      if (!entry) continue;

      if (entry.type === "file" && entry.is_video) {
        if (!seen.has(path)) { items.push(entry); seen.add(path); }
      } else if (entry.type === "directory") {
        for (const f of resolvedMap.get(path) ?? []) {
          if (!seen.has(f.path)) { items.push(f); seen.add(f.path); }
        }
      }
    }
    return items;
  }, [selected, entryMap, resolvedMap]);

  // Background probe in batches of PROBE_BATCH
  useEffect(() => {
    const unprobed = baseItems
      .map((i) => i.path)
      .filter((p) => !probedRef.current.has(p));

    if (unprobed.length === 0) return;

    for (const p of unprobed) probedRef.current.add(p);

    for (let i = 0; i < unprobed.length; i += PROBE_BATCH) {
      const batch = unprobed.slice(i, i + PROBE_BATCH);
      probeFiles(batch).then((results) => {
        setCodecMap((prev) => {
          const next = new Map(prev);
          for (const [path, codec] of Object.entries(results)) {
            next.set(path, codec ?? null);
          }
          return next;
        });
      }).catch(console.error);
    }
  }, [baseItems]);

  // Merge codec — excluded items remain in list, QueuePanel dims them
  const queueItems = useMemo<QueueItem[]>(() =>
    baseItems.map((item) => ({
      ...item,
      codec: codecMap.has(item.path) ? codecMap.get(item.path)! : undefined,
    })),
    [baseItems, codecMap]
  );

  const toggleExclude = useCallback((path: string) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });
  }, []);

  const clearExcluded = useCallback(() => setExcluded(new Set()), []);

  return {
    queueItems,
    excluded,
    toggleExclude,
    clearExcluded,
    resolving: resolvingCount > 0,
  };
}
