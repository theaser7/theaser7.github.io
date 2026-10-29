#!/usr/bin/env python3
"""
The Stash Unified Companion Server
Hardware-Accelerated Super-Resolution (Clarify / нейроапскейлер)
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

PORT = 7860

# When compiled with PyInstaller, use executable directory so binaries persist
if getattr(sys, 'frozen', False):
    BASE_DIR = Path(sys.executable).resolve().parent
else:
    BASE_DIR = Path(__file__).resolve().parent

BIN_DIR = BASE_DIR / "bin"
CLARIFY_EXE = BIN_DIR / "realesrgan-ncnn-vulkan.exe"
CLARIFY_URL = "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesrgan-ncnn-vulkan-20220424-windows.zip"


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
                "modules": ["clarify"],
                "clarify_ready": CLARIFY_EXE.exists(),
                "version": "1.0.0"
            }
            self._set_cors_headers(200)
            try:
                self.wfile.write(json.dumps(data).encode("utf-8"))
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
        else:
            self._set_cors_headers(404)
            self.wfile.write(b'{"error": "Endpoint not found"}')


def main():
    print("=" * 60)
    print("  THE STASH • COMPANION SERVER (Clarify AI Engine)")
    print(f"  Port: http://127.0.0.1:{PORT}")
    print("  Super-Resolution Engine: Real-ESRGAN Vulkan NCNN")
    print("  Zero Telemetry • 100% Local Sandbox")
    print("=" * 60)

    ensure_clarify_installed()

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
