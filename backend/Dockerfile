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
        pdo_pgsql \
        zip \
    && rm -rf /var/lib/apt/lists/*

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

CMD sh -c 'php artisan config:cache && php artisan route:cache && php artisan serve --host=0.0.0.0 --port="${PORT:-10000}"'
