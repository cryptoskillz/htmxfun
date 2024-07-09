cd workers/database
echo "Publishing database worker"
sudo npx wrangler deploy --env production
cd ..
cd jwt
echo "Publishing jwt worker"
sudo npx wrangler deploy --env production
cd ../..
git add .
git commit -m "deploy"
git push gitgub master