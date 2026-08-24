---
title: Clarify AI Upscaler Backend
emoji: ⚡
colorFrom: indigo
colorTo: purple
sdk: docker
app_port: 7860
pinned: false
---

# Clarify AI Cloud Upscaler Backend

Hardware-accelerated backend powered by **Real-ESRGAN NCNN Vulkan** and FastAPI.

### Endpoints
- `GET /health` - Health check & model metadata
- `POST /upscale` - Perform 2x/4x deep super-resolution
