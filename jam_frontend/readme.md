# This a static generator.

It is basically a copy of all the core functions of eleventy. It is created specifically to suit my needs and is set up to deploy my sites as quickly as possible in a format that suits me. It may not be for you and that's ok.

The following has been directly stolen from eleventy

**front matter**
**layout**
**nunjucks support**

the \_data folder contains the env.thejs and api.js, see just like 11.ty
the \_site folder is where the statically generated site is built
the \_source folder contains all the NJK files to be copied across, there is also an assets folder it will copy it all across

## usage

node buildit.js
in \_site run a http server I use http-server https://www.npmjs.com/package/http-server

### parameters

delete = deletes the contents of the \_site folder
compress = compress the html. css and js
local = get the local vars from env.js
prod = get production vars from env.js

This will start the server

## usage

./build.sh
./build.sh delete
./build.sh compress
./build.sh delete compress

Note we could move the whole thing in a cloudflare pages and then the functions and workers would be in the same place but this is the most basic example
it would be easy to do a single page site using a simple router but i like jamstack
