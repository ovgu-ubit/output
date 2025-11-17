#!/bin/sh
set -e

cd /usr/src/app/output-api
# start backend in background
su -s /bin/sh -c "node /usr/src/app/output-api/dist/output-api/src/main.js" nodeuser &

# start nginx in foreground
nginx -g 'daemon off;'