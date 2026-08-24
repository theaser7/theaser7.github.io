#!/usr/bin/env python3
"""
Clarify AI Companion Server
Hardware-Accelerated Image Super-Resolution Engine (Real-ESRGAN NCNN Vulkan)
Zero external dependencies • Uses Python Standard Library only
"""

import os
import sys
import json
import base64
import zipfile
import tempfile
import urllib.request
from pathlib import Path
from http.server import HTTPServer, BaseHTTPRequestHandler

PORT = 7860
BASE_DIR = Path(__file__).resolve().parent
BIN_DIR = BASE_DIR / "bin"
EXE_PATH = BIN_DIR / "realesrgan-ncnn-vulkan.exe"
DOWNLOAD_URL = "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesrgan-ncnn-vulkan-20220424-windows.zip"


def ensure_engine_installed():
    """Download and extract portable Real-ESRGAN Vulkan engine if not present."""
    if EXE_PATH.exists():
        return True

    BIN_DIR.mkdir(parents=True, exist_ok=True)
    zip_path = BIN_DIR / "realesrgan.zip"

    print("=" * 60)
    print("  Clarify AI Engine: Downloading Real-ESRGAN Vulkan binary...")
    print(f"  Source: {DOWNLOAD_URL}")
    print("=" * 60)

    try:
        def reporthook(count, block_size, total_size):
            if total_size > 0:
                pct = int(count * block_size * 100 / total_size)
                pct = min(100, pct)
                sys.stdout.write(f"\r  Downloading: {pct}% [{(count*block_size)/(1024*1024):.1f}MB / {total_size/(1024*1024):.1f}MB]")
                sys.stdout.flush()

        urllib.request.urlretrieve(DOWNLOAD_URL, zip_path, reporthook)
        print("\n  Extracting files...")

        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            # Flatten extracted contents into BIN_DIR
            for member in zip_ref.namelist():
                filename = os.path.basename(member)
                if not filename:
                    continue
                # If file is inside a subfolder (e.g. models/ or root)
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

        print("  Real-ESRGAN engine ready!")
        return True
    except Exception as e:
        print(f"\n  [ERROR] Failed to download/extract engine: {e}")
        return False


class ClarifyHandler(BaseHTTPRequestHandler):
    def _set_cors_headers(self, status=200, content_type="application/json"):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()

    def do_OPTIONS(self):
        self._set_cors_headers(204)

    def do_GET(self):
        if self.path == "/health":
            data = {
                "status": "online",
                "engine": "Real-ESRGAN NCNN Vulkan",
                "hardware": "RTX 4060 / Vulkan Accelerated",
                "models": ["realesrgan-x4plus", "realesrgan-x4plus-anime", "realesr-animevideov3-x2"]
            }
            self._set_cors_headers(200)
            self.wfile.write(json.dumps(data).encode("utf-8"))
        else:
            self._set_cors_headers(404)
            self.wfile.write(b'{"error": "Not Found"}')

    def do_POST(self):
        if self.path != "/upscale":
            self._set_cors_headers(404)
            self.wfile.write(b'{"error": "Endpoint not found"}')
            return

        try:
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            payload = json.loads(body.decode("utf-8"))

            image_data = payload.get("image", "")
            scale = int(payload.get("scale", 4))
            model_name = payload.get("model", "realesrgan-x4plus")

            if scale not in [2, 3, 4]:
                scale = 4

            if "base64," in image_data:
                image_data = image_data.split("base64,")[1]

            image_bytes = base64.b64decode(image_data)

            with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as in_f:
                in_path = in_f.name
                in_f.write(image_bytes)

            with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as out_f:
                out_path = out_f.name

            # Run Real-ESRGAN Vulkan process
            import subprocess
            cmd = [
                str(EXE_PATH),
                "-i", str(in_path),
                "-o", str(out_path),
                "-s", str(scale),
                "-n", model_name,
                "-m", str(BIN_DIR / "models")
            ]

            print(f"[UPSCALING] Model: {model_name} | Scale: {scale}x | GPU Active...")
            res = subprocess.run(cmd, capture_output=True, text=True, cwd=str(BIN_DIR))

            if res.returncode != 0:
                print(f"[ERROR] Engine failure: {res.stderr}")
                self._set_cors_headers(500)
                self.wfile.write(json.dumps({"error": f"Engine error: {res.stderr}"}).encode("utf-8"))
                return

            if not os.path.exists(out_path) or os.path.getsize(out_path) == 0:
                self._set_cors_headers(500)
                self.wfile.write(b'{"error": "Output file not generated"}')
                return

            with open(out_path, "rb") as f_out:
                out_bytes = f_out.read()
                out_b64 = base64.b64encode(out_bytes).decode("utf-8")

            # Cleanup temp files
            try:
                os.remove(in_path)
                os.remove(out_path)
            except Exception:
                pass

            response_data = {
                "success": True,
                "scale": scale,
                "model": model_name,
                "image": f"data:image/png;base64,{out_b64}"
            }
            self._set_cors_headers(200)
            self.wfile.write(json.dumps(response_data).encode("utf-8"))
            print(f"[SUCCESS] Upscaled ({len(out_bytes)/(1024*1024):.2f} MB)")

        except Exception as e:
            print(f"[EXCEPTION] {e}")
            self._set_cors_headers(500)
            self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))


def run():
    if not ensure_engine_installed():
        print("[CRITICAL] Could not setup Real-ESRGAN Vulkan engine.")
        sys.exit(1)

    server = HTTPServer(("127.0.0.1", PORT), ClarifyHandler)
    print("\n" + "=" * 60)
    print(f"  Clarify AI Companion Server is RUNNING on http://127.0.0.1:{PORT}")
    print("  Hardware: NVIDIA RTX 4060 (Vulkan)")
    print("  Zero Telemetry • 100% Local Processing")
    print("=" * 60)
    print("  Press Ctrl+C to stop the server anytime.\n")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n  Shutting down server...")
        server.server_close()


if __name__ == "__main__":
    run()
