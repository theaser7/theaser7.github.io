#!/usr/bin/env python3
"""
The Stash Unified Companion Server
Hardware-Accelerated Super-Resolution (Clarify / нейроапскейлер)
High-Throughput Media Downloader (FetchFlow / yt-dlp)
Zero Telemetry • Runs 100% locally on localhost:7860
"""

import os
import sys
import platform
import json
import base64
import time
import zipfile
import tempfile
import urllib.request
import urllib.parse
import subprocess
import shutil
import threading
from pathlib import Path
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler

PORT = 7860

# When compiled with PyInstaller, use executable directory so binaries persist
if getattr(sys, 'frozen', False):
    BASE_DIR = Path(sys.executable).resolve().parent
else:
    BASE_DIR = Path(__file__).resolve().parent

BIN_DIR = BASE_DIR / "bin"
CLARIFY_EXE = BIN_DIR / "realesrgan-ncnn-vulkan.exe"
CLARIFY_URL = "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesrgan-ncnn-vulkan-20220424-windows.zip"
YTDLP_EXE = BIN_DIR / "yt-dlp.exe"
YTDLP_URL = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe"
DOWNLOADS_DIR = Path(tempfile.gettempdir()) / "stash_companion_downloads"
MAX_JOB_AGE_SECONDS = 3600

# Download jobs tracking
jobs_lock = threading.Lock()
download_jobs = {}


def ensure_clarify_installed():
    """Download portable Real-ESRGAN Vulkan engine if not present."""
    if CLARIFY_EXE.exists():
        return True

    BIN_DIR.mkdir(parents=True, exist_ok=True)
    zip_path = BIN_DIR / "realesrgan.zip"

    print("=" * 60)
    print("  [Clarify] Downloading Real-ESRGAN Vulkan binary...")
    print(f"  Source: {CLARIFY_URL}")
    print("=" * 60)

    try:
        urllib.request.urlretrieve(CLARIFY_URL, zip_path)
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            for member in zip_ref.namelist():
                filename = os.path.basename(member)
                if not filename:
                    continue
                if "models/" in member or "models\\" in member:
                    models_dir = BIN_DIR / "models"
                    models_dir.mkdir(exist_ok=True)
                    target = models_dir / filename
                else:
                    target = BIN_DIR / filename

                with zip_ref.open(member) as source, open(target, "wb") as dest:
                    dest.write(source.read())

        if zip_path.exists():
            zip_path.unlink()

        print("  [Clarify] Real-ESRGAN engine ready!")
        return True
    except Exception as e:
        print(f"  [Clarify ERROR] Failed to download engine: {e}")
        return False


def ensure_ytdlp_installed():
    """Ensure yt-dlp is available in PATH, local bin, or download it."""
    if shutil.which("yt-dlp") or YTDLP_EXE.exists():
        return True

    BIN_DIR.mkdir(parents=True, exist_ok=True)
    print("=" * 60)
    print("  [FetchFlow] Downloading portable yt-dlp binary...")
    print(f"  Source: {YTDLP_URL}")
    print("=" * 60)

    try:
        urllib.request.urlretrieve(YTDLP_URL, YTDLP_EXE)
        print("  [FetchFlow] yt-dlp engine ready!")
        return True
    except Exception as e:
        print(f"  [FetchFlow WARNING] Could not download yt-dlp: {e}")
        return False


def get_ytdlp_cmd() -> list:
    """Find executable command for yt-dlp."""
    which_cmd = shutil.which("yt-dlp")
    if which_cmd:
        return [which_cmd]
    if YTDLP_EXE.exists():
        return [str(YTDLP_EXE)]
    return [sys.executable, "-m", "yt_dlp"]


def cleanup_expired_jobs():
    """Periodically clean up downloaded files and job records older than MAX_JOB_AGE_SECONDS."""
    while True:
        time.sleep(300)
        now = time.time()
        with jobs_lock:
            expired_ids = []
            for jid, job in list(download_jobs.items()):
                if now - job.get("created_at", now) > MAX_JOB_AGE_SECONDS:
                    expired_ids.append(jid)
                    file_path = job.get("file_path")
                    if file_path and os.path.exists(file_path):
                        try:
                            os.remove(file_path)
                        except Exception:
                            pass
            for jid in expired_ids:
                del download_jobs[jid]


