#!/bin/sh
# Vercel skips the build when this exits 0. The demo reset moves main back to the base commit before
# it merges the voting PR again; production must build only that merge, not the base in between.
[ "$VERCEL_ENV" = "production" ] && git log -1 --format=%s | grep -q '^Feedback board: suggest a feature'
