#!/bin/sh
set -e

# process ENV
# CONFIG_DIR
export CONFIG_DIR=/config
# BASE_HREF
sed -i "s|\$BASE_HREF|${BASE_HREF%/}/|g" /etc/nginx/nginx.conf
sed -i "s|href=\"/\"|href=\"${BASE_HREF%/}/\"|g" /var/www/html/index.html

cd /usr/src/app/output-api
# run pending migrations
npm run typeorm-js migration:run -- -d /usr/src/app/output-api/dist/output-api/src/config/app.data.source.js || echo "errors while migrating"
# start backend in background
su -s /bin/sh -c "node /usr/src/app/output-api/dist/output-api/src/main.js" nodeuser &
NODE_PID=$!

# Short sleep to detect immediate startup failures
sleep 5

# Check if Node died immediately
if ! kill -0 "$NODE_PID" 2>/dev/null; then
  echo "Node failed to start. Exiting container."
  exit 1
fi

echo "Node backend running (PID $NODE_PID). Starting nginx..."

nginx -g 'daemon off;' &
NGINX_PID=$!

echo "Waiting for Node or nginx to exit..."

term_handler() {
  echo "Termination received, stopping..."
  kill "$NODE_PID" "$NGINX_PID" 2>/dev/null || true
  exit 0
}

# Forward signals to both processes (important for docker stop)
trap term_handler TERM INT

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