# Answer shape: Troubleshooting

When the user describes a symptom or problem and wants to fix it. The answer
is a diagnostic process, not a single cvar value.

Examples: "my lifts are jittery", "getting lag spikes on servers", "screen
flickers when I switch weapons", "fps drops on dm4"

## Retrieval strategy

### Step 1: Search Layer 2 directly

Troubleshooting questions use natural symptom language that often matches
how people describe problems in chat. Try `search_solved_issues` with the
user's own words first.

If the first query misses, extract the technical nouns (renderer, fps, lag,
jitter) and retry with those.

### Step 2: Identify diagnostic cvars from sessions

Read the returned session transcripts. Look for:
- Cvars mentioned as diagnostic steps (things helpers told the user to try)
- Cvars mentioned as the eventual fix
- Diagnostic commands (`cvar_reset_re`, `vid_restart`, `cfg_reset`)

### Step 3: Look up discovered cvars

For each cvar found in step 2, call `lookup_entity` or `search_entities`
to get the description and default value. The user needs to know what these
cvars do, not just that someone mentioned them.

### Step 4: Check for related sessions

If the first session references a follow-up ("will post an update"), search
for the same user or topic to find the continuation. Resolution often lives
in a later session, not the initial report.

## Answer format

Troubleshooting answers have a different shape than fact lookups. The user
has a problem they can't solve. Structure the answer as a diagnostic path:

1. **Acknowledge the symptom.** Mirror back what the user described so they
   know they were understood.

2. **Isolation step.** Start with the broadest diagnostic: does the problem
   persist with default config? This eliminates config vs engine as the cause.
   If the community sessions show an isolation step, use it.
   Example: "First, rule out your config: run `/cvar_reset_re .*` and
   `/cfg_reset`, then test again."

3. **Diagnostic branches.** Based on what the isolation step reveals, present
   2-3 things to try, ordered from most likely to least likely.
   Each branch should be:
   - One specific action ("set vid_renderer 0 and run vid_restart")
   - Why it might help ("switches to classic OpenGL, rules out the new renderer")
   - What to look for ("if the jitter stops, the issue is renderer-specific")

4. **Known resolution** (if the sessions contain one). If the community
   actually solved this problem, say so -- but qualify it as "this worked for
   the user in that session" not "this is the fix."

5. **Source citation.** Reference the session(s) used.

## What NOT to do

- Don't skip the diagnostic steps and jump straight to "try this cvar."
  Troubleshooting is a process, not a lookup.
- Don't present every cvar mentioned in a 178-message session. Extract the
  ones that were actually part of the diagnostic path.
- Don't claim a fix is universal when it solved one person's problem. Network
  conditions, hardware, drivers all vary.
- Don't invent diagnostic steps not found in the data. If the oracle doesn't
  have a diagnostic path for this symptom, say so honestly.
