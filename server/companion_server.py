#!/usr/bin/env python3
"""
The Stash Unified Companion Server
Hardware-Accelerated Super-Resolution (Clarify) & High-Throughput Media Downloader (FetchFlow)
Zero Telemetry • Runs 100% locally on localhost:7860
"""

import os
import sys
import platform
import json
import base64
import zipfile
import tempfile
import urllib.request
import urllib.parse
import subprocess
import shutil
from pathlib import Path
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
import threading


PORT = 7860

# When compiled with PyInstaller, use exe directory so downloads/binaries persist
if getattr(sys, 'frozen', False):
    BASE_DIR = Path(sys.executable).resolve().parent
else:
    BASE_DIR = Path(__file__).resolve().parent

BIN_DIR = BASE_DIR / "bin"
CLARIFY_EXE = BIN_DIR / "realesrgan-ncnn-vulkan.exe"
CLARIFY_URL = "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesrgan-ncnn-vulkan-20220424-windows.zip"
YTDLP_EXE = BIN_DIR / "yt-dlp.exe"
YTDLP_URL = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe"
DOWNLOADS_DIR = Path.home() / "Downloads" / "the_stash"

# In-memory download jobs
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
    """Download portable yt-dlp binary if not present and not in PATH."""
    if shutil.which("yt-dlp"):
        return True
    if YTDLP_EXE.exists():
        return True

    BIN_DIR.mkdir(parents=True, exist_ok=True)
    print("=" * 60)
    print("  [FetchFlow] Downloading portable yt-dlp.exe...")
    print(f"  Source: {YTDLP_URL}")
    print("=" * 60)

    try:
        urllib.request.urlretrieve(YTDLP_URL, YTDLP_EXE)
        print("  [FetchFlow] yt-dlp binary ready!")
        return True
    except Exception as e:
        print(f"  [FetchFlow ERROR] Failed to download yt-dlp: {e}")
        return False


