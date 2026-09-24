Start the bot locally for development testing. It needs a development `.env` in `apps/quad/` -- none exists in this checkout; if it is missing, say so and stop. Never point it at the production token in `/mnt/user/appdata/quad/.env`: that brings a second copy of the live bot online. Run this command:

```
cd ~/projects/quakeworld/apps/quad && node --env-file=.env --loader ts-node/esm src/index.ts
```

Watch the output for errors or confirmation that the bot connected to Discord. If it fails, diagnose and fix the issue.
