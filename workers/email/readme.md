You will have to create postmark app account to use this worker

https://postmarkapp.com/

You will also have to create a worker.toml file as I left it out as it has my credentials :]

Here are the details for the worker file

#:schema node_modules/wrangler/config-schema.json
name = "email"
main = "src/index.js"
compatibility_date = "2024-07-12"
compatibility_flags = ["nodejs_compat"]

# Variable bindings. These are arbitrary, plaintext strings (similar to environment variables)

# Docs:

# - https://developers.cloudflare.com/workers/wrangler/configuration/#environment-variables

# Note: Use secrets to store sensitive data.

# - https://developers.cloudflare.com/workers/configuration/secrets/

[vars]

[env.production]
vars = {SECRET_KEY = "", API_DB_URL = "https://test3.orbitlabsworker.workers.dev/",EMAIL_API = "https://api.postmarkapp.com/",EMAIL_TOKEN = "",EMAIL_FROM="HTMXFUN", EMAIL_API_URL="https://email.cryptoskillz.workers.dev", FORGOT_PASSWORD_EMAIL_TEMPLATE_ID="30458239", PRODUCT_NAME="HTMX Fun", SENDER_EMAIL_NAME="htmxfun",SIGNUP_EMAIL_TEMPLATE_ID="30429839"}

[env.local]
vars = {SECRET_KEY = "", API_DB_URL = "http://localhost:8787/",EMAIL_API = "https://api.postmarkapp.com/",EMAIL_TOKEN = "",EMAIL_FROM="HTMXFUN", EMAIL_API_URL="http://localhost:8789/", FORGOT_PASSWORD_EMAIL_TEMPLATE_ID="30458239", PRODUCT_NAME="HTMX Fun", SENDER_EMAIL_NAME="htmxfun",SIGNUP_EMAILT_EMPLATE_ID="30429839"}
