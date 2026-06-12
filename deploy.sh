#!/usr/bin/env sh
set -eu

MODE="${1:-prod}"

if [ "$MODE" = "dev" ]; then
  docker compose -f docker-compose.yml up -d --build
  exit 0
fi

docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
