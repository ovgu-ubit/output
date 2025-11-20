#!/bin/sh
set -e

cd /usr/src/app/output-api

node /usr/src/app/output-api/dist/output-api/src/init.js 

#faking migrations
npm run typeorm-js migration:run -- -d /usr/src/app/output-api/dist/output-api/src/config/app.data.source.js --fake

