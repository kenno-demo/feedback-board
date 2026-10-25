#!/bin/sh
# Every Vercel build pushes the Convex functions to the board's one deployment (CONVEX_DEPLOY_KEY).
# A production build, of main, also restores the board to its seed data: the demo reset moves main
# back to this commit, and that build empties and re-seeds the board. Previews keep the data.
set -e
if [ "$VERCEL_ENV" = "production" ]; then
  # Empty the board before the push, so fields a demo PR added never fail the golden schema.
  # The very first build has no seed:clear yet.
  npx convex run seed:clear || echo "Nothing to clear yet."
fi
npx convex deploy --cmd "next build" --check-build-environment disable
npx convex run seed:run
