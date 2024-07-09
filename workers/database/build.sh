#!/bin/bash

kill_rogue_processes() {
    echo "Killing rogue wrangler"
    kill -9 $(lsof -t -i:8787) 2>/dev/null
    pkill esbuild 2>/dev/null
}

# Build local database
if [ "$1" == "dbl" ]; then
    echo "Building local database"
    npx wrangler d1 execute htmx --local --file=./schema.sql
    exit 0
fi

# Build remote database
if [ "$1" == "dbr" ]; then
    echo "Building remote database"
    npx wrangler d1 execute htmx --file=./schema.sql
    exit 0
fi

# Start local environment
if [ "$1" == "prod" ]; then
    echo "Starting prouction environment"
    kill_rogue_processes
    if lsof -Pi :8787 -sTCP:LISTEN -t >/dev/null ; then
        echo "Port 8787 is still in use, cannot start wrangler dev"
        exit 1
    else
    echo "Starting wrangler dev on port 8787"
    npx wrangler dev --env production --port 8787
       
    fi
    exit 0
fi

# Start production environment
echo "Starting local environment"
kill_rogue_processes
if lsof -Pi :8787 -sTCP:LISTEN -t >/dev/null ; then
    echo "Port 8787 is still in use, cannot start wrangler dev"
    exit 1
else
    echo "Starting wrangler dev on port 8787"
    npx wrangler dev --env local --port 8787
fi




