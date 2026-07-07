export interface FileEntry {
  name: string;
  path: string;
  type: "file" | "directory";
  size: number | null;
  is_video: boolean | null;
}

export interface DirectoryListing {
  path: string;
  entries: FileEntry[];
}

export interface QueueItem extends FileEntry {
  /** undefined = not yet probed, null = probe failed / no stream, string = codec name */
  codec: string | null | undefined;
}
