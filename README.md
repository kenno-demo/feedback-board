# Feedback board

Suggest features and vote on them. No sign-in.

This is the product in [kenno](https://kenno.ai)'s demo. Its team plans the next features in kenno, Claude Code builds them, and the plan keeps who decided what and why. The repo is reset before each demo, so `main` and its pull requests come and go.

## Run it

```sh
pnpm install
pnpm dev   # starts Convex and Next.js, seeds the board on first run
```

`pnpm typecheck`, `pnpm lint` and `pnpm test` are the checks CI runs on every pull request.

Built with Next.js and Convex.
