#!/bin/sh
# Every Vercel build pushes the Convex functions to the board's one deployment (CONVEX_DEPLOY_KEY) and seeds
# an empty board. The demo reset empties the deployment first (its deploy key can't), then points main at a
# fresh copy of this commit, so the production build re-seeds the board. Previews keep the data.
set -e
npx convex deploy --cmd "next build" --check-build-environment disable
npx convex run seed:run
