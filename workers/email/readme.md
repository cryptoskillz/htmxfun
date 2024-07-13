You will have to create postmark app account to use this worker

https://postmarkapp.com/

You will also have to create a worker.toml file as I left it out as it has my credientials :]

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
EMAILAP = "https://api.postmarkapp.com/"
EMAILFROM = "<ACCOUNT_USERNAE>"
EMAILTOKEN = "<API_KEY>"
