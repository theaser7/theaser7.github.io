#!/usr/bin/env python3
"""
The Stash • VPS Media Downloader Backend
High-Performance, Zero-Telemetry Video & Audio Downloader Service
Routes outbound traffic via Cloudflare WARP SOCKS5 proxy to protect VPS IP and avoid rate limits.
"""

import os
import sys
import json
import time
import socket
import shutil
import urllib.parse
import subprocess
import threading
from pathlib import Path
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
import argparse

DEFAULT_HOST = "0.0.0.0"
DEFAULT_PORT = 7861
DEFAULT_WARP_PROXY = "socks5://127.0.0.1:40000"
DOWNLOADS_DIR = Path("/tmp/stash_downloads") if os.name != "nt" else Path(os.environ.get("TEMP", ".")) / "stash_downloads"
MAX_JOB_AGE_SECONDS = 3600  # Clean up downloads after 1 hour

# Global jobs repository
jobs_lock = threading.Lock()
download_jobs = {}


def is_proxy_available(proxy_str: str) -> bool:
    """Check if the SOCKS5 proxy port is accepting connections."""
    if not proxy_str:
        return False
    try:
        parsed = urllib.parse.urlparse(proxy_str)
        host = parsed.hostname or "127.0.0.1"
        port = parsed.port or 40000
        with socket.create_connection((host, port), timeout=1.5):
            return True
    except Exception:
        return False


def get_ytdlp_cmd() -> list:
    """Find executable command for yt-dlp."""
    which_cmd = shutil.which("yt-dlp")
    if which_cmd:
        return [which_cmd]
    return [sys.executable, "-m", "yt_dlp"]


def cleanup_expired_jobs():
    """Periodically clean up downloaded files and job records older than MAX_JOB_AGE_SECONDS."""
    while True:
        time.sleep(300)
        now = time.time()
        with jobs_lock:
            expired_ids = []
            for jid, job in download_jobs.items():
                if now - job.get("created_at", now) > MAX_JOB_AGE_SECONDS:
                    expired_ids.append(jid)
                    file_path = job.get("file_path")
                    if file_path and os.path.exists(file_path):
                        try:
                            os.remove(file_path)
                            print(f"[CLEANUP] Deleted expired file: {file_path}")
                        except Exception as e:
                            print(f"[CLEANUP ERROR] Failed to delete {file_path}: {e}")
            for jid in expired_ids:
                del download_jobs[jid]


