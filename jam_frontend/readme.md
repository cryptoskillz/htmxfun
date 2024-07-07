This a static generator.

It is bascically a copy of all the core functions of eleventy. It is created specifically to suit my needs and is set up to deploy my sites as quickly as possible in a format that suots me.
It may not be for you and that's ok.

The following has been directly stolen from eleventy

front matter
layout
nunjucks support

\_data

    env.js
    set the var to be used in NJK

    api.js
    not working yet and may never work as we may replace this with htmx

\_includes

    njk files to include

\_site

    this where the statically genrated site is built

\_source

    this folder contains all the NJK files to be copied across
    in this folder if there is an asssets folder it will copy it all across

usage

node buildit.js
in \_site run a http server I use http-server https://www.npmjs.com/package/http-server

parammaters

delete = deletes the contents of the \_site folder
compress = compress the html. css and js
local = get the local vars from env.js
prod = get production vars from env.js

usage

./build.sh
./build.sh delete
./build.sh compress
./build.sh delete compress
This will start the server

Note we could move the whole thing in a cloudflare pages and then the functions and workers would be in the same place but this is the most basic example
it would be easy to do a single page site using a simple router but i like jamnstack
