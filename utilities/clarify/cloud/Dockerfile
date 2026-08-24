FROM python:3.10-slim

# Install system dependencies including Vulkan & OpenMP runtimes
RUN apt-get update && apt-get install -y --no-install-recommends \
    libvulkan1 \
    libgomp1 \
    wget \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Download Real-ESRGAN Vulkan engine during build
RUN python -c "import app; app.ensure_engine()"

EXPOSE 7860

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
