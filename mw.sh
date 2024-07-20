#!/bin/bash
#this is a script for starting, stopping, syncing, and deploying the workers
kill_rogue_processes() {
    echo "Killing database worker"
    kill -9 $(lsof -t -i:8787) 2>/dev/null
    echo "Killing jwt worker"
    kill -9 $(lsof -t -i:8788) 2>/dev/null
    echo "Killing email worker"
    kill -9 $(lsof -t -i:8789) 2>/dev/null
}

deploy_workers() {
    echo "Deploying workers"
    cd workers/database
    echo "Publishing database worker"
    sudo npx wrangler deploy --env production
    cd ..
    cd jwt
    echo "Publishing jwt worker"
    sudo npx wrangler deploy --env production
    cd ..
    cd email
    echo "Publishing email worker"
    sudo npx wrangler deploy 
    cd ../..
}

deploy_database() {
  
    echo "deploying $db database to database worker"
    cd workers/database/
    # Build local database
    if [ "$2" == "dbl" ]; then
        echo "Building local database for database worker"
        sudo npx wrangler d1 execute htmx --local --file=../schema.sql
        echo "Building local database database for jwt worker"
        cd ../
        cd jwt/
        sudo npx wrangler d1 execute htmx --local --file=../schema.sql
        exit 0
    fi

    # Build remote database
    if [ "$2" == "dbr" ]; then
        echo "Building remote database"
        sudo npx wrangler d1 execute htmx --remote --file=../schema.sql
        exit 0
    fi

}

sync_databases() {
    echo "Syncing databases"
    cp -R workers/jwt/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/ workers/database/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/

}



# Start wrangler dev 
start_wrangler() {
    local dir=$1
    local port=$2
    echo "Starting wrangler dev in $dir on port $port"
    cd "$dir" || exit 1
    npx wrangler dev --env local --port "$port" &
    cd - > /dev/null || exit 1
}


# Main script logic based on command-line argument
if [ "$1" == "kill" ]; then
    kill_rogue_processes
elif [ "$1" == "sync" ]; then
    sync_databases
elif [ "$1" == "start" ]; then
    # Start workers
    start_wrangler "workers/jwt" 8787
    start_wrangler "workers/database" 8788  # Example: different port for database
    start_wrangler "workers/email" 8789    # Example: different port for email
elif [ "$1" == "database" ]; then
    # Start workers
    deploy_database "workers/jwt" $2
   
elif [ "$1" == "deploy" ]; then
    deploy_workers
else
    echo "Usage: $0 [kill|sync|start|deploy|database dbl/dbr]"
    exit 1
fi
echo "done"
exit 0