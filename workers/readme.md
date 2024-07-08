This worker handeles the database interactions

migrations

local

npx wrangler d1 execute htmx --local --file=../schema.sql

production

npx wrangler d1 execute htmx --remote --file=../schema.sql

run a query (test if migration worked)

local

npx wrangler d1 execute htmx --local --command="SELECT \* FROM projects"

remote

npx wrangler d1 execute htmx --remote --command="SELECT \* FROM projects"
