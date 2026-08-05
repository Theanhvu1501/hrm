---
name: deploy
description: Use when deploying nhan-su (HRM) app to production server kt. Covers rsync code, rebuild Docker images, restart containers, and create MongoDB indexes.
---

# Deploy nhan-su lên server kế toán

## Server

- SSH config: `kt` (host `vpspla`, user `root`)
- Đường dẫn trên server: `/root/chimseo/nhan-su/`
- Docker network: `chimseo` (external, dùng chung với các app khác)

## Containers

| Container | Image | Port ngoài | Port trong |
|---|---|---|---|
| `nhan-su-be` | `nhan-su-be:latest` | 3030 | 3000 (gateway), 3001 (auth), 3007 (config) |
| `nhan-su-fe` | `nhan-su-fe:latest` | 8091 | 80 (nginx) |

## Quy trình deploy

### 1. Sync code (không đẩy node_modules, không ghi đè env)

```bash
rsync -az --delete \
  --exclude='node_modules' \
  --exclude='.superpowers' \
  --exclude='env/*.env' \
  --exclude='.env-cmdrc' \
  /Users/os_anhvt/Documents/Dino/hrm/be/ kt:/root/chimseo/nhan-su/be/

rsync -az --delete \
  --exclude='node_modules' \
  --exclude='.superpowers' \
  /Users/os_anhvt/Documents/Dino/hrm/fe/ kt:/root/chimseo/nhan-su/fe/

rsync -az /Users/os_anhvt/Documents/Dino/hrm/docker-compose.production.yml kt:/root/chimseo/nhan-su/
```

### 1b. Dọn build cache TRƯỚC khi build (bắt buộc từ 2026-08-05)

`build --no-cache` mỗi lần deploy để lại một lớp cache mới mà không xoá lớp cũ. Đợt P4.5
build hỏng giữa chừng vì `ENOSPC: no space left on device` — đĩa 50G đã dùng 86%, trong đó
**build cache chiếm 14.57GB và 0% đang dùng**.

```bash
ssh kt "df -h / && docker system df"
ssh kt "docker builder prune -af"
```

Lần đó giải phóng 19.58GB (86% → 45%). Build cache tái tạo được, xoá là an toàn — chỉ làm
lần build kế tiếp chậm hơn. **Đừng** `docker system prune` cả cụm: server chạy chung với
`ke-toan` và `giao-viec`.

### 2. Build + restart

```bash
ssh kt "cd /root/chimseo/nhan-su && \
  docker compose -f docker-compose.production.yml build --no-cache && \
  docker compose -f docker-compose.production.yml up -d"
```

### 3. Kiểm tra health

```bash
ssh kt "sleep 10 && docker ps --filter name=nhan-su --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"
```

BE phải hiện `(healthy)`. Nếu không, xem log:

```bash
ssh kt "docker logs nhan-su-be --tail 50"
```

### 4. Smoke test

```bash
ssh kt "docker exec nhan-su-be curl -s http://localhost:3000/api/config/ngay-le"
```

Kỳ vọng: `{"success":false,"error":{"code":"UNAUTHORIZED",...}}` (đúng — thiếu token).

## Rollback

```bash
ssh kt "cd /root/chimseo/nhan-su && \
  docker tag nhan-su-be:latest nhan-su-be:rollback-$(date +%Y%m%d) && \
  docker tag nhan-su-fe:latest nhan-su-fe:rollback-$(date +%Y%m%d)"
```

Chạy lệnh trên **trước** khi build để giữ bản cũ. Muốn quay lại:

```bash
ssh kt "docker tag nhan-su-be:rollback-YYYYMMDD nhan-su-be:latest && \
  docker tag nhan-su-fe:rollback-YYYYMMDD nhan-su-fe:latest && \
  cd /root/chimseo/nhan-su && docker compose -f docker-compose.production.yml up -d"
```

## Tạo chỉ mục MongoDB (chạy một lần khi thêm entity mới)

Tạo file script cục bộ rồi đẩy lên:

```bash
scp /path/to/create-indexes.js kt:/tmp/
ssh kt "docker cp /tmp/create-indexes.js nhan-su-be:/app/create-indexes.js && \
  docker exec -w /app nhan-su-be node create-indexes.js && \
  docker exec nhan-su-be rm /app/create-indexes.js"
```

Lưu ý: script phải `require("mongodb")` và chạy từ `/app` (nơi có `node_modules`).

## Env files trên server

Nằm ở `/root/chimseo/nhan-su/be/env/`:
- `db.env` — MongoDB connection
- `jwt.env` — JWT secret
- `services.env` — service URLs, identity URL

**Không** sync từ local — chỉ sửa trực tiếp trên server:

```bash
ssh kt "vi /root/chimseo/nhan-su/be/env/db.env"
```

## Kiến trúc Docker

- BE dùng `Dockerfile.all`: build 3 service NestJS, chạy bằng PM2 trong 1 container
- FE dùng `Dockerfile`: build Vite → nginx phục vụ static + proxy `/api/` sang `nhan-su-be:3000`
- `docker-compose.production.yml` ở gốc repo

## Lưu ý

- Sau khi rebuild BE, PM2 tự restart cả 3 service (gateway, auth-service, config-service)
- Nginx FE proxy `/api/` sang BE qua Docker network `chimseo`, không cần expose port BE ra ngoài (port 3030 chỉ để debug)
- `trust proxy = false` trong config-service — đối chiếu wifi hiện vô hiệu, chỉ GPS hoạt động
- Image dùng Node 20 (Dockerfile), khác với dev dùng Node 22 — nếu dùng API Node 22+ sẽ vỡ lúc build