class StashDownloaderHandler(BaseHTTPRequestHandler):
    warp_proxy = DEFAULT_WARP_PROXY

    def _set_cors_headers(self, status=200, content_type="application/json"):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, *")
        self.send_header("Access-Control-Allow-Private-Network", "true")
        self.end_headers()

    def do_OPTIONS(self):
        self._set_cors_headers(204)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        # Health check
        if path in ["/health", "/api/health"]:
            proxy_active = is_proxy_available(self.warp_proxy)
            data = {
                "status": "online",
                "service": "stash-vps-downloader",
                "version": "1.0.0",
                "warp_proxy": self.warp_proxy if self.warp_proxy else None,
                "warp_active": proxy_active,
                "active_jobs": len(download_jobs)
            }
            self._set_cors_headers(200)
            try:
                self.wfile.write(json.dumps(data).encode("utf-8"))
            except (ConnectionAbortedError, ConnectionResetError, BrokenPipeError):
                pass

        # Job progress polling: /api/progress/<job_id>
        elif path.startswith("/api/progress/"):
            job_id = path.split("/api/progress/")[1].strip()
            with jobs_lock:
                job = download_jobs.get(job_id)

            if not job:
                self._set_cors_headers(404)
                try:
                    self.wfile.write(json.dumps({"error": "Job not found", "status": "not_found"}).encode("utf-8"))
                except (ConnectionAbortedError, ConnectionResetError, BrokenPipeError):
                    pass
                return

            response_payload = {
                "job_id": job_id,
                "status": job["status"],
                "progress": job.get("progress", 0),
                "speed": job.get("speed", "0 MB/s"),
                "eta": job.get("eta", "--:--"),
                "filename": job.get("filename", ""),
                "filesize": job.get("filesize", 0),
                "error": job.get("error_msg", "")
            }
            self._set_cors_headers(200)
            try:
                self.wfile.write(json.dumps(response_payload).encode("utf-8"))
            except (ConnectionAbortedError, ConnectionResetError, BrokenPipeError):
                pass

        # Stream / download completed file: /api/stream/<job_id>
        elif path.startswith("/api/stream/"):
            job_id = path.split("/api/stream/")[1].strip()
            with jobs_lock:
                job = download_jobs.get(job_id)

            if not job or not job.get("file_path") or not os.path.exists(job["file_path"]):
                self._set_cors_headers(404)
                try:
                    self.wfile.write(json.dumps({"error": "File not found or expired"}).encode("utf-8"))
                except (ConnectionAbortedError, ConnectionResetError, BrokenPipeError):
                    pass
                return

            file_path = job["file_path"]
            file_size = os.path.getsize(file_path)
            raw_filename = job.get("filename") or os.path.basename(file_path)
            safe_filename = urllib.parse.quote(raw_filename.encode("utf-8"))
            ascii_filename = raw_filename.encode("ascii", "replace").decode("ascii").replace('"', '_')

            self.send_response(200)
            self.send_header("Content-Type", "application/octet-stream")
            self.send_header("Content-Disposition", f'attachment; filename="{ascii_filename}"; filename*=UTF-8\'\'{safe_filename}')
            self.send_header("Content-Length", str(file_size))
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Private-Network", "true")
            self.end_headers()

            try:
                with open(file_path, "rb") as f:
                    shutil.copyfileobj(f, self.wfile, length=64 * 1024)
            except (ConnectionAbortedError, ConnectionResetError, BrokenPipeError):
                pass

        else:
            self._set_cors_headers(404)
            try:
                self.wfile.write(b'{"error": "Endpoint not found"}')
            except (ConnectionAbortedError, ConnectionResetError, BrokenPipeError):
                pass

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        # 1. Extract metadata: /api/extract
        if path == "/api/extract":
            try:
                content_length = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(content_length)
                payload = json.loads(body.decode("utf-8"))
                media_url = payload.get("url", "").strip()

                if not media_url:
                    self._set_cors_headers(400)
                    self.wfile.write(b'{"error": "URL parameter is required"}')
                    return

                print(f"[EXTRACT] Querying metadata for: {media_url}")
                cmd = get_ytdlp_cmd() + [
                    "--dump-single-json",
                    "--no-warnings",
                    "--skip-download",
                    "--extractor-args", "youtube:player_client=android,web",
                    "--no-check-certificates"
                ]

                # Append proxy if configured
                if self.warp_proxy:
                    cmd.extend(["--proxy", self.warp_proxy])

                cmd.append(media_url)

                proc = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
                if proc.returncode != 0:
                    raise Exception(proc.stderr.strip() or "yt-dlp extraction failed")

                info = json.loads(proc.stdout)

                formats = []
                for f in info.get("formats", []):
                    if f.get("vcodec") != "none" or f.get("acodec") != "none":
                        height = f.get("height") or 0
                        formats.append({
                            "format_id": f.get("format_id"),
                            "ext": f.get("ext"),
                            "resolution": f.get("resolution") or (f"{height}p" if height else "audio"),
                            "filesize": f.get("filesize") or f.get("filesize_approx") or 0,
                            "fps": f.get("fps"),
                            "vcodec": f.get("vcodec"),
                            "acodec": f.get("acodec")
                        })

                dur_sec = info.get("duration") or 0
                if dur_sec:
                    hours = int(dur_sec // 3600)
                    mins = int((dur_sec % 3600) // 60)
                    secs = int(dur_sec % 60)
                    dur_str = f"{hours}:{mins:02d}:{secs:02d}" if hours > 0 else f"{mins}:{secs:02d}"
                else:
                    dur_str = "Live / Unknown"

                resp_data = {
                    "status": "success",
                    "title": info.get("title") or "Media Stream",
                    "author": info.get("uploader") or info.get("channel") or info.get("extractor") or "Creator",
                    "platform": info.get("extractor_key") or "Web",
                    "duration": dur_str,
                    "thumbnail": info.get("thumbnail") or "",
                    "formats": formats
                }

                self._set_cors_headers(200)
                self.wfile.write(json.dumps(resp_data).encode("utf-8"))

            except Exception as e:
                print(f"[EXTRACT ERROR] {e}")
                self._set_cors_headers(500)
                self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))

        # 2. Trigger asynchronous download: /api/download
        elif path == "/api/download":
            try:
                content_length = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(content_length)
                payload = json.loads(body.decode("utf-8"))

                media_url = payload.get("url", "").strip()
                quality = str(payload.get("quality", "best")).strip().lower()
                is_audio = payload.get("is_audio", False) or quality in ["mp3", "m4a", "audio"]

                if not media_url:
                    self._set_cors_headers(400)
                    self.wfile.write(b'{"error": "URL parameter is required"}')
                    return

                DOWNLOADS_DIR.mkdir(parents=True, exist_ok=True)
                job_id = f"job_{int(time.time() * 1000)}_{os.urandom(3).hex()}"

                with jobs_lock:
                    download_jobs[job_id] = {
                        "job_id": job_id,
                        "url": media_url,
                        "status": "downloading",
                        "progress": 0.0,
                        "speed": "0 MB/s",
                        "eta": "--:--",
                        "filename": "",
                        "file_path": None,
                        "filesize": 0,
                        "error_msg": "",
                        "created_at": time.time()
                    }

                def run_download_worker(jid, target_url, target_quality, target_audio, proxy_url):
                    job_out_dir = DOWNLOADS_DIR / jid
                    job_out_dir.mkdir(parents=True, exist_ok=True)
                    out_template = str(job_out_dir / "%(title).80B.%(ext)s")

                    if target_audio:
                        format_args = ["-x", "--audio-format", "mp3", "--audio-quality", "0"]
                    else:
                        if target_quality == "1080":
                            format_args = ["-f", "bestvideo[height<=1080]+bestaudio/best[height<=1080]/best[ext=mp4]/best"]
                        elif target_quality == "720":
                            format_args = ["-f", "bestvideo[height<=720]+bestaudio/best[height<=720]/best[ext=mp4]/best"]
                        elif target_quality == "480":
                            format_args = ["-f", "bestvideo[height<=480]+bestaudio/best[height<=480]/best[ext=mp4]/best"]
                        else:
                            # Best available video with audio
                            format_args = ["-f", "bestvideo+bestaudio/best[ext=mp4]/best"]

                    cmd = get_ytdlp_cmd() + [
                        "--no-warnings",
                        "-o", out_template,
                        "--newline",
                        "--no-check-certificates",
                        "--extractor-args", "youtube:player_client=android,web",
                        "--windows-filenames"
                    ] + format_args

                    if proxy_url:
                        cmd.extend(["--proxy", proxy_url])

                    cmd.append(target_url)

                    print(f"[DOWNLOAD WORKER] Job {jid} starting: {target_url} ({target_quality})")
                    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)

                    recent_lines = []
                    while True:
                        line = proc.stdout.readline()
                        if not line and proc.poll() is not None:
                            break
                        line_str = line.strip()
                        if not line_str:
                            continue
                        recent_lines.append(line_str)
                        if len(recent_lines) > 10:
                            recent_lines.pop(0)

                        # Parse [download] progress
                        if "[download]" in line_str and "%" in line_str:
                            parts = line_str.split()
                            for idx, part in enumerate(parts):
                                if "%" in part:
                                    try:
                                        pct = float(part.replace("%", ""))
                                        with jobs_lock:
                                            if jid in download_jobs:
                                                download_jobs[jid]["progress"] = pct
                                    except Exception:
                                        pass
                                if "at" in part and idx + 1 < len(parts):
                                    with jobs_lock:
                                        if jid in download_jobs:
                                            download_jobs[jid]["speed"] = parts[idx + 1]
                                if "ETA" in part and idx + 1 < len(parts):
                                    with jobs_lock:
                                        if jid in download_jobs:
                                            download_jobs[jid]["eta"] = parts[idx + 1]

                    proc.wait()

                    with jobs_lock:
                        if jid not in download_jobs:
                            return

                        if proc.returncode == 0:
                            files = [p for p in job_out_dir.glob("*") if p.is_file()]
                            if files:
                                downloaded_file = max(files, key=os.path.getmtime)
                                download_jobs[jid]["status"] = "completed"
                                download_jobs[jid]["progress"] = 100.0
                                download_jobs[jid]["file_path"] = str(downloaded_file)
                                download_jobs[jid]["filename"] = downloaded_file.name
                                download_jobs[jid]["filesize"] = downloaded_file.stat().st_size
                                print(f"[DOWNLOAD SUCCESS] Job {jid} completed: {downloaded_file.name}")
                            else:
                                download_jobs[jid]["status"] = "error"
                                download_jobs[jid]["error_msg"] = "Download succeeded but no output file was found."
                        else:
                            download_jobs[jid]["status"] = "error"
                            download_jobs[jid]["error_msg"] = " | ".join(recent_lines[-3:]) if recent_lines else "Download process exited with error."
                            print(f"[DOWNLOAD ERROR] Job {jid} failed: {download_jobs[jid]['error_msg']}")

                worker = threading.Thread(
                    target=run_download_worker,
                    args=(job_id, media_url, quality, is_audio, self.warp_proxy),
                    daemon=True
                )
                worker.start()

                self._set_cors_headers(200)
                self.wfile.write(json.dumps({
                    "status": "started",
                    "job_id": job_id
                }).encode("utf-8"))

            except Exception as e:
                print(f"[DOWNLOAD API ERROR] {e}")
                self._set_cors_headers(500)
                self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))

        else:
            self._set_cors_headers(404)
            self.wfile.write(b'{"error": "Endpoint not found"}')


