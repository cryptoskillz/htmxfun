echo "Killing rogue wrangler"
kill -9 $(lsof -t -i:8787)
pkill esbuild

# Check if port 8788 is free before starting wrangler dev
if lsof -Pi :8787 -sTCP:LISTEN -t >/dev/null ; then
    echo "Port 8787 is still in use, cannot start wrangler dev"
    exit 1
else
    echo "Starting wrangler dev on port 8789"
    npx wrangler dev --port 8787
fi