class StashCompanionHandler(BaseHTTPRequestHandler):
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

        if path in ["/health", "/api/health"]:
            data = {
                "status": "online",
                "server": "the-stash-companion",
                "modules": ["clarify", "fetchflow"],
                "clarify_ready": CLARIFY_EXE.exists(),
                "ytdlp_ready": bool(shutil.which("yt-dlp")) or YTDLP_EXE.exists(),
                "active_jobs": len(download_jobs),
                "version": "1.0.1"
            }
            self._set_cors_headers(200)
            try:
                self.wfile.write(json.dumps(data).encode("utf-8"))
            except (ConnectionAbortedError, ConnectionResetError, BrokenPipeError):
                pass

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
                self.wfile.write(b'{"error": "Not Found"}')
            except (ConnectionAbortedError, ConnectionResetError, BrokenPipeError):
                pass

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        # -------------------------------------------------------------
        #  CLARIFY AI SUPER-RESOLUTION ENDPOINT
        # -------------------------------------------------------------
        if path in ["/upscale", "/api/upscale"]:
            try:
                content_length = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(content_length)
                payload = json.loads(body.decode("utf-8"))

                image_data = payload.get("image", "")
                scale = int(payload.get("scale", 4))
                model_name = payload.get("model", "realesrgan-x4plus")

                if scale not in [2, 4, 6, 8]:
                    scale = 4

                if "base64," in image_data:
                    image_data = image_data.split("base64,")[1]

                image_bytes = base64.b64decode(image_data)

                with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as in_f:
                    in_path = in_f.name
                    in_f.write(image_bytes)

                with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as out_f:
                    out_path = out_f.name

                print(f"[CLARIFY] Model: {model_name} | Scale: {scale}x | Processing...")

                models_dir = str(BIN_DIR / "models")

                if scale == 2:
                    cmd = [
                        str(CLARIFY_EXE),
                        "-i", str(in_path),
                        "-o", str(out_path),
                        "-s", "2",
                        "-n", model_name,
                        "-m", models_dir
                    ]
                    res = subprocess.run(cmd, capture_output=True, text=True, cwd=str(BIN_DIR))

                elif scale == 4:
                    cmd = [
                        str(CLARIFY_EXE),
                        "-i", str(in_path),
                        "-o", str(out_path),
                        "-s", "4",
                        "-n", model_name,
                        "-m", models_dir
                    ]
                    res = subprocess.run(cmd, capture_output=True, text=True, cwd=str(BIN_DIR))

                elif scale == 8:
                    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as mid_f:
                        mid_path = mid_f.name

                    cmd1 = [
                        str(CLARIFY_EXE),
                        "-i", str(in_path),
                        "-o", str(mid_path),
                        "-s", "4",
                        "-n", model_name,
                        "-m", models_dir
                    ]
                    res1 = subprocess.run(cmd1, capture_output=True, text=True, cwd=str(BIN_DIR))

                    if res1.returncode == 0 and os.path.exists(mid_path) and os.path.getsize(mid_path) > 0:
                        pass2_model = "realesr-animevideov3-x2" if (BIN_DIR / "models" / "realesr-animevideov3-x2.bin").exists() else model_name
                        cmd2 = [
                            str(CLARIFY_EXE),
                            "-i", str(mid_path),
                            "-o", str(out_path),
                            "-s", "2",
                            "-n", pass2_model,
                            "-m", models_dir
                        ]
                        res = subprocess.run(cmd2, capture_output=True, text=True, cwd=str(BIN_DIR))
                    else:
                        res = res1

                    try:
                        if os.path.exists(mid_path):
                            os.remove(mid_path)
                    except Exception:
                        pass

                elif scale == 6:
                    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as mid_f:
                        mid_path = mid_f.name

                    cmd1 = [
                        str(CLARIFY_EXE),
                        "-i", str(in_path),
                        "-o", str(mid_path),
                        "-s", "4",
                        "-n", model_name,
                        "-m", models_dir
                    ]
                    res1 = subprocess.run(cmd1, capture_output=True, text=True, cwd=str(BIN_DIR))

                    if res1.returncode == 0 and os.path.exists(mid_path) and os.path.getsize(mid_path) > 0:
                        try:
                            from PIL import Image
                            im_mid = Image.open(mid_path)
                            orig_im = Image.open(in_path)
                            target_w = orig_im.width * 6
                            target_h = orig_im.height * 6
                            im_6x = im_mid.resize((target_w, target_h), Image.Resampling.LANCZOS)
                            im_6x.save(out_path, format="PNG")
                            res = res1
                        except Exception as resize_err:
                            print(f"[CLARIFY WARNING] Lanczos resize fallback: {resize_err}")
                            shutil.copy(mid_path, out_path)
                            res = res1
                    else:
                        res = res1

                    try:
                        if os.path.exists(mid_path):
                            os.remove(mid_path)
                    except Exception:
                        pass
                else:
                    cmd = [
                        str(CLARIFY_EXE),
                        "-i", str(in_path),
                        "-o", str(out_path),
                        "-s", "4",
                        "-n", model_name,
                        "-m", models_dir
                    ]
                    res = subprocess.run(cmd, capture_output=True, text=True, cwd=str(BIN_DIR))

                if os.path.exists(out_path) and os.path.getsize(out_path) > 0:
                    with open(out_path, "rb") as out_f:
                        result_bytes = out_f.read()
                    b64_out = base64.b64encode(result_bytes).decode("utf-8")

                    self._set_cors_headers(200)
                    self.wfile.write(json.dumps({
                        "status": "success",
                        "image": f"data:image/png;base64,{b64_out}"
                    }).encode("utf-8"))
                else:
                    self._set_cors_headers(500)
                    self.wfile.write(json.dumps({
                        "status": "error",
                        "message": res.stderr or "Upscaling failed"
                    }).encode("utf-8"))

                try:
                    os.unlink(in_path)
                    os.unlink(out_path)
                except Exception:
                    pass

            except Exception as e:
                self._set_cors_headers(500)
                self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))

        # -------------------------------------------------------------
        #  FETCHFLOW MEDIA EXTRACTION & DOWNLOAD ENDPOINTS
        # -------------------------------------------------------------
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

                def run_download_worker(jid, target_url, target_quality, target_audio):
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
                            format_args = ["-f", "bestvideo+bestaudio/best[ext=mp4]/best"]

                    cmd = get_ytdlp_cmd() + [
                        "--no-warnings",
                        "-o", out_template,
                        "--newline",
                        "--no-check-certificates",
                        "--extractor-args", "youtube:player_client=android,web",
                        "--windows-filenames"
                    ] + format_args + [target_url]

                    print(f"[FETCHFLOW DOWNLOAD] Job {jid} starting: {target_url} ({target_quality})")
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
                    args=(job_id, media_url, quality, is_audio),
                    daemon=True
                )
                worker.start()

                self._set_cors_headers(200)
                self.wfile.write(json.dumps({
                    "status": "started",
                    "job_id": job_id
                }).encode("utf-8"))

            except Exception as e:
                self._set_cors_headers(500)
                self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))

        elif path == "/api/extract":
            try:
                content_length = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(content_length)
                payload = json.loads(body.decode("utf-8"))
                media_url = payload.get("url", "").strip()

                if not media_url:
                    self._set_cors_headers(400)
                    self.wfile.write(b'{"error": "URL parameter is required"}')
                    return

                cmd = get_ytdlp_cmd() + [
                    "--dump-single-json",
                    "--no-warnings",
                    "--skip-download",
                    "--extractor-args", "youtube:player_client=android,web",
                    "--no-check-certificates",
                    media_url
                ]

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
                            "fps": f.get("fps")
                        })

                self._set_cors_headers(200)
                self.wfile.write(json.dumps({
                    "status": "success",
                    "title": info.get("title") or "Media Stream",
                    "thumbnail": info.get("thumbnail") or "",
                    "formats": formats
                }).encode("utf-8"))

            except Exception as e:
                self._set_cors_headers(500)
                self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))

        else:
            self._set_cors_headers(404)
            self.wfile.write(b'{"error": "Endpoint not found"}')


def main():
    print("=" * 60)
    print("  THE STASH • UNIFIED COMPANION SERVER")
    print(f"  Port: http://127.0.0.1:{PORT}")
    print("  Modules: Clarify (AI Upscale) + FetchFlow (yt-dlp Engine)")
    print("  Super-Resolution Engine: Real-ESRGAN Vulkan NCNN")
    print("  Zero Telemetry • 100% Local Sandbox")
    print("=" * 60)

    ensure_clarify_installed()
    ensure_ytdlp_installed()

    # Background cleanup thread
    cleanup_thread = threading.Thread(target=cleanup_expired_jobs, daemon=True)
    cleanup_thread.start()

    server = ThreadingHTTPServer(("127.0.0.1", PORT), StashCompanionHandler)
    server.daemon_threads = True
    print(f"\n  Ready! Server listening on http://127.0.0.1:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n  Stopping server...")
        server.server_close()


if __name__ == "__main__":
    main()
