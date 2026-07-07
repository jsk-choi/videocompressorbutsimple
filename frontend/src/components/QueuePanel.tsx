import { useMemo, useRef, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table";
import { QueueItem } from "../types";
import { UseQueueResolutionReturn } from "../hooks/useQueueResolution";

// ── helpers ──────────────────────────────────────────────────────────────────

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function parentPath(path: string): string {
  const idx = path.lastIndexOf("/");
  return idx > 0 ? path.slice(0, idx) : "/";
}

const CODEC_LABELS: Record<string, string> = {
  h264: "h264",
  hevc: "hevc",
  av1: "av1",
  vp9: "vp9",
  vp8: "vp8",
  mpeg4: "mpeg4",
  mpeg2video: "mpeg2",
  prores: "prores",
  dnxhd: "dnxhd",
  mjpeg: "mjpeg",
  wmv3: "wmv3",
  theora: "theora",
};

function formatCodec(codec: string | null | undefined): string {
  if (codec === undefined) return "…";
  if (codec === null) return "?";
  return CODEC_LABELS[codec] ?? codec.toLowerCase();
}

// ── sort indicator ────────────────────────────────────────────────────────────

function SortIcon({ dir }: { dir: false | "asc" | "desc" }) {
  if (dir === "asc") return <span className="sort-icon asc">↑</span>;
  if (dir === "desc") return <span className="sort-icon desc">↓</span>;
  return <span className="sort-icon idle">⇅</span>;
}

// ── header checkbox ───────────────────────────────────────────────────────────

function HeaderCheckbox({
  items,
  excluded,
  onToggleAll,
}: {
  items: QueueItem[];
  excluded: Set<string>;
  onToggleAll: (checked: boolean) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const excludedCount = items.filter((i) => excluded.has(i.path)).length;
  const allActive = excludedCount === 0;
  const partial = excludedCount > 0 && excludedCount < items.length;
  if (ref.current) ref.current.indeterminate = partial;
  return (
    <input
      ref={ref}
      type="checkbox"
      className="queue-checkbox"
      checked={allActive}
      onChange={(e) => onToggleAll(e.target.checked)}
    />
  );
}

// ── column helper ─────────────────────────────────────────────────────────────

const col = createColumnHelper<QueueItem>();

// ── component ─────────────────────────────────────────────────────────────────

interface Props extends UseQueueResolutionReturn {
  onClearSelection: () => void;
}

export function QueuePanel({
  queueItems,
  excluded,
  toggleExclude,
  clearExcluded,
  resolving,
  onClearSelection,
}: Props) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo(
    () => [
      col.display({
        id: "select",
        enableSorting: false,
        header: () =>
          queueItems.length > 0 ? (
            <HeaderCheckbox
              items={queueItems}
              excluded={excluded}
              onToggleAll={(checked) => {
                if (checked) clearExcluded();
                else queueItems.forEach((i) => toggleExclude(i.path));
              }}
            />
          ) : null,
        cell: ({ row }) => (
          <input
            type="checkbox"
            className="queue-checkbox"
            checked={!excluded.has(row.original.path)}
            onChange={() => toggleExclude(row.original.path)}
            onClick={(e) => e.stopPropagation()}
          />
        ),
      }),
      col.accessor("name", {
        header: "Name",
        sortingFn: "alphanumeric",
        cell: (i) => (
          <span title={i.getValue()}>{i.getValue()}</span>
        ),
      }),
      col.accessor("codec", {
        header: "Codec",
        sortingFn: "alphanumeric",
        cell: (i) => (
          <span className={i.getValue() === undefined ? "codec-loading" : ""}>
            {formatCodec(i.getValue())}
          </span>
        ),
      }),
      col.accessor("size", {
        header: "Size",
        sortingFn: "basic",
        cell: (i) => {
          const v = i.getValue();
          return v !== null ? formatSize(v) : "—";
        },
      }),
      col.accessor("path", {
        id: "path",
        header: "Path",
        sortingFn: "alphanumeric",
        cell: (i) => {
          const p = parentPath(i.getValue());
          return <span title={p}>{p}</span>;
        },
      }),
    ],
    [queueItems, excluded, toggleExclude, clearExcluded]
  );

  const table = useReactTable({
    data: queueItems,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const activeCount = queueItems.filter((i) => !excluded.has(i.path)).length;

  const EFFICIENT_CODECS = new Set(["hevc", "av1"]);
  const hasActiveEfficient = queueItems.some(
    (i) => EFFICIENT_CODECS.has(i.codec ?? "") && !excluded.has(i.path)
  );

  const excludeEfficient = () => {
    queueItems.forEach((item) => {
      if (EFFICIENT_CODECS.has(item.codec ?? "") && !excluded.has(item.path)) {
        toggleExclude(item.path);
      }
    });
  };

  return (
    <div className="queue-panel">
      <div className="panel-header">
        <span className="panel-title">Queue</span>
        {resolving && <span className="panel-spinner" />}
        {queueItems.length > 0 && (
          <>
            <span className="panel-count">{activeCount} / {queueItems.length} file{queueItems.length !== 1 ? "s" : ""}</span>
            {hasActiveEfficient && (
              <button className="btn-ghost" onClick={excludeEfficient}>Skip hevc/av1</button>
            )}
            <button className="btn-ghost" onClick={onClearSelection}>Clear all</button>
          </>
        )}
      </div>

      <div className="queue-body">
        {queueItems.length === 0 && !resolving ? (
          <div className="queue-empty">Select video files or folders on the left</div>
        ) : (
          <table className="queue-table">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((header) => {
                    const canSort = header.column.getCanSort();
                    return (
                      <th
                        key={header.id}
                        className={`col-${header.id}${canSort ? " sortable" : ""}`}
                        onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {canSort && <SortIcon dir={header.column.getIsSorted()} />}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={excluded.has(row.original.path) ? "row-excluded" : ""}
                  onClick={() => toggleExclude(row.original.path)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className={`col-${cell.column.id}`}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
