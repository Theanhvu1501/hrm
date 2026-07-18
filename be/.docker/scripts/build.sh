#!/bin/bash

# Build script for Podman images
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCKER_DIR="$(dirname "$SCRIPT_DIR")"

cd "$DOCKER_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Building Digital Book Backend${NC}"
echo "========================================"

# Build app (all services)
echo -e "${YELLOW}Building app (all services)...${NC}"
podman-compose build app
echo -e "${GREEN}✓ app built successfully${NC}"

# Build nginx
echo -e "${YELLOW}Building nginx...${NC}"
podman-compose build nginx
echo -e "${GREEN}✓ nginx built successfully${NC}"

echo ""
echo -e "${GREEN}All images built successfully!${NC}"
echo "Run 'podman-compose up -d' to start"
