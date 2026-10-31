# The Stash

> High-performance, client-side web suite with zero telemetry, zero trackers, and zero watermarks.
> Live deployment: [thestash.space](https://thestash.space)

---

## Overview

**The Stash** is an independent collection of web-based utilities and interactive games designed to operate entirely in the browser sandbox. Video downloading is handled by a high-throughput standalone daemon running on the VPS with Cloudflare WARP SOCKS5 integration.

---

## Suite Highlights

### Interactive Games

| Project | Description | Tech Stack |
| :--- | :--- | :--- |
| **[вордл / Flexle](./games/flexle/)** | Dynamic word puzzle engine with variable word lengths (4 to 11+ letters), bilingual dictionaries (RU/EN), and streak analytics. | Vanilla JS, Web Audio API, LocalStorage |

### Client-Side Utilities

| Project | Description | Engine |
| :--- | :--- | :--- |
| **[конвертер / StashConvert](./utilities/stashconvert/)** | In-browser batch file converter supporting image formats, audio, video, and documents. | Web APIs, Canvas, HTML5 FileReader |
| **[проверка ip / StashIP](./utilities/staship/)** | Network diagnostic tool providing IP intelligence, ASN lookups, and latency checks. | Native Fetch, WebRTC API |
| **[чеклист / StashList](./utilities/stashlist/)** | Recurring daily checklist and habit tracker with weekday scheduling and audio notifications. | Web Audio API, Web Notifications, LocalStorage |
| **[нейроапскейлер / Clarify](./utilities/clarify/)** | Super-resolution AI photo upscaling with split-view comparison slider. (Server GPU upscaler paused, basic client-side filter active). | WebGL / HTML5 Canvas |
| **[скачивание видео / FetchFlow](./utilities/fetchflow/)** | High-throughput batch media stream downloader with sequential queue processing. | VPS Downloader Backend (yt-dlp + Cloudflare WARP proxy) |

---

## Architecture

- **Web Frontend:** Pure static assets (HTML5, modern CSS3, vanilla JavaScript ES6+). Minimalist monochrome aesthetic with dark/light themes.
- **VPS Downloader Backend (`server/vps_downloader.py`):** Standalone lightweight backend with yt-dlp, routing media traffic safely through Cloudflare WARP SOCKS5 proxy without affecting the VPS default gateway.

---

## Quick Start & Local Setup

### 1. Static Web Suite
No build tools or Node.js required. Simply serve the directory with any local static HTTP server:

```bash
# Using Python built-in server
python -m http.server 8080
```
Open `http://127.0.0.1:8080` in your browser.

### 2. Running VPS Downloader Backend (Optional / Local Dev)

```bash
python server/vps_downloader.py
```
Listens on `http://127.0.0.1:7861`. On the production VPS, this runs continuously as a systemd service (`stash-downloader.service`) behind Nginx.

---

## Deployment Workflow

- **Automated VPS Sync:** Every push to the `main` branch triggers `.github/workflows/deploy.yml`, which incrementally syncs all client-side static assets to the VPS (`/stash`) via SFTP with SHA-256 validation.
- **Manual Local Sync:** Run `python .github/scripts/deploy_sftp.py`.

---

## License

GNU Affero General Public License v3.0 (AGPL-3.0). Designed for privacy, speed, and full user control.
