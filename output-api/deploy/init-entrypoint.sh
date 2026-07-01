#!/bin/sh
set -e

# process ENV
# CONFIG_DIR
export CONFIG_DIR=/config

cd /usr/src/app/output-api

node /usr/src/app/output-api/dist/src/init.js 
