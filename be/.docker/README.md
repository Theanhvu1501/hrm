# Podman Configuration

## Structure

```
.docker/
├── dockerfiles/
│   ├── Dockerfile.base      # Base image with common dependencies
│   ├── Dockerfile.builder   # Builder stage for compiling TypeScript
│   ├── Dockerfile.runner    # Runner stage with PM2
│   └── Dockerfile.service   # Combined multi-stage Dockerfile
├── nginx/
│   ├── Dockerfile           # Nginx sidecar proxy
│   └── nginx.conf           # Nginx configuration
├── pm2/
│   └── ecosystem.config.js  # PM2 process configuration
├── env/
│   ├── db.env               # Database configuration
│   ├── jwt.env              # JWT configuration
│   ├── services.env         # Service discovery
│   ├── gateway.env          # Gateway service
│   ├── auth.env             # Auth service
│   ├── master-data.env      # Master Data service
│   ├── voucher.env          # Voucher service
│   ├── cash-book.env        # Cash Book service
│   ├── payable.env          # Payable service
│   ├── reporting.env        # Reporting service
│   └── config.env           # Config service
├── scripts/
│   ├── build.sh             # Build all images
│   ├── start.sh             # Start services
│   └── stop.sh              # Stop services
├── docker-compose.yml       # Production compose
├── docker-compose.dev.yml   # Development (MongoDB only)
└── docker-compose.override.yml  # Debug with exposed ports
```

## Prerequisites

```bash
# Install podman and podman-compose
brew install podman podman-compose

# Initialize podman machine (macOS)
podman machine init
podman machine start
```

## Quick Start

### Development (MongoDB only)

```bash
cd be/.docker
./scripts/start.sh dev

# Then run services locally
cd ..
yarn start:gateway:dev
yarn start:auth:dev
# etc.
```

### Production

```bash
cd be/.docker
./scripts/build.sh
./scripts/start.sh prod
```

### Debug (with exposed ports)

```bash
cd be/.docker
./scripts/start.sh debug
```

## Manual Commands

```bash
# Build all services
podman-compose build

# Build specific service
podman-compose build auth-service

# Start all services
podman-compose up -d

# View logs
podman-compose logs -f gateway

# Stop all services
podman-compose down

# Stop and remove volumes
podman-compose down -v

# List running containers
podman ps

# List images
podman images
```

## Environment Files

Environment files are organized by function (similar to `.env-cmdrc`):

| File | Purpose |
|------|---------|
| `db.env` | MongoDB connection |
| `jwt.env` | JWT secret and expiration |
| `services.env` | Service discovery URLs |
| `{service}.env` | Service-specific config |

## Ports

| Service | Internal Port | External Port (debug) |
|---------|--------------|----------------------|
| Nginx | 80 | 80 |
| Gateway | 3000 | 3000 |
| Auth | 3001 | 3001 |
| Master Data | 3002 | 3002 |
| Voucher | 3003 | 3003 |
| Cash Book | 3004 | 3004 |
| Payable | 3005 | 3005 |
| Reporting | 3006 | 3006 |
| Config | 3007 | 3007 |
| MongoDB | 27017 | 27017 |

## Architecture

```
                    ┌─────────────┐
                    │   Client    │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │    Nginx    │ :80
                    │   (Proxy)   │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │   Gateway   │ :3000
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────▼────┐       ┌─────▼─────┐      ┌─────▼─────┐
   │  Auth   │       │  Master   │      │  Voucher  │
   │ :3001   │       │   Data    │      │  :3003    │
   └─────────┘       │  :3002    │      └───────────┘
                     └───────────┘
        │                  │                  │
   ┌────▼────┐       ┌─────▼─────┐      ┌─────▼─────┐
   │  Cash   │       │  Payable  │      │ Reporting │
   │  Book   │       │  :3005    │      │  :3006    │
   │ :3004   │       └───────────┘      └───────────┘
   └─────────┘
        │
   ┌────▼────┐       ┌───────────┐
   │ Config  │       │  MongoDB  │
   │ :3007   │       │  :27017   │
   └─────────┘       └───────────┘
```
