#!/bin/sh
set -e

export CONFIG_DIR=/config

RUNTIME_DIR=/tmp/output-runtime
RUNTIME_WWW_DIR="${RUNTIME_DIR}/www"
RUNTIME_LOG_DIR="${RUNTIME_DIR}/log"
RUNTIME_TEMP_DIR="${RUNTIME_DIR}/nginx-temp"
RUNTIME_NGINX_CONF="${RUNTIME_DIR}/nginx.conf"

BASE_HREF="${BASE_HREF:-/}"
case "$BASE_HREF" in
  /*) ;;
  *) BASE_HREF="/${BASE_HREF}" ;;
esac

BASE_HREF_WITH_SLASH="${BASE_HREF%/}/"
BASE_HREF_WITHOUT_SLASH="${BASE_HREF_WITH_SLASH%/}"

if ! printf '%s\n' "$BASE_HREF_WITH_SLASH" | grep -Eq '^(/[A-Za-z0-9._~-]+)*/$'; then
  echo "Invalid BASE_HREF '${BASE_HREF}'. Use an absolute path like '/', '/demo', or '/demo/app'."
  exit 1
fi

rm -rf "$RUNTIME_WWW_DIR" "$RUNTIME_LOG_DIR" "$RUNTIME_TEMP_DIR" "$RUNTIME_NGINX_CONF"
mkdir -p \
  "$RUNTIME_WWW_DIR" \
  "$RUNTIME_LOG_DIR" \
  "$RUNTIME_TEMP_DIR/client-body" \
  "$RUNTIME_TEMP_DIR/proxy" \
  "$RUNTIME_TEMP_DIR/fastcgi" \
  "$RUNTIME_TEMP_DIR/uwsgi" \
  "$RUNTIME_TEMP_DIR/scgi"

cp -R /var/www/html/. "$RUNTIME_WWW_DIR/"

if [ "$BASE_HREF_WITH_SLASH" = "/" ]; then
  BASE_HREF_REDIRECT=""
else
  BASE_HREF_REDIRECT="location = ${BASE_HREF_WITHOUT_SLASH} { absolute_redirect off; return 301 \$uri/\$is_args\$args; }"
fi

sed \
  -e "s|__BASE_HREF_REDIRECT__|${BASE_HREF_REDIRECT}|g" \
  -e "s|__BASE_HREF__|${BASE_HREF_WITH_SLASH}|g" \
  /etc/nginx/nginx.conf > "$RUNTIME_NGINX_CONF"

sed "s|href=\"/\"|href=\"${BASE_HREF_WITH_SLASH}\"|g" \
  "$RUNTIME_WWW_DIR/index.html" > "$RUNTIME_WWW_DIR/index.html.tmp"
mv "$RUNTIME_WWW_DIR/index.html.tmp" "$RUNTIME_WWW_DIR/index.html"

cd /usr/src/app/output-api
# run pending migrations
npm run typeorm-js migration:run -- -d /usr/src/app/output-api/dist/src/config/app.data.source.js || echo "errors while migrating"
# start backend in background
node /usr/src/app/output-api/dist/src/main.js &
NODE_PID=$!
NGINX_PID=

term_handler() {
  echo "Termination received, stopping..."
  kill "$NODE_PID" ${NGINX_PID:+"$NGINX_PID"} 2>/dev/null || true
  exit 0
}

# Forward signals to child processes, including while waiting for backend readiness.
trap term_handler TERM INT

echo "Waiting for Node backend readiness (PID $NODE_PID)..."

until wget -qO- --timeout=2 http://127.0.0.1:3000/config/health >/dev/null 2>&1; do
  if ! kill -0 "$NODE_PID" 2>/dev/null; then
    echo "Node failed to start. Exiting container."
    exit 1
  fi
  sleep 2
done

echo "Node backend ready (PID $NODE_PID). Starting nginx..."

nginx -c "$RUNTIME_NGINX_CONF" -g 'daemon off;' &
NGINX_PID=$!

echo "Waiting for Node or nginx to exit..."

# Wait for either node or nginx to exit
while true; do
  if ! kill -0 "$NODE_PID" 2>/dev/null; then
    echo "Node exited!"
    break
  fi
  if ! kill -0 "$NGINX_PID" 2>/dev/null; then
    echo "nginx exited!"
    break
  fi
  sleep 1
done

echo "One of the services exited. Stopping container..."
kill $NODE_PID $NGINX_PID 2>/dev/null || true
exit 1
