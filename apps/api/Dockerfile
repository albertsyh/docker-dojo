# Laravel API. The same image runs as php-fpm ("api") and as the Reverb websocket server ("reverb").
FROM php:8.4-fpm-alpine

RUN docker-php-ext-install pdo_mysql pcntl opcache \
 && cp "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini" \
 && echo "clear_env = no" >> /usr/local/etc/php-fpm.d/www.conf

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Dependencies first: this layer is cached until composer.json/lock change.
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction

COPY . .
RUN composer dump-autoload --optimize --no-dev \
 && chown -R www-data:www-data storage bootstrap/cache

ENTRYPOINT ["docker/entrypoint.sh"]
EXPOSE 9000
CMD ["php-fpm"]
