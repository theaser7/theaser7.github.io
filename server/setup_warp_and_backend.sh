#!/usr/bin/env bash
# ==============================================================================
# The Stash • VPS Cloudflare WARP & Downloader Backend Setup Script
#
# PURPOSE:
# Configures Cloudflare WARP in STRICT SOCKS5 PROXY MODE (127.0.0.1:40000).
# IMPORTANT:
# Running WARP in proxy mode NEVER modifies the VPS default gateway or default routing table.
# All existing services (SSH, Web, Docker, databases, etc.) remain untouched.
# ONLY the Stash Downloader backend explicitly sends outbound traffic via socks5://127.0.0.1:40000.
# ==============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================================${NC}"
echo -e "${BLUE}   The Stash • VPS Media Downloader & Cloudflare WARP Setup     ${NC}"
echo -e "${BLUE}================================================================${NC}"

if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}[ERROR] This script must be run as root (sudo).${NC}" 
   exit 1
fi

# 1. Update and install prerequisites
echo -e "\n${YELLOW}[1/6] Installing dependencies (curl, gpg, python3, ffmpeg)...${NC}"
if command -v apt-get &> /dev/null; then
    apt-get update -y
    apt-get install -y curl gnupg lsb-release python3 python3-pip ffmpeg
elif command -v dnf &> /dev/null; then
    dnf install -y curl gnupg python3 python3-pip ffmpeg
fi

# Ensure yt-dlp is installed
echo -e "\n${YELLOW}[2/6] Ensuring latest yt-dlp is installed...${NC}"
python3 -m pip install -U yt-dlp || pip3 install -U yt-dlp

# 2. Add Cloudflare WARP repository & install package
echo -e "\n${YELLOW}[3/6] Installing official Cloudflare WARP client...${NC}"
if command -v apt-get &> /dev/null; then
    UBUNTU_CODENAME=$(lsb_release -cs || echo "jammy")
    curl -fsSL https://pkg.cloudflareclient.com/pubkey.gpg | gpg --yes --dearmor --output /usr/share/keyrings/cloudflare-warp-archive-keyring.gpg
    echo "deb [arch=amd64 signed-by=/usr/share/keyrings/cloudflare-warp-archive-keyring.gpg] https://pkg.cloudflareclient.com/ ${UBUNTU_CODENAME} main" | tee /etc/apt/sources.list.d/cloudflare-client.list
    apt-get update -y
    apt-get install -y cloudflare-warp
elif command -v dnf &> /dev/null; then
    rpm -ivh http://pkg.cloudflareclient.com/cloudflare-warp-ascii.repo
    dnf install -y cloudflare-warp
fi

# 3. Configure WARP strictly in SOCKS5 proxy mode
echo -e "\n${YELLOW}[4/6] Configuring Cloudflare WARP in STRICT SOCKS5 PROXY MODE...${NC}"

# Ensure warp-svc daemon is running
systemctl enable --now warp-svc

# Register device (non-interactive)
warp-cli --accept-tos registration new 2>/dev/null || true

# Set mode strictly to proxy (supports both legacy and current warp-cli syntax)
if warp-cli --accept-tos mode proxy 2>/dev/null; then
    echo "  [OK] warp-cli mode set to 'proxy'"
else
    warp-cli --accept-tos set-mode proxy
    echo "  [OK] warp-cli set-mode proxy applied"
fi

# Set proxy listening port to 40000
if warp-cli --accept-tos proxy port 40000 2>/dev/null; then
    echo "  [OK] warp-cli proxy port set to 40000"
else
    warp-cli --accept-tos set-proxy-port 40000
    echo "  [OK] warp-cli set-proxy-port 40000 applied"
fi

# Connect WARP
warp-cli --accept-tos connect

echo "  Waiting for WARP proxy socket to become active..."
sleep 3

# 4. Verification test
echo -e "\n${YELLOW}[5/6] Verifying network isolation...${NC}"
DIRECT_IP=$(curl -s https://cloudflare.com/cdn-cgi/trace | grep "ip=" | cut -d= -f2 || echo "Unknown")
WARP_IP=$(curl -s --socks5 127.0.0.1:40000 https://cloudflare.com/cdn-cgi/trace | grep "ip=" | cut -d= -f2 || echo "Failed")

echo -e "  Direct VPS IP:     ${GREEN}${DIRECT_IP}${NC} (standard gateway untouched)"
echo -e "  WARP Proxy IP:      ${GREEN}${WARP_IP}${NC} (outbound downloader traffic)"

if [[ "$DIRECT_IP" == "$WARP_IP" && "$WARP_IP" != "Failed" ]]; then
    echo -e "${YELLOW}[NOTE] Direct IP and Proxy IP match or proxy is in warmup. Ensure WARP status is Connected.${NC}"
fi

# 5. Create systemd service for Stash Downloader
echo -e "\n${YELLOW}[6/6] Creating systemd service for Stash VPS Downloader...${NC}"

SERVICE_FILE="/etc/systemd/system/stash-downloader.service"
cat << EOF > "$SERVICE_FILE"
[Unit]
Description=The Stash - VPS Media Downloader Service
After=network.target warp-svc.service
Wants=warp-svc.service

[Service]
Type=simple
User=root
WorkingDirectory=/stash/server
ExecStart=/usr/bin/python3 /stash/server/vps_downloader.py --host 127.0.0.1 --port 7861 --proxy socks5://127.0.0.1:40000
Restart=always
RestartSec=3
StandardOutput=journal
StandardError=journal
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable stash-downloader.service

echo -e "\n${GREEN}================================================================${NC}"
echo -e "${GREEN}   Setup complete!                                              ${NC}"
echo -e "${GREEN}================================================================${NC}"
echo -e "To start the downloader service once files are uploaded:"
echo -e "  ${BLUE}systemctl start stash-downloader.service${NC}"
echo -e "To check service status:"
echo -e "  ${BLUE}systemctl status stash-downloader.service${NC}"
echo -e "  ${BLUE}journalctl -u stash-downloader.service -f${NC}"
echo -e "\nNginx reverse-proxy configuration snippet for /api/:"
cat << 'EOF'
    # Forward /api requests to Stash Downloader backend
    location /api/ {
        proxy_pass http://127.0.0.1:7861/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
        proxy_buffering off;
        client_max_body_size 50M;
    }
EOF
echo -e "${GREEN}================================================================${NC}"
