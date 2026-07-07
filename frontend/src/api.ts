import { DirectoryListing, FileEntry } from "./types";

async function apiFetch<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { detail?: string }).detail ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function fetchDirectory(path: string): Promise<DirectoryListing> {
  const url = `/api/files${path ? `?path=${encodeURIComponent(path)}` : ""}`;
  return apiFetch<DirectoryListing>(url);
}

export function resolveDirectory(path: string): Promise<FileEntry[]> {
  return apiFetch<FileEntry[]>(`/api/resolve?path=${encodeURIComponent(path)}`);
}

export async function probeFiles(paths: string[]): Promise<Record<string, string | null>> {
  try {
    const res = await fetch("/api/probe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paths }),
    });
    if (!res.ok) return {};
    return res.json();
  } catch {
    return {};
  }
}
