# The Stash

> High-performance, client-side web suite with zero telemetry, zero trackers, and zero watermarks.
> Live deployment: [thestash.space](https://thestash.space)

---

## Overview

**The Stash** is an independent collection of web-based utilities and interactive games designed to operate entirely in the browser sandbox. Heavy computing tasks (such as AI super-resolution and stream downloading) are handled locally by an optional lightweight companion daemon running on your machine.

---

## Suite Highlights

### Interactive Games

| Project | Description | Tech Stack |
| :--- | :--- | :--- |
| **[Flexle](./games/flexle/)** | Dynamic word puzzle engine with variable word lengths (4, 5, 6, 7, 8, 11+ letters), bilingual dictionaries (RU/EN), and streak analytics. | Vanilla JS, Web Audio API, LocalStorage |
| **[Quantex](./games/quantex/)** | Real-time higher/lower statistical estimation game featuring massive verified datasets across searches, streaming views, and demographics. | Canvas FX, Vector Blueprints, Local State |

### Client-Side Utilities

| Project | Description | Engine |
| :--- | :--- | :--- |
| **[StashConvert](./utilities/stashconvert/)** | In-browser batch file converter supporting image formats (PNG, JPG, WebP, AVIF, SVG, ICO, BMP, TIFF), audio, video, and documents. | Web APIs, Canvas, HTML5 FileReader |
| **[StashIP](./utilities/staship/)** | Network diagnostic tool providing IP intelligence, ASN lookups, WebRTC leak detection, and DNS latency checks with zero logging. | Native Fetch, WebRTC API |
| **[Clarify](./utilities/clarify/)** | Super-resolution AI photo upscaling (2x, 4x, 6x, 8x true neural enhancement) powered by Vulkan NCNN. | StashCompanion (Real-ESRGAN Vulkan) |
| **[FetchFlow](./utilities/fetchflow/)** | High-throughput media stream parser and multi-format video/audio downloader. | StashCompanion (yt-dlp Engine) |

---

## Architecture & StashCompanion

The web suite follows a strict **Zero Server-Side State** principle:
- **Web Frontend:** Pure static assets (HTML5, modern CSS3, vanilla JavaScript ES6+). Hosted on VPS via SFTP and GitHub Pages.
- **StashCompanion (`server/companion_server.py`):** Optional desktop helper running locally on `http://127.0.0.1:7860`. It provides hardware acceleration for neural upscaling and media extraction without sending any payload to remote servers.

```
+-------------------------------------------------------------+
|                      Browser Sandbox                        |
|   thestash.space (HTML / CSS / JS / Web APIs / Web Workers) |
+-------------------------------------------------------------+
                              |
                     CORS / localhost:7860
                              |
                              v
+-------------------------------------------------------------+
|               Local StashCompanion Server                   |
|              http://127.0.0.1:7860 (Python)                 |
|                                                             |
|   +--------------------------+  +-----------------------+   |
|   | Real-ESRGAN (Vulkan/GPU) |  |   yt-dlp (Portable)   |   |
|   +--------------------------+  +-----------------------+   |
+-------------------------------------------------------------+
```

---

## Quick Start & Local Setup

### 1. Static Web Suite
No build tools or Node.js required. Simply serve the directory with any local static HTTP server:

```bash
# Using Python built-in server
python -m http.server 8080
```
Open `http://127.0.0.1:8080` in your browser.

### 2. Running StashCompanion (for Clarify & FetchFlow)

#### From Batch Script:
```cmd
start_companion.bat
```

#### From Source:
```bash
python server/companion_server.py
```

---

## Deployment Workflow

- **Automated VPS Sync:** Every push to the `main` branch triggers `.github/workflows/deploy.yml`, which incrementally syncs all client-side static assets to the VPS (`/stash`) via SFTP with SHA-256 validation.
- **Manual Local Sync:** Run `deploy_to_vps.bat` or `python .github/scripts/deploy_sftp.py`.

---

## License

MIT License. Designed for privacy, speed, and full user control.
