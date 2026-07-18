#!/bin/bash

# Stop script for Podman services
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCKER_DIR="$(dirname "$SCRIPT_DIR")"

cd "$DOCKER_DIR"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

MODE=${1:-"all"}

case $MODE in
    "dev")
        echo -e "${YELLOW}Stopping development environment...${NC}"
        podman-compose -f docker-compose.dev.yml down
        ;;
    "all")
        echo -e "${YELLOW}Stopping all services...${NC}"
        podman-compose down
        podman-compose -f docker-compose.dev.yml down 2>/dev/null || true
        ;;
    "clean")
        echo -e "${YELLOW}Stopping and removing volumes...${NC}"
        podman-compose down -v
        podman-compose -f docker-compose.dev.yml down -v 2>/dev/null || true
        ;;
    *)
        echo "Usage: $0 [dev|all|clean]"
        echo "  dev   - Stop development environment"
        echo "  all   - Stop all services (default)"
        echo "  clean - Stop and remove volumes"
        exit 1
        ;;
esac

echo -e "${GREEN}Services stopped!${NC}"
