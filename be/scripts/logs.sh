#!/usr/bin/env bash
# Digital Books — log helper (tạm thời, trước khi có Loki).
# Đọc file log JSON tại LOG_DIR cho dễ. Đặt tại: /root/chimseo/digital-book-be/logs.sh
set -uo pipefail

LOG_DIR="${LOG_DIR:-/root/chimseo/digital-book-be/logs}"

# Format mỗi dòng JSON thành 1 dòng gọn; dòng không phải JSON (vd header của tail -F) in nguyên.
fmt() {
  if command -v jq >/dev/null 2>&1; then
    jq -rR 'fromjson? // . | if type=="object"
      then "[\(.timestamp // "-")] \((.level // "-")|ascii_upcase) [\(.requestId // "-")] \(.service // "-")/\(.context // "-"): \(.message)"
      else . end'
  else
    cat
  fi
}

# File log mới nhất (theo ngày) của 1 service — loại trừ file *-error-*.
latest() { ls -t "$LOG_DIR/$1"-[0-9]*.log 2>/dev/null | head -1; }

# Danh sách file log "chính" (mọi level) — BỎ file *-error-* để khỏi trùng dòng,
# vì file chính đã chứa cả dòng error rồi.
mainfiles() { ls "$LOG_DIR"/*.log 2>/dev/null | grep -v -- '-error-'; }

usage() {
  cat <<USAGE
Digital Books — log helper

  logs.sh trace <requestId>      Gom log 1 request qua MỌI service (theo thời gian)
  logs.sh errors                 Theo dõi mọi LỖI (live, tất cả service)
  logs.sh tail <service>         Xem live 1 service (tự lấy file ngày mới nhất)
  logs.sh grep <pattern> [svc]   Tìm theo chuỗi, vd: grep " - 500 - "  |  grep "POST /chung-tu" voucher
  logs.sh services               Liệt kê các service đang có log

Service: gateway auth master-data voucher cash-book payable reporting config kho
USAGE
}

cmd="${1:-help}"
case "$cmd" in
  trace)
    rid="${2:-}"; [ -n "$rid" ] || { echo "Dùng: logs.sh trace <requestId>"; exit 1; }
    # shellcheck disable=SC2046
    grep -h "$rid" $(mainfiles) 2>/dev/null | fmt | sort
    ;;
  errors)
    files=$(ls "$LOG_DIR"/*-error-*.log 2>/dev/null)
    [ -n "$files" ] || { echo "Chưa có file error nào."; exit 0; }
    # shellcheck disable=SC2086
    tail -n +1 -F $files | fmt
    ;;
  tail)
    svc="${2:-}"; [ -n "$svc" ] || { echo "Dùng: logs.sh tail <service>"; exit 1; }
    f="$(latest "$svc")"
    [ -n "$f" ] || { echo "Không thấy log cho service: $svc"; exit 1; }
    echo "==> $f"
    tail -n 50 -F "$f" | fmt
    ;;
  grep)
    pat="${2:-}"; [ -n "$pat" ] || { echo "Dùng: logs.sh grep <pattern> [service]"; exit 1; }
    svc="${3:-}"
    if [ -n "$svc" ]; then
      grep -h "$pat" "$LOG_DIR/$svc"-[0-9]*.log 2>/dev/null | fmt | sort
    else
      # shellcheck disable=SC2046
      grep -h "$pat" $(mainfiles) 2>/dev/null | fmt | sort
    fi
    ;;
  services)
    ls "$LOG_DIR"/*.log 2>/dev/null | xargs -n1 basename 2>/dev/null \
      | sed -E 's/-[0-9]{4}-[0-9]{2}-[0-9]{2}\.log$//; s/-error$//' | sort -u
    ;;
  *) usage ;;
esac
