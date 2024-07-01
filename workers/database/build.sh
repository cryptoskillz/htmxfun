#!/bin/bash

if [ "$1" == "dbl" ]; then
    echo "Building local database"
    npx wrangler d1 execute htmx --local --file=./schema.sql
fi

if [ "$1" == "dbr" ]; then
    # New block of code to run when 'db' parameter is passed
    echo "Building remote database"
    npx wrangler d1 execute htmx --local --file=./schema.sql
fi

# Existing code block
echo "Killing rogue wrangler"
kill -9 $(lsof -t -i:8787)
pkill esbuild

# Check if port 8787 is free before starting wrangler dev
if lsof -Pi :8787 -sTCP:LISTEN -t >/dev/null ; then
    echo "Port 8787 is still in use, cannot start wrangler dev"
    exit 1
else
    echo "Starting wrangler dev on port 8787"
    npx wrangler dev --port 8787
fi




