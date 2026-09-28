# Laravel API. The same image runs as php-fpm ("api") and as the Reverb websocket server ("reverb").
# Three stages: base (PHP + extensions), test (dev dependencies, runs the test suite),
# production (the last stage, so the one `docker compose build` ships).
FROM php:8.4-fpm-alpine AS base

# The memory_limit line: 5 workers (pm.max_children) x 64M stays inside the api container's
# 384M limit, so one heavy request fails on its own instead of getting the whole container
# OOM-killed. It applies to php-fpm only; artisan and Reverb keep the CLI default.
RUN docker-php-ext-install pdo_mysql pcntl opcache \
 && cp "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini" \
 && echo "clear_env = no" >> /usr/local/etc/php-fpm.d/www.conf \
 && echo "php_admin_value[memory_limit] = 64M" >> /usr/local/etc/php-fpm.d/www.conf

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Dependencies first: the install layer stays cached until composer.json/lock change.
COPY composer.json composer.lock ./

# docker build --target test apps/api   runs the PHPUnit suite; the build fails if a test fails.
FROM base AS test
RUN composer install --no-scripts --no-autoloader --prefer-dist --no-interaction
COPY . .
# Laravel expects a .env file; the example's defaults are enough (phpunit.xml sets the rest).
RUN composer dump-autoload --optimize \
 && cp .env.example .env && php artisan key:generate --no-interaction \
 && php artisan test

FROM base AS production
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction
# Only what runs in production: no tests, no phpunit.xml.
COPY artisan ./
COPY app app
COPY bootstrap bootstrap
COPY config config
COPY database database
COPY docker docker
COPY public public
COPY resources resources
COPY routes routes
COPY storage storage
RUN composer dump-autoload --optimize --no-dev \
 && chown -R www-data:www-data storage bootstrap/cache

ENTRYPOINT ["docker/entrypoint.sh"]
EXPOSE 9000
CMD ["php-fpm"]
