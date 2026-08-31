#!/usr/bin/env python3
"""
The Stash SFTP Deployer
Efficient incremental sync of client-side static assets to the VPS.
Zero Telemetry • Runs locally and in GitHub Actions.
"""

import os
import sys
import stat
import hashlib
from pathlib import Path

try:
    import paramiko
except ImportError:
    print("[DEPLOY ERROR] paramiko library is required. Run: pip install paramiko")
    sys.exit(1)

# Default configuration (can be overridden via environment variables)
SFTP_HOST = os.environ.get("SFTP_HOST", "150.241.64.119")
SFTP_PORT = int(os.environ.get("SFTP_PORT", "22"))
SFTP_USER = os.environ.get("SFTP_USER", "aser")
SFTP_PASS = os.environ.get("SFTP_PASS", "Jp9GmDHP3n2WSRrU")
SFTP_REMOTE_DIR = os.environ.get("SFTP_REMOTE_DIR", "/stash")

# Included root paths to synchronize
INCLUDE_ROOTS = ["index.html", "games", "utilities"]

# Exclude patterns/names
EXCLUDE_NAMES = {
    ".git", ".github", "downloads", "server", "build", "dist", "scratch", "bin",
    "__pycache__", ".pytest_cache", ".vscode", ".idea"
}
EXCLUDE_EXTENSIONS = {".py", ".bat", ".spec", ".pyc", ".txt", ".md", ".yml", ".yaml"}


def calculate_local_hash(file_path: Path) -> str:
    h = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


def calculate_remote_hash(sftp: paramiko.SFTPClient, remote_path: str) -> str:
    h = hashlib.sha256()
    with sftp.open(remote_path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


def ensure_remote_dir(sftp: paramiko.SFTPClient, remote_dir: str):
    parts = remote_dir.strip("/").split("/")
    current = ""
    for part in parts:
        current += "/" + part
        try:
            sftp.stat(current)
        except IOError:
            try:
                sftp.mkdir(current)
                print(f"  [MKDIR] Created remote directory: {current}")
            except IOError as e:
                print(f"  [ERROR] Failed to create {current}: {e}")


def collect_local_files(base_dir: Path) -> list:
    collected = []
    for root_target in INCLUDE_ROOTS:
        target_path = base_dir / root_target
        if not target_path.exists():
            continue
        if target_path.is_file():
            collected.append(target_path)
        elif target_path.is_dir():
            for p in target_path.rglob("*"):
                if p.is_file():
                    if any(part in EXCLUDE_NAMES for part in p.parts):
                        continue
                    if p.suffix.lower() in EXCLUDE_EXTENSIONS and p.name not in ["dataset.js", "words.js"]:
                        continue
                    collected.append(p)
    return collected


def deploy(base_dir: Path):
    print("=" * 60)
    print("  THE STASH • VPS AUTO-DEPLOY")
    print(f"  Destination: {SFTP_USER}@{SFTP_HOST}:{SFTP_PORT}{SFTP_REMOTE_DIR}")
    print("=" * 60)

    local_files = collect_local_files(base_dir)
    print(f"  Found {len(local_files)} candidate static files to check.")

    transport = paramiko.Transport((SFTP_HOST, SFTP_PORT))
    try:
        transport.connect(username=SFTP_USER, password=SFTP_PASS)
    except Exception as e:
        print(f"  [ERROR] SSH/SFTP Connection failed: {e}")
        sys.exit(1)

    sftp = paramiko.SFTPClient.from_transport(transport)
    ensure_remote_dir(sftp, SFTP_REMOTE_DIR)

    uploaded_count = 0
    synced_count = 0

    for local_file in local_files:
        rel_path = local_file.relative_to(base_dir).as_posix()
        remote_path = f"{SFTP_REMOTE_DIR.rstrip('/')}/{rel_path}"
        remote_parent = "/".join(remote_path.split("/")[:-1])
        ensure_remote_dir(sftp, remote_parent)

        local_hash = calculate_local_hash(local_file)
        needs_upload = True

        try:
            r_stat = sftp.stat(remote_path)
            if r_stat.st_size == local_file.stat().st_size:
                remote_hash = calculate_remote_hash(sftp, remote_path)
                if local_hash == remote_hash:
                    needs_upload = False
        except IOError:
            needs_upload = True

        if needs_upload:
            print(f"  [UPLOAD] {rel_path} ({local_file.stat().st_size} bytes)...")
            sftp.put(str(local_file), remote_path)
            uploaded_count += 1
        else:
            synced_count += 1

    sftp.close()
    transport.close()

    print("=" * 60)
    print(f"  DEPLOY FINISHED: {uploaded_count} uploaded, {synced_count} already up-to-date.")
    print("=" * 60)


if __name__ == "__main__":
    script_dir = Path(__file__).resolve().parent
    workspace_root = script_dir.parent.parent
    deploy(workspace_root)
