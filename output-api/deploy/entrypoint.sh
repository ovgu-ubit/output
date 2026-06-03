#!/bin/sh
set -e

# process ENV
# CONFIG_DIR
export CONFIG_DIR=/config
# BASE_HREF
BASE_HREF_WITH_SLASH="${BASE_HREF%/}/"
BASE_HREF_WITHOUT_SLASH="${BASE_HREF_WITH_SLASH%/}"

if [ "$BASE_HREF_WITH_SLASH" = "/" ]; then
  sed -i "/__BASE_HREF_REDIRECT__/d" /etc/nginx/nginx.conf
else
  sed -i "s|__BASE_HREF_REDIRECT__|location = ${BASE_HREF_WITHOUT_SLASH} { absolute_redirect off; return 301 \$uri/\$is_args\$args; }|g" /etc/nginx/nginx.conf
fi

sed -i "s|__BASE_HREF__|${BASE_HREF_WITH_SLASH}|g" /etc/nginx/nginx.conf
sed -i "s|href=\"/\"|href=\"${BASE_HREF_WITH_SLASH}\"|g" /var/www/html/index.html

cd /usr/src/app/output-api
# run pending migrations
npm run typeorm-js migration:run -- -d /usr/src/app/output-api/dist/src/config/app.data.source.js || echo "errors while migrating"
# start backend in background
su -s /bin/sh -c "node /usr/src/app/output-api/dist/src/main.js" nodeuser &
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

nginx -g 'daemon off;' &
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
