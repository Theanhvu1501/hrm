#!/bin/bash

# Start script for Podman services
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCKER_DIR="$(dirname "$SCRIPT_DIR")"

cd "$DOCKER_DIR"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

MODE=${1:-"prod"}

case $MODE in
    "dev")
        echo -e "${YELLOW}Starting development environment (MongoDB only)...${NC}"
        podman-compose -f docker-compose.dev.yml up -d
        echo -e "${GREEN}MongoDB started at localhost:27017${NC}"
        echo -e "${GREEN}Mongo Express available at http://localhost:8081${NC}"
        echo ""
        echo "Run services locally with:"
        echo "  yarn start:gateway:dev"
        echo "  yarn start:auth:dev"
        echo "  etc."
        ;;
    "prod")
        echo -e "${YELLOW}Starting production environment...${NC}"
        podman-compose up -d
        echo -e "${GREEN}All services started!${NC}"
        echo -e "${GREEN}API available at http://localhost (via nginx)${NC}"
        ;;
    "debug")
        echo -e "${YELLOW}Starting with exposed ports...${NC}"
        podman-compose -f docker-compose.yml -f docker-compose.override.yml up -d
        echo -e "${GREEN}All services started with exposed ports!${NC}"
        ;;
    *)
        echo "Usage: $0 [dev|prod|debug]"
        echo "  dev   - Start only MongoDB for local development"
        echo "  prod  - Start all services (default)"
        echo "  debug - Start all services with exposed ports"
        exit 1
        ;;
esac
