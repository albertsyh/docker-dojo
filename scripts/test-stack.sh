#!/bin/sh
# Builds and starts a throwaway copy of the whole stack (its own project, port and
# database volume), runs tests/stack.test.ts against it, then removes it again.
# Your normal `docker compose up` stack and its data are not touched.
set -eu
cd "$(dirname "$0")/.."

PROJECT=docker-dojo-test
PORT=${TEST_PORT:-8099}

cleanup() { APP_PORT=$PORT docker compose -p "$PROJECT" down -v --remove-orphans >/dev/null 2>&1 || true; }
trap cleanup EXIT

APP_PORT=$PORT docker compose -p "$PROJECT" up -d --build --wait
BASE_URL="http://localhost:$PORT" COMPOSE_PROJECT=$PROJECT bun test tests/
