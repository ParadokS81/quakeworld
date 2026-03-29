---
name: deploy
description: Deploy MatchScheduler to production. Determines what needs deploying based on recent changes, commits if needed, builds CSS, and deploys the right targets.
argument-hint: (optional: hosting, functions, rules, all)
disable-model-invocation: true
---

# Deploy MatchScheduler

Deploy changes to Firebase production. Smart enough to figure out what needs deploying.

## Step 1: Assess What Changed

Check what files have been modified since the last deploy/commit:

```bash
git status
git diff --name-only HEAD
```

Categorize changes into deploy targets:
- **hosting**: Changes in `public/`, `src/css/`, or any frontend file
- **functions**: Changes in `functions/`
- **rules**: Changes in `firestore.rules` or `storage.rules`

## Step 2: Handle Uncommitted Changes

If there are uncommitted changes:
1. Stage all changes: `git add -A`
2. Create a conventional commit (follow qgit format)
3. Push to remote

**Do NOT ask the user** — they already said "deploy", which implies commit+push+deploy.

## Step 3: Build

Always run the CSS build before deploying hosting:

```bash
cd /home/paradoks/projects/quake/MatchScheduler
npm run version
npm run css:build
```

## Step 4: Deploy

### If $ARGUMENTS provided
Deploy exactly what was requested:
- `hosting` → `firebase deploy --only hosting`
- `functions` → `firebase deploy --only functions`
- `rules` → `firebase deploy --only firestore:rules`
- `all` → `firebase deploy`

### If no arguments
Auto-detect from changed files (Step 1) and deploy only what's needed.

If both hosting and functions changed: `firebase deploy --only hosting,functions`

### Deploy Commands
```bash
# Always from project root
cd /home/paradoks/projects/quake/MatchScheduler

# Target-specific
firebase deploy --only hosting
firebase deploy --only functions
firebase deploy --only firestore:rules
firebase deploy --only hosting,functions
firebase deploy --only hosting,firestore:rules

# Everything
firebase deploy
```

## Step 5: Verify

After deploy completes, report:
```
Deployed to production:
- Hosting: yes/no
- Functions: yes/no
- Rules: yes/no
Commit: <hash> <message>
URL: https://matchscheduler.web.app
```

## Important Notes

- Functions use region `europe-west3` (v1) and `europe-west10` (v2 storage triggers)
- The version script stamps the build — always run it before hosting deploys
- If deploy fails, check `firebase functions:log` for function errors