def get_ytdlp_cmd():
    if shutil.which("yt-dlp"):
        return ["yt-dlp"]
    if YTDLP_EXE.exists():
        return [str(YTDLP_EXE)]
    if not getattr(sys, 'frozen', False):
        return [sys.executable, "-m", "yt_dlp"]
    return [str(YTDLP_EXE)]


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
                "ytdlp_ready": YTDLP_EXE.exists() or bool(shutil.which("yt-dlp")),
                "clarify_ready": CLARIFY_EXE.exists()
            }
            self._set_cors_headers(200)
            try:
                self.wfile.write(json.dumps(data).encode("utf-8"))
            except (ConnectionAbortedError, ConnectionResetError, BrokenPipeError):
                pass

        elif path.startswith("/api/progress/"):
            job_id = path.split("/api/progress/")[1]
            job = download_jobs.get(job_id, {"status": "unknown", "progress": 0, "speed": "0 MB/s"})
            self._set_cors_headers(200)
            try:
                self.wfile.write(json.dumps(job).encode("utf-8"))
            except (ConnectionAbortedError, ConnectionResetError, BrokenPipeError):
                pass

        elif path.startswith("/api/stream/"):
            job_id = path.split("/api/stream/")[1]
            job = download_jobs.get(job_id)
            if job and job.get("file_path") and os.path.exists(job["file_path"]):
                file_path = job["file_path"]
                file_size = os.path.getsize(file_path)
                filename = os.path.basename(file_path)

                self.send_response(200)
                self.send_header("Content-Type", "application/octet-stream")
                self.send_header("Content-Disposition", f'attachment; filename="{filename}"')
                self.send_header("Content-Length", str(file_size))
                self.send_header("Access-Control-Allow-Origin", "*")
                self.send_header("Access-Control-Allow-Private-Network", "true")
                self.end_headers()

                try:
                    with open(file_path, "rb") as f:
                        shutil.copyfileobj(f, self.wfile)
                except (ConnectionAbortedError, ConnectionResetError, BrokenPipeError):
                    pass
            else:
                self._set_cors_headers(404)
                try:
                    self.wfile.write(b'{"error": "File not found"}')
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
        #  1. CLARIFY AI SUPER-RESOLUTION ENDPOINT
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
                    # 2-Pass neural super-resolution: 4x pass + 2x pass = 8x true AI scaling
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
                    # 4x neural pass + high-quality Lanczos resize to 6x
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
        #  2. FETCHFLOW YT-DLP METADATA EXTRACTION ENDPOINT
        # -------------------------------------------------------------
        elif path == "/api/extract":
            try:
                content_length = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(content_length)
                payload = json.loads(body.decode("utf-8"))
                media_url = payload.get("url", "").strip()

                if not media_url:
                    self._set_cors_headers(400)
                    self.wfile.write(b'{"error": "URL is required"}')
                    return

                print(f"[FETCHFLOW] Extracting info for: {media_url}")
                ytdlp_cmd = get_ytdlp_cmd()

                cmd = ytdlp_cmd + [
                    "--dump-single-json",
                    "--no-warnings",
                    "--skip-download",
                    "--extractor-args", "youtube:player_client=android,web",
                    "--windows-filenames",
                    media_url
                ]

                proc = subprocess.run(cmd, capture_output=True, text=True, timeout=25)
                if proc.returncode != 0:
                    raise Exception(proc.stderr or "yt-dlp extraction failed")

                info = json.loads(proc.stdout)

                formats = []
                for f in info.get("formats", []):
                    if f.get("vcodec") != "none" or f.get("acodec") != "none":
                        height = f.get("height") or 0
                        formats.append({
                            "format_id": f.get("format_id"),
                            "ext": f.get("ext"),
                            "resolution": f.get("resolution") or f"{height}p",
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
                    dur_str = "HD"


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
                print(f"[FETCHFLOW ERROR] Extract failed: {e}")
                self._set_cors_headers(500)
                self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))

        # -------------------------------------------------------------
        #  3. FETCHFLOW YT-DLP DIRECT DOWNLOAD ENDPOINT
        # -------------------------------------------------------------
        elif path == "/api/download":
            try:
                content_length = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(content_length)
                payload = json.loads(body.decode("utf-8"))

                media_url = payload.get("url", "").strip()
                quality = payload.get("quality", "720")
                is_audio = payload.get("is_audio", False) or quality in ["mp3", "m4a"]

                job_id = f"job_{int(os.urandom(4).hex(), 16)}"
                DOWNLOADS_DIR.mkdir(parents=True, exist_ok=True)

                download_jobs[job_id] = {
                    "status": "downloading",
                    "progress": 0,
                    "speed": "0 MB/s",
                    "file_path": None,
                    "error_msg": ""
                }

                def run_dl(jid, url, q, audio):
                    ytdlp_cmd = get_ytdlp_cmd()
                    out_template = str(DOWNLOADS_DIR / "%(title).100B.%(ext)s")

                    if audio:
                        fmt_args = ["-x", "--audio-format", "mp3", "--audio-quality", "0"]
                    else:
                        if q == "1080":
                            fmt_args = ["-f", "bestvideo[height<=1080]+bestaudio/best[height<=1080]/best[ext=mp4]/best"]
                        elif q == "480":
                            fmt_args = ["-f", "bestvideo[height<=480]+bestaudio/best[height<=480]/best[ext=mp4]/best"]
                        elif q == "360":
                            fmt_args = ["-f", "bestvideo[height<=360]+bestaudio/best[height<=360]/best[ext=mp4]/best"]
                        else:
                            fmt_args = ["-f", "bestvideo[height<=720]+bestaudio/best[height<=720]/best[ext=mp4]/best"]

                    cmd = ytdlp_cmd + [
                        "--no-warnings",
                        "-o", out_template,
                        "--newline",
                        "--windows-filenames",
                        "--extractor-args", "youtube:player_client=android,web",
                        "--no-check-certificates"
                    ] + fmt_args + [url]

                    print(f"[FETCHFLOW DOWNLOAD] Job {jid}: Running yt-dlp...")
                    p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)

                    last_output = []
                    for line in p.stdout:
                        last_output.append(line.strip())
                        if len(last_output) > 10:
                            last_output.pop(0)

                        if "[download]" in line and "%" in line:
                            parts = line.split()
                            for idx, part in enumerate(parts):
                                if "%" in part:
                                    try:
                                        pct = float(part.replace("%", ""))
                                        download_jobs[jid]["progress"] = pct
                                    except Exception:
                                        pass
                                if "at" in part and idx + 1 < len(parts):
                                    download_jobs[jid]["speed"] = parts[idx + 1]

                    p.wait()

                    if p.returncode == 0:
                        download_jobs[jid]["status"] = "completed"
                        download_jobs[jid]["progress"] = 100
                        files = list(DOWNLOADS_DIR.glob("*"))
                        if files:
                            latest_file = max(files, key=os.path.getmtime)
                            download_jobs[jid]["file_path"] = str(latest_file)
                    else:
                        download_jobs[jid]["status"] = "error"
                        download_jobs[jid]["error_msg"] = " | ".join(last_output[-3:]) if last_output else "Download error"
                        print(f"[FETCHFLOW ERROR] Download failed: {download_jobs[jid]['error_msg']}")

                t = threading.Thread(target=run_dl, args=(job_id, media_url, quality, is_audio), daemon=True)
                t.start()

                self._set_cors_headers(200)
                self.wfile.write(json.dumps({
                    "status": "started",
                    "job_id": job_id,
                    "save_directory": str(DOWNLOADS_DIR)
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
    print("  Zero Telemetry • 100% Local Sandbox")
    print("=" * 60)

    ensure_clarify_installed()
    ensure_ytdlp_installed()

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
