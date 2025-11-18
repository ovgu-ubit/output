#!/bin/sh
set -e

cd /usr/src/app/output-api
# run pending migrations
npm run typeorm-js:dev migration:run -- -d /usr/src/app/output-api/dist/output-api/src/config/app.data.source.js || echo "errors while migrating"
# start backend in background
su -s /bin/sh -c "node /usr/src/app/output-api/dist/output-api/src/main.js" nodeuser &

# start nginx in foreground
nginx -g 'daemon off;'