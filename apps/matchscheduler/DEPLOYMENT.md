# MatchScheduler -- Deployment Reference

## Infrastructure

| Property | Value |
|----------|-------|
| Firebase project | `matchscheduler-dev` |
| Hosting URL | https://matchscheduler-dev.web.app |
| Functions region (v1) | `europe-west3` (Frankfurt) |
| Functions region (v2 storage) | `europe-west10` |
| Firestore | Default database |
| Auth providers | Google, Discord OAuth |

## Prerequisites

- Firebase CLI installed and authenticated (`firebase login`)
- Node.js (for CSS build)
- Access to the `matchscheduler-dev` Firebase project
- **No local secrets are needed for a functions deploy.** The Discord client secret lives in
  Firebase Secret Manager as `DISCORD_CLIENT_SECRET` and is bound to `discordOAuthExchange`
  via `runWith({ secrets })` in `functions/discord-auth.js`; the CLI refuses to deploy if the
  secret is missing rather than deploying without it. The public client ID is a constant in
  the same file (`.env` / `.env.emulator` override it for local dev). Rotate the secret with
  `firebase functions:secrets:set DISCORD_CLIENT_SECRET --data-file -` fed from a file placed by
  `secret-drop`, then deploy functions. Set up 2026-09-11 after a `.env`-only secret was found
  to vanish on any deploy from a checkout without the file.

## Deploy Workflow

### 1. Assess changes

Categorize modified files into deploy targets:
- **hosting**: Changes in `public/`, `src/css/`, or any frontend file
- **functions**: Changes in `functions/`
- **rules**: Changes in `firestore.rules` or `storage.rules`

### 2. Build

Always run before deploying hosting:
```bash
npm run version    # Stamp build version
npm run css:build  # Compile Tailwind: src/css/input.css -> public/css/main.css
```

### 3. Deploy

```bash
firebase deploy --only hosting              # Frontend only
firebase deploy --only functions            # All functions (v1 shared container -- fast!)
firebase deploy --only firestore:rules      # Security rules
firebase deploy --only hosting,functions    # Both
firebase deploy                             # Everything
```

Alternative: `./scripts/deploy-functions.sh` (same as `firebase deploy --only functions` with logging)

### 4. Verify

Open https://matchscheduler-dev.web.app and confirm the change is live.

## Operational Commands

| Action | Command |
|--------|---------|
| Deploy hosting | `firebase deploy --only hosting` |
| Deploy functions | `firebase deploy --only functions` |
| Deploy rules | `firebase deploy --only firestore:rules` |
| Deploy everything | `firebase deploy` |
| View function logs | `firebase functions:log` |
| Check emulator (dev) | http://localhost:8080 (Firestore), http://localhost:5001 (Functions) |

## Architecture Notes

### Function regions
- **v1 functions (46 as of 2026-09-11: callables, scheduled jobs, two plain HTTPS endpoints)**: All share a single Cloud Functions container in `europe-west3`. This means `firebase deploy --only functions` deploys them all at once and is fast; unchanged functions are skipped.
- **v2 storage triggers (2)**: `processLogoUpload` and `processAvatarUpload` run as separate Cloud Run services in `europe-west10` (must match storage bucket region).

### Adding a new Cloud Function

Use the v1 pattern (NOT v2):
```javascript
const functions = require('firebase-functions');

exports.myNewFunction = functions
    .region('europe-west3')
    .https.onCall(async (data, context) => {
        // data = parameters, context.auth = user auth
    });
```
1. Export it in `functions/index.js`
2. Deploy with `firebase deploy --only functions`

### Frontend region config

The frontend must specify the same region when calling functions:
```javascript
getFunctions(app, 'europe-west3')  // in public/index.html
```

### CSS build pipeline

```
Source (EDIT THIS):    src/css/input.css
                              ↓  (npm run css:build)
Output (NEVER EDIT):   public/css/main.css
```

Tailwind watcher rebuilds automatically during dev. Always run `npm run css:build` before deploying hosting.

## Troubleshooting

### Functions deploy fails
- Check `firebase functions:log` for errors
- Ensure all functions use `europe-west3` region (v1) or `europe-west10` (v2 storage only)

### Retired scheduled functions
`scheduledBig4Sync` (15-minute Big4 poll) was deleted from the project on 2026-09-11 and its
export removed from `functions/index.js`: The Big 4 closed after Season 2 and its API 404s.
Re-exporting it and deploying functions recreates the schedule.

### Orphaned Cloud Run services
After the v1 migration, old per-function Cloud Run services may exist:
```bash
gcloud run services list --region=europe-west3
gcloud run services delete <functionName> --region=europe-west3
# Keep: processLogoUpload, processAvatarUpload (these are v2)
```

### CSS changes not appearing
- Verify you ran `npm run css:build` before deploying
- Check that you edited `src/css/input.css`, not `public/css/main.css`
