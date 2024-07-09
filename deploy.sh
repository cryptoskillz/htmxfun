cd workers/database
echo "Publishing database worker"
sudo npx wrangler deploy --env production
cd ..
cd jwt
echo "Publishing jwt worker"
sudo npx wrangler deploy --env production
cd ../..
echo "Pushing to github master"
git add .
git commit -m "deploy"
git push github master