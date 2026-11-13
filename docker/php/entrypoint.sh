#!/bin/sh
set -e

# Keep dependencies in a named volume; install on the first startup.
if [ ! -f /var/www/html/vendor/autoload.php ]; then
    composer install --no-interaction --prefer-dist
fi

chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache 2>/dev/null || true
exec "$@"
