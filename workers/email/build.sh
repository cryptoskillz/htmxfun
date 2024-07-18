#!/bin/bash

kill_rogue_processes() {
    echo "Killing rogue wrangler"
    kill -9 $(lsof -t -i:8789) 2>/dev/null
    pkill esbuild 2>/dev/null
}



# Build remote database
if [ "$1" == "deploy" ]; then
    echo "deploying email worker"
    sudo npx wrangler deploy 
    exit 0
fi

# Start local environment
if [ "$1" == "prod" ]; then
    echo "Starting prouction environment"
    kill_rogue_processes
    if lsof -Pi :8789 -sTCP:LISTEN -t >/dev/null ; then
        echo "Port 8789 is still in use, cannot start wrangler dev"
        exit 1
    else
    echo "Starting wrangler dev on port 8789"
    npx wrangler dev --env production --port 8789
       
    fi
    exit 0
fi

# Start production environment
echo "Starting local environment"
kill_rogue_processes
if lsof -Pi :8789 -sTCP:LISTEN -t >/dev/null ; then
    echo "Port 8789 is still in use, cannot start wrangler dev"
    exit 1
else
    echo "Starting wrangler dev on port 8789"
    npx wrangler dev --env local --port 8789
fi