import os
import sys
import json
import base64
import zipfile
import tempfile
import urllib.request
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Clarify AI Cloud Upscaler Engine")

# Enable CORS for all origins (GitHub Pages and localhost)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent
BIN_DIR = BASE_DIR / "bin"
EXE_PATH = BIN_DIR / "realesrgan-ncnn-vulkan"
DOWNLOAD_URL = "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesrgan-ncnn-vulkan-20220424-ubuntu.zip"


def ensure_engine():
    """Ensure Linux Real-ESRGAN binary is downloaded and ready."""
    if EXE_PATH.exists():
        return True

    BIN_DIR.mkdir(parents=True, exist_ok=True)
    zip_path = BIN_DIR / "realesrgan_linux.zip"

    try:
        print(f"Downloading Real-ESRGAN Linux binary from {DOWNLOAD_URL}...")
        urllib.request.urlretrieve(DOWNLOAD_URL, zip_path)
        
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

        # Make executable
        if EXE_PATH.exists():
            os.chmod(EXE_PATH, 0o755)

        print("Real-ESRGAN Linux engine ready!")
        return True
    except Exception as e:
        print(f"Engine download failed: {e}")
        return False


ensure_engine()


class UpscaleRequest(BaseModel):
    image: str
    scale: int = 4
    model: str = "realesrgan-x4plus"


@app.get("/")
def index():
    return {
        "status": "online",
        "service": "Clarify AI Cloud Upscaler",
        "endpoints": ["/health", "/upscale"]
    }


@app.get("/health")
def health():
    return {
        "status": "online",
        "engine": "Real-ESRGAN NCNN Vulkan",
        "cloud": True,
        "models": ["realesrgan-x4plus", "realesrgan-x4plus-anime", "realesr-animevideov3-x2"]
    }


@app.post("/upscale")
def upscale(req: UpscaleRequest):
    if not EXE_PATH.exists():
        if not ensure_engine():
            raise HTTPException(status_code=500, detail="Engine not available")

    image_data = req.image
    if "base64," in image_data:
        image_data = image_data.split("base64,")[1]

    try:
        image_bytes = base64.b64decode(image_data)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 image")

    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as in_f:
        in_path = in_f.name
        in_f.write(image_bytes)

    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as out_f:
        out_path = out_f.name

    scale = req.scale if req.scale in [2, 3, 4] else 4
    model_name = req.model if req.model in ["realesrgan-x4plus", "realesrgan-x4plus-anime", "realesr-animevideov3-x2"] else "realesrgan-x4plus"

    import subprocess
    cmd = [
        str(EXE_PATH),
        "-i", str(in_path),
        "-o", str(out_path),
        "-s", str(scale),
        "-n", model_name,
        "-m", str(BIN_DIR / "models")
    ]

    try:
        res = subprocess.run(cmd, capture_output=True, text=True, cwd=str(BIN_DIR), timeout=60)
        if res.returncode != 0:
            raise HTTPException(status_code=500, detail=f"Processing failed: {res.stderr}")

        if not os.path.exists(out_path) or os.path.getsize(out_path) == 0:
            raise HTTPException(status_code=500, detail="Output image not generated")

        with open(out_path, "rb") as f_out:
            out_b64 = base64.b64encode(f_out.read()).decode("utf-8")

        return {
            "success": True,
            "scale": scale,
            "model": model_name,
            "image": f"data:image/png;base64,{out_b64}"
        }
    finally:
        for p in [in_path, out_path]:
            if os.path.exists(p):
                try:
                    os.remove(p)
                except Exception:
                    pass


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7860)
