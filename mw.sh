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
    sudo npx wrangler deploy --env production
    cd ../..
    #this is dumb lets do this via PR
    #echo "Pushing to github master"
    #git add .
    #git commit -a -m "deploy"
    #git push github master
}

sync_databases() {
    #todo
    echo "Syncing databases"
}

start_workers() {
    jwt_dir="workers/jwt"
    database_dir="workers/database"
    email_dir="workers/email"

    # Start wrangler dev in each directory
    start_wrangler() {
        local dir=$1
        local port=$2
        echo "Starting wrangler dev in $dir on port $port"
        cd "$dir" || exit 1
        npx wrangler dev --env local --port "$port" &
        cd - > /dev/null || exit 1
    }

    # Start workers
    start_wrangler "$jwt_dir" 8789
    start_wrangler "$database_dir" 8790  # Example: different port for database
    start_wrangler "$email_dir" 8791    # Example: different port for email

    echo "All workers started."
}

# Main script logic based on command-line argument
if [ "$1" == "kill" ]; then
    kill_rogue_processes
elif [ "$1" == "sync" ]; then
    sync_databases
elif [ "$1" == "start" ]; then
    start_workers
elif [ "$1" == "deploy" ]; then
    deploy_workers
else
    echo "Usage: $0 [kill|sync|start|deploy]"
    exit 1
fi
echo "done"
exit 0