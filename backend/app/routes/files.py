import json
import os
import subprocess
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

ROOT = Path(os.environ.get("VIDEO_PATH", "/media")).resolve()

VIDEO_EXTENSIONS = {
    ".mp4", ".mkv", ".mov", ".avi", ".webm",
    ".m4v", ".flv", ".wmv", ".ts", ".mts", ".m2ts",
}


class FileEntry(BaseModel):
    name: str
    path: str          # relative to ROOT, always uses forward slashes
    type: str          # "file" | "directory"
    size: Optional[int]
    is_video: Optional[bool]


class DirectoryListing(BaseModel):
    path: str
    entries: list[FileEntry]


def _rel(p: Path) -> str:
    return p.relative_to(ROOT).as_posix()


def _entry(p: Path) -> FileEntry:
    is_dir = p.is_dir()
    return FileEntry(
        name=p.name,
        path=_rel(p),
        type="directory" if is_dir else "file",
        size=None if is_dir else p.stat().st_size,
        is_video=(p.suffix.lower() in VIDEO_EXTENSIONS) if not is_dir else None,
    )


def _resolve_safe(rel_path: str) -> Path:
    """Resolve a user-supplied relative path inside ROOT; raise 400 on traversal."""
    target = (ROOT / rel_path).resolve()
    if not str(target).startswith(str(ROOT)):
        raise HTTPException(status_code=400, detail="Path traversal not allowed")
    return target


class ProbeRequest(BaseModel):
    paths: list[str]


def _probe_one(rel_path: str, target: Path) -> tuple[str, str | None]:
    try:
        proc = subprocess.run(
            [
                "ffprobe", "-v", "quiet",
                "-print_format", "json",
                "-show_streams", "-select_streams", "v:0",
                str(target),
            ],
            capture_output=True, text=True, timeout=15,
        )
        if proc.returncode != 0:
            print(f"[probe] ffprobe error for {target}: {proc.stderr.strip()}")
            return rel_path, None
        streams = json.loads(proc.stdout).get("streams", [])
        if not streams:
            print(f"[probe] no video streams found in {target}")
        return rel_path, (streams[0].get("codec_name") if streams else None)
    except FileNotFoundError:
        print("[probe] ffprobe not found — install ffmpeg or run via Docker")
        return rel_path, None
    except Exception as e:
        print(f"[probe] unexpected error for {target}: {e}")
        return rel_path, None


@router.post("/probe", response_model=dict[str, str | None])
def probe_files(req: ProbeRequest):
    """Run ffprobe on up to 50 paths in parallel; returns {rel_path: codec_name}."""
    items: list[tuple[str, Path]] = []
    for rel_path in req.paths[:50]:
        try:
            items.append((rel_path, _resolve_safe(rel_path)))
        except HTTPException:
            pass

    result: dict[str, str | None] = {}
    with ThreadPoolExecutor(max_workers=min(8, len(items) or 1)) as ex:
        futures = {ex.submit(_probe_one, rp, t): rp for rp, t in items}
        for future in as_completed(futures):
            rp, codec = future.result()
            result[rp] = codec

    return result


@router.get("/resolve", response_model=list[FileEntry])
def resolve_directory(path: str = ""):
    """Recursively return all video files under the given directory."""
    target = _resolve_safe(path)

    if not target.exists():
        raise HTTPException(status_code=404, detail="Path not found")
    if not target.is_dir():
        raise HTTPException(status_code=400, detail="Path is not a directory")

    videos: list[FileEntry] = []
    try:
        for p in sorted(target.rglob("*"), key=lambda x: x.as_posix().lower()):
            if p.is_file() and p.suffix.lower() in VIDEO_EXTENSIONS:
                try:
                    videos.append(_entry(p))
                except PermissionError:
                    pass
    except PermissionError:
        pass

    return videos


@router.get("/files", response_model=DirectoryListing)
def list_directory(path: str = ""):
    target = _resolve_safe(path)

    if not target.exists():
        raise HTTPException(status_code=404, detail="Path not found")
    if not target.is_dir():
        raise HTTPException(status_code=400, detail="Path is not a directory")

    entries: list[FileEntry] = []
    try:
        items = sorted(
            target.iterdir(),
            # directories first, then files; each group sorted case-insensitively
            key=lambda p: (p.is_file(), p.name.lower()),
        )
        for item in items:
            try:
                entries.append(_entry(item))
            except PermissionError:
                pass
    except PermissionError:
        raise HTTPException(status_code=403, detail="Permission denied")

    return DirectoryListing(
        path="" if target == ROOT else _rel(target),
        entries=entries,
    )
