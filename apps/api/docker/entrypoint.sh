#!/bin/sh
# Shared by the "api" (php-fpm) and "reverb" containers: same image, two roles.
set -e

if [ -z "$APP_KEY" ]; then
  # The Dojo stores nothing encrypted, so a per-container key is harmless.
  APP_KEY="base64:$(head -c 32 /dev/urandom | base64)"
  export APP_KEY
  echo "entrypoint: APP_KEY not set, generated a random one for this container" >&2
fi

# Bake env vars into cached config (php-fpm workers don't see the container env by default).
php artisan config:cache
php artisan route:cache

if [ "$1" = "php-fpm" ] && [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  php artisan migrate --force
fi

exec "$@"