def main():
    parser = argparse.ArgumentParser(description="The Stash • VPS Media Downloader Service")
    parser.add_argument("--host", default=DEFAULT_HOST, help=f"Host address to bind (default: {DEFAULT_HOST})")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT, help=f"Port to listen on (default: {DEFAULT_PORT})")
    parser.add_argument("--proxy", default=DEFAULT_WARP_PROXY, help=f"WARP SOCKS5 proxy URL (default: {DEFAULT_WARP_PROXY})")
    parser.add_argument("--no-proxy", action="store_true", help="Disable outbound proxy and connect directly")
    args = parser.parse_args()

    chosen_proxy = "" if args.no_proxy else args.proxy
    StashDownloaderHandler.warp_proxy = chosen_proxy

    print("=" * 65)
    print("  THE STASH • VPS MEDIA DOWNLOADER BACKEND")
    print(f"  Listening on: http://{args.host}:{args.port}")
    if chosen_proxy:
        print(f"  WARP SOCKS5 Proxy: {chosen_proxy}")
        is_up = is_proxy_available(chosen_proxy)
        status_msg = "REACHABLE" if is_up else "NOT RESPONDING (Check warp-cli service)"
        print(f"  Proxy Status: {status_msg}")
    else:
        print("  Proxy: DISABLED (Direct connection)")
    print(f"  Temporary Storage: {DOWNLOADS_DIR}")
    print("=" * 65)

    # Start background cleanup thread
    cleanup_thread = threading.Thread(target=cleanup_expired_jobs, daemon=True)
    cleanup_thread.start()

    server = ThreadingHTTPServer((args.host, args.port), StashDownloaderHandler)
    server.daemon_threads = True

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping downloader server...")
        server.server_close()


if __name__ == "__main__":
    main()
