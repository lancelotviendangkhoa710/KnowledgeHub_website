FROM php:8.3-cli

WORKDIR /var/www/html

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        git \
        unzip \
        libpq-dev \
        libzip-dev \
        libonig-dev \
    && docker-php-ext-install -j"$(nproc)" \
        bcmath \
        mbstring \
        opcache \
        pdo_pgsql \
        zip \
    && rm -rf /var/lib/apt/lists/*

# PHP's built-in server is single-process unless PHP_CLI_SERVER_WORKERS is set.
# The API previously handled one request at a time, serialising the whole app.
ENV PHP_CLI_SERVER_WORKERS=4

# OPcache matters for the CLI server SAPI too (enable_cli), otherwise every
# request recompiles the framework. The image is immutable, so timestamp
# validation can stay off.
RUN { \
        echo 'opcache.enable=1'; \
        echo 'opcache.enable_cli=1'; \
        echo 'opcache.validate_timestamps=0'; \
        echo 'opcache.memory_consumption=128'; \
        echo 'opcache.max_accelerated_files=20000'; \
    } > /usr/local/etc/php/conf.d/opcache.ini

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

COPY composer.json composer.lock ./
RUN composer install \
    --no-dev \
    --no-interaction \
    --no-progress \
    --prefer-dist \
    --no-scripts \
    --optimize-autoloader

COPY . .

RUN composer dump-autoload --optimize

RUN mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views \
    && chmod -R ug+rwx storage bootstrap/cache

EXPOSE 10000

CMD sh -c 'php artisan config:cache && php artisan route:cache && php artisan serve --no-reload --host=0.0.0.0 --port="${PORT:-10000}"'
