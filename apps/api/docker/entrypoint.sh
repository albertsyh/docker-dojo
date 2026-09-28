#!/bin/sh
# Shared by the "api" (php-fpm) and "reverb" containers: same image, two roles.
set -e

if [ -z "$APP_KEY" ]; then
  # Quiz papers are signed with APP_KEY, so a new key on every start would invalidate
  # every open paper. Generate it once into the shared app-key volume and reuse it.
  # Production sets APP_KEY in .env instead (compose.prod.yaml requires it).
  KEY_DIR=/var/lib/dojo
  KEY_FILE=$KEY_DIR/app-key
  if [ -d "$KEY_DIR" ]; then
    if [ ! -s "$KEY_FILE" ]; then
      # Write to a temp file, then hard-link it into place: ln fails if the key already
      # exists, so when api and reverb race, the first one wins and both read the same key.
      TMP=$(mktemp "$KEY_DIR/.app-key.XXXXXX")
      echo "base64:$(head -c 32 /dev/urandom | base64)" > "$TMP"
      chmod 600 "$TMP"
      ln "$TMP" "$KEY_FILE" 2>/dev/null || true
      rm -f "$TMP"
      echo "entrypoint: APP_KEY not set, generated one in $KEY_FILE" >&2
    fi
    APP_KEY=$(cat "$KEY_FILE")
  else
    APP_KEY="base64:$(head -c 32 /dev/urandom | base64)"
    echo "entrypoint: APP_KEY not set and $KEY_DIR is not mounted, using a random key for this container only" >&2
  fi
  export APP_KEY
fi

# Bake env vars into cached config (php-fpm workers don't see the container env by default).
php artisan config:cache
php artisan route:cache

if [ "$1" = "php-fpm" ] && [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  php artisan migrate --force
fi

exec "$@"
