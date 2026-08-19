#!/usr/bin/env bash

# ============================================================================== #
#  NUSANTARA TRAFFIC VISION — RUNNER SCRIPT (API & FRONTEND)                    #
#  Architect: Adjie Kurniawan (@adjie.apk)                                      #
# ============================================================================== #

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}====================================================${NC}"
echo -e "${CYAN}  🚦 NUSANTARA TRAFFIC VISION — SURVEILLANCE PRO    ${NC}"
echo -e "${CYAN}  Edge AI Computer Vision & Multi-City ATCS CCTV    ${NC}"
echo -e "${CYAN}====================================================${NC}"
echo ""

# 1. Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}[ERROR] Node.js tidak ditemukan! Silakan install Node.js (v18+) terlebih dahulu.${NC}"
    exit 1
fi

NODE_VER=$(node -v)
echo -e "${GREEN}[OK] Node.js terdeteksi: ${NODE_VER}${NC}"

# 2. Port configuration (Default: 3000)
APP_PORT=${PORT:-3000}
echo -e "${GREEN}[OK] Menyiapkan server pada http://localhost:${APP_PORT}${NC}"

# 3. Auto-open browser in background
(
  sleep 1.5
  if command -v open &> /dev/null; then
    open "http://localhost:${APP_PORT}"
  elif command -v xdg-open &> /dev/null; then
    xdg-open "http://localhost:${APP_PORT}"
  fi
) &

# 4. Start Server (API + Frontend)
echo -e "${CYAN}[START] Menjalankan Backend API & Frontend UI...${NC}"
echo -e "${YELLOW}[HINT] Tekan Ctrl+C untuk menghentikan server.${NC}"
echo ""

if node --help | grep -q -- '--watch'; then
    exec node --watch server.js
else
    exec node server.js
fi
