This is a project that i wrote to learn htmx.

# FRONTEND

# jam_frontend

This is a basic admin I code it also has a a nice static builder script called buildit.js

build a local instance

./build.sh

build a remote instance

./build.sh prod

# spa_frontend

this is a single page application, I have not finished this yet i like JAM so maybe I never will

# WORKERS

## workers/jwt

this is the jwt worker, it handles auth

./build.sh

build a remote instance

./build.sh prod

## workers/database

this is the database worker, it handles the database interaction

./build.sh

build a remote instance

./build.sh prod

## workers/database

# SCRIPTS

## mw.sh

this is a script for starting, stopping, syncing, and deploying the workers

Usage: ./mw.sh [kill|sync|start|deploy]

### kill

this will kill all workers

### sync

this will copy the database from jwt to the database worker

### database [dbl/dvr]

deploy the database to local or production

### start

this will start all the workers. Not you can start then separately by using the build.sh script in each directory

### deploy

this will deploy all the workers to cloudflare

you may have to chmod the .sh file I.E
chmod +x mw.sh
