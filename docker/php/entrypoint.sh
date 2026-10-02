#!/bin/sh
set -e

# Bootstrap Laravel if not yet installed
if [ ! -f /var/www/html/artisan ]; then
    echo "==> Installing Laravel via Composer..."
    composer create-project laravel/laravel:^11.0 /tmp/laravel --prefer-dist --no-interaction
    cp -a /tmp/laravel/. /var/www/html/
    rm -rf /tmp/laravel
    echo "==> Laravel installed."
fi

# Copy .env if missing
if [ ! -f /var/www/html/.env ]; then
    cp /var/www/html/.env.example /var/www/html/.env
    php /var/www/html/artisan key:generate
fi

# Set permissions
chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache 2>/dev/null || true

exec "$@"
